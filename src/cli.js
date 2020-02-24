#!/usr/bin/env node

/* eslint-disable no-await-in-loop */

/**
 * CLI for using the $cql operaiton of a cqf-ruler instance
 * to output calculation results for FHIR patients
 */

const axios = require('axios');
const fs = require('fs');
const { parse } = require('json2csv');
const path = require('path');
const program = require('commander');
const moment = require('moment');
const _ = require('lodash');
const errors = require('./utils/errors');
const { logger } = require('./utils/logger');
const { calculate } = require('./utils/calculation');

program
  .version('2.0.0', '-v --version', 'Print the current version')
  .option('-d --directory <input-directory>', 'Path to directory of Synthea Bundles')
  .option('-c --cql <cql-file>', 'Path to cql file to be used for calculation')
  .option('-m --measure-id <measure-id>', 'Measure ID to evaluate')
  .option('-u --url <url>', 'Base URL of running cqf-ruler instance', 'http://localhost:8080/cqf-ruler-r4/fhir')
  .option('-s --period-start <yyyy-mm-dd>', 'Start of the calculation period', '2019-01-01')
  .option('-e --period-end <yyyy-mm-dd>', 'End of the calculation period', '2019-12-31')
  .usage('-d /path/to/bundles -c /path/to/cql/file -u http://<cqf-ruler-base-url> [-s yyyy-mm-dd -e yyyy-mm-dd -m <measure-id>]')
  .parse(process.argv);

// Enforce required parameters
if (!program.directory || !program.url || !program.cql) {
  logger.error('-d/--directory, -u/--url, and -c/--cql are required');
  program.help();
}

// We expect the directory containing the bundles to already exist
if (!fs.existsSync(program.directory)) {
  logger.error(`Cannot find directory ${program.directory}\n`);
  program.help();
}

// Create output directory if it doesn't exist
const outputRoot = './output';
if (!fs.existsSync(outputRoot)) {
  logger.debug('Creating output directory');
  fs.mkdirSync(outputRoot);
}

// Output for this run is timestamped with the current datetime
const outputPath = path.join(outputRoot, `/results-${moment().format('YYYY-MM-DD-THHmmss')}`);
const ipopPath = path.join(outputPath, '/ipop');
const numerPath = path.join(outputPath, '/numerator');
const denomPath = path.join(outputPath, '/denominator');

// Create subdirectories for timestamped results and sorted populations
logger.debug('Creating population directories');
fs.mkdirSync(outputPath);
fs.mkdirSync(ipopPath);
fs.mkdirSync(numerPath);
fs.mkdirSync(denomPath);

const outputFile = `${outputPath}/results.csv`;

// Read in bundles and cql
logger.debug('Reading bundles');
const bundleFiles = fs.readdirSync(program.directory).filter((f) => path.extname(f) === '.json');

if (_.isEmpty(bundleFiles)) {
  logger.error(`No bundles found in ${program.directory}`);
  process.exit(1);
}

logger.debug('Reading CQL file');
const cql = fs.readFileSync(program.cql, 'utf8');
const results = [];
const resultCounts = {
  ipop: 0,
  numerator: 0,
  denominator: 0,
  none: 0,
  total: 0,
};

const client = axios.create({ baseURL: program.url });

