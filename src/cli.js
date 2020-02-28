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
const { getCalculationResults } = require('./utils/calculation');

program
  .version('3.0.0', '-v, --version', 'print the current version')
  .option('-d, --directory <input-directory>', 'path to directory of Synthea Bundles')
  .option('-m, --measure-id <measure-id>', 'measure ID to evaluate')
  .option('-u, --url <url>', 'base URL of running cqf-ruler instance', 'http://localhost:8080/cqf-ruler-r4/fhir')
  .option('-s, --period-start <yyyy-mm-dd>', 'start of the calculation period', '2019-01-01')
  .option('-e, --period-end <yyyy-mm-dd>', 'end of the calculation period', '2019-12-31')
  .usage('-d /path/to/bundles -u http://<cqf-ruler-base-url> -m <measure-id> [-s yyyy-mm-dd -e yyyy-mm-dd]')
  .parse(process.argv);

// Enforce required parameters
if (!program.directory || !program.url || !program.measureId) {
  logger.error('-d/--directory, -u/--url, and -m/--measure-id are required');
  program.help();
}

// We expect the directory containing the bundles to already exist
if (!fs.existsSync(program.directory)) {
  logger.error(`Cannot find directory ${program.directory}\n`);
  program.help();
}

// Create subdirectories for timestamped results and sorted populations
logger.debug('Creating population directories');
const outputPath = `./output/results-${moment().format('YYYY-MM-DD-THHmmss')}`;
const dirPaths = {
  ipop: path.join(outputPath, '/ipop'),
  numerator: path.join(outputPath, '/numerator'),
  denominator: path.join(outputPath, '/denominator'),
  none: path.join(outputPath, '/none'),
  measureReport: path.join(outputPath, '/measure-reports'),
};

Object.values(dirPaths).forEach((dir) => {
  fs.mkdirSync(dir, { recursive: true });
});

const outputFile = `${outputPath}/results.csv`;

// Read in bundles and cql
logger.debug('Reading bundles');
const bundleFiles = fs.readdirSync(program.directory).filter((f) => path.extname(f) === '.json');

if (_.isEmpty(bundleFiles)) {
  logger.error(`No bundles found in ${program.directory}`);
  process.exit(1);
}

const populationCodes = {
  numerator: 'numerator',
  denominator: 'denominator',
  ipop: 'ipop',
  none: 'none',
};

const results = [];
const resultCounts = {
  ipop: 0,
  numerator: 0,
  denominator: 0,
  none: 0,
  total: 0,
};

const client = axios.create({ baseURL: program.url });
const writeJSONFile = (filePath, content) => fs.writeFileSync(filePath, JSON.stringify(content), 'utf8');

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
      res = await getCalculationResults(
        client,
        patientId,
        program.measureId,
        program.periodStart,
        program.periodEnd,
      );
    } catch (e) {
      errors.handleHttpError(e);
    }

    const measureReportFile = `${dirPaths.measureReport}/${bundleId}-MeasureReport.json`;
    writeJSONFile(measureReportFile, res.measureReport);
    logger.info(`Wrote individual MeasureReport to ${measureReportFile}`);

    logger.debug(`Bundle ${bundleId} calculated with population ${res.population}`);
    results.push({
      bundle: bundleId,
      population: res.population,
    });

    // Write the content to the proper directories
    if (res.population === populationCodes.numerator) {
      logger.info(`[NUMERATOR] Wrote bundle ${bundleId} to ${dirPaths.numerator}`);
      writeJSONFile(`${dirPaths.numerator}/${path.basename(bundlePath)}`, bundle);
      resultCounts.numerator += 1;
    } else if (res.population === populationCodes.denominator) {
      logger.info(`[DENOMINATOR] Wrote bundle ${bundleId} to ${dirPaths.denominator}`);
      writeJSONFile(`${dirPaths.denominator}/${path.basename(bundlePath)}`, bundle);
      resultCounts.denominator += 1;
    } else if (res.population === populationCodes.ipop) {
      logger.info(`[IPOP] Wrote bundle ${bundleId} to ${dirPaths.ipop}`);
      writeJSONFile(`${dirPaths.ipop}/${path.basename(bundlePath)}`, bundle);
      resultCounts.ipop += 1;
    } else {
      logger.info(`[NONE] Wrote bundle ${bundleId} to ${dirPaths.none}`);
      writeJSONFile(`${dirPaths.none}/${path.basename(bundlePath)}`, bundle);
      resultCounts.none += 1;
    }
    resultCounts.total += 1;
  }

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
  try {
    logger.info('Generating patient-list MeasureReport');
    logger.debug(`Using measure ID: ${program.measureId}`);
    const mrResp = await client.get(`/Measure/${program.measureId}/$evaluate-measure?reportType=patient-list&periodStart=${program.periodStart}&periodEnd=${program.periodEnd}`);
    writeJSONFile(`${outputPath}/population-measure-report.json`, mrResp.data);
    logger.info(`Wrote MeasureReport to ${outputPath}/population-measure-report.json`);
  } catch (e) {
    errors.handleHttpError(e);
  }
};

processBundles(bundleFiles);