const processBundles = async (files) => {
  // Notes: Need to use for ... of ... to allow loop to halt until we get a response from the server
  // eslint-disable-next-line no-restricted-syntax
  for (const file of files) {
    const bundlePath = path.join(path.resolve(program.directory), file);
    const bundleId = path.basename(bundlePath, '.json');

    logger.debug(`Parsing patient bundle ${bundleId}`);
    const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));

    // POST bundle to the server
    let postBundleResponse;
    try {
      logger.info(`Posting bundle ${bundleId}`);
      postBundleResponse = await client.post('/', bundle);
    } catch (e) {
      errors.handleHttpError(e);
    }

    // Server may generate the ID for the posted patient resource
    logger.debug('Searching for patient ID in server response');
    const patientLoc = postBundleResponse.data.entry.find((e) => e.response.location.includes('Patient/')).response.location;

    if (!patientLoc) {
      logger.error(`Could not find a location for 'Patient/' in response: ${JSON.stringiy(postBundleResponse.data)}`);
      process.exit(1);
    }

    // ID will be of format Patient/<something>
    const patientId = patientLoc.split('/')[1];

    if (!patientId) {
      logger.error(`Could not parse an ID from ${patientLoc}`);
      process.exit(1);
    }

    logger.debug(`Found generated patient ID: ${patientId}`);

    logger.info(`Running calculation on Patient ${patientId}`);
    let res;
    try {
      res = await calculate(
        program.url,
        cql,
        patientId,
        program.periodStart,
        program.periodEnd,
      );
    } catch (e) {
      errors.handleHttpError(e);
    }

    logger.debug(`Got calculation results: ${JSON.stringify(res)}`);

    const validNumerator = res.numerator && res.initial_population && res.denominator;
    const validDenominator = res.denominator && res.initial_population;
    const validIpop = res.initial_population;

    // Inialize csv row with relevant booleans
    let row = {
      bundle: bundleId,
      initial_population: validIpop,
      numerator: validNumerator,
      denominator: validDenominator,
    };

    // Episode of care measure will have counts for each population. Add those to the csv
    if (res.counts) {
      logger.info('Found episode of care measure');
      logger.debug('Adding episode of care columns');
      row = {
        ...row,
        ...res.counts,
      };
    }

    // Used for csv generation
    results.push(row);

    // Write the content to the proper directories
    const bundleContent = JSON.stringify(bundle);
    if (validNumerator) {
      logger.info(`[NUMERATOR] Wrote bundle ${bundleId} to ${numerPath}`);
      fs.writeFileSync(`${numerPath}/${path.basename(bundlePath)}`, bundleContent, 'utf8');
      resultCounts.numerator += 1;
    } else if (validDenominator) {
      logger.info(`[DENOMINATOR] Wrote bundle ${bundleId} to ${denomPath}`);
      fs.writeFileSync(`${denomPath}/${path.basename(bundlePath)}`, bundleContent, 'utf8');
      resultCounts.denominator += 1;
    } else if (validIpop) {
      logger.info(`[IPOP] Wrote bundle ${bundleId} to ${ipopPath}`);
      fs.writeFileSync(`${ipopPath}/${path.basename(bundlePath)}`, bundleContent, 'utf8');
      resultCounts.ipop += 1;
    } else {
      logger.info(`No population results for ${bundlePath}`);
      resultCounts.none += 1;
    }
    resultCounts.total += 1;
  }

  // Write .csv results to file
  fs.writeFileSync(outputFile, parse(results), 'utf8');
  logger.info(`Wrote csv output to ${outputFile}`);
  logger.info(`
        Final Counts:
          - Numerator: ${resultCounts.numerator}
          - Denominator: ${resultCounts.denominator}
          - IPOP: ${resultCounts.ipop}
          - No Population: ${resultCounts.none}
          --------------------
          - Total: ${resultCounts.total}
      `);

  // Get a patient-list MeasureReport from cqf-ruler
  if (program.measureId) {
    try {
      logger.info('Generating patient-list MeasureReport');
      logger.debug(`Using measure ID: ${program.measureId}`);
      const mrResp = await client.get(`/Measure/${program.measureId}/$evaluate-measure?reportType=patient-list&periodStart=${program.periodStart}&periodEnd=${program.periodEnd}`);
      fs.writeFileSync(`${outputPath}/measure-report.json`, JSON.stringify(mrResp.data), 'utf8');
      logger.info(`Wrote measure-report to ${outputPath}/measure-report.json`);
    } catch (e) {
      errors.handleHttpError(e);
    }
  }
};

processBundles(bundleFiles);
