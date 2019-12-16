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
const winston = require('winston');
const { calculate } = require('./utils/calculation');

// Prints the usage and quits (can also be seen with -h/--help)
const printHelpAndExit = () => {
  program.help();
  process.exit(1);
};

program
  .option('-d --directory <input-directory>', 'Path to directory of Synthea Bundles')
  .option('-c --cql <cql-file>', 'Path to cql file to be used for calculation')
  .option('-u --url <url>', 'Base URL of running cqf-ruler instance')
  .option('-s --period-start <yyyy-mm-dd>', 'Start of the calculation period', '2019-01-01')
  .option('-e --period-end <yyyy-mm-dd>', 'End of the calculation period', '2019-12-31')
  .option('-v --verbose', 'Enable debug logging', false)
  .usage('-d /path/to/bundles -c /path/to/cql/file -u http://<cqf-ruler-base-url> [-s yyyy-mm-dd -e yyyy-mm-dd]')
  .parse(process.argv);

const logger = winston.createLogger({
  level: program.verbose ? 'debug' : 'info',
  format: winston.format.cli(),
  transports: [
    new winston.transports.Console(),
  ],
});

// Enforce required parameters
if (!program.directory || !program.url || !program.cql) {
  logger.error('-d/--directory, -u/--url, and -c/--cql are required');
  printHelpAndExit();
}

// We expect the directory containing the bundles to already exist
if (!fs.existsSync(program.directory)) {
  logger.error(`Cannot find directory ${program.directory}\n`);
  printHelpAndExit();
}

// Create output directory if it doesn't exist
const outputRoot = './output';
if (!fs.existsSync(outputRoot)) {
  logger.debug('creating output directory');
  fs.mkdirSync(outputRoot);
}

// Output for this run is timestamped with the current datetime
const outputPath = path.join(outputRoot, `/results-${moment().format('YYYY-MM-DD-THHmmss')}`);
const ipopPath = path.join(outputPath, '/ipop');
const numerPath = path.join(outputPath, '/numerator');
const denomPath = path.join(outputPath, '/denominator');
const errorPath = path.join(outputPath, '/errors');

// Create subdirectories for timestamped results and sorted populations
logger.debug('creating population directories');
fs.mkdirSync(outputPath);
fs.mkdirSync(ipopPath);
fs.mkdirSync(numerPath);
fs.mkdirSync(denomPath);
fs.mkdirSync(errorPath);

const outputFile = `${outputPath}/results.csv`;

// Read in bundles and cql
logger.debug('reading bundles');
const bundleFiles = fs.readdirSync(program.directory).filter((f) => path.extname(f) === '.json');
logger.debug('reading CQL file');
const cql = fs.readFileSync(program.cql, 'utf8');
const results = [];

const processBundles = async (files) => {
  // Notes: Need to use for ... of ... to allow loop to halt until we get a response from the server
  // eslint-disable-next-line no-restricted-syntax
  for (const file of files) {
    const bundlePath = path.join(path.resolve(program.directory), file);
    const bundleId = path.basename(bundlePath, '.json');
    logger.debug('parsing patient bundle');
    const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));

    // POST bundle to the server
    let postBundleResponse;
    try {
      logger.info(`Posting bundle ${bundlePath}`);
      postBundleResponse = await axios.post(program.url, bundle);
    } catch (e) {
      throw new Error(`Failed to post bundle:\n\n${e.message}`);
    }

    // Server may generate the ID for the posted patient resource
    const patientLoc = postBundleResponse.data.entry.find((e) => e.response.location.includes('Patient/')).response.location;

    // ID will be of format Patient/<something>
    const patientId = patientLoc.split('/')[1];
    logger.debug('found generated patient ID');

    logger.info(`running calculation on Patient ${patientId}`);
    const res = await calculate(
      program.url,
      cql,
      patientId,
      program.periodStart,
      program.periodEnd,
    );

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
      logger.debug('found episode of care measure');
      logger.debug('adding episode count row');
      row = {
        ...row,
        ...res.counts,
      };
    }

    // Add a column for cql errors if they occurred
    if (res.error) {
      row = {
        ...row,
        error: res.error,
      };
    }

    // Used for csv generation
    results.push(row);

    // Write the content to the proper directories
    const bundleContent = JSON.stringify(bundle);
    if (res.error) {
      logger.error(`Error during $cql operation for ${bundlePath}`);
      fs.writeFileSync(`${errorPath}/${path.basename(bundlePath)}`, bundleContent, 'utf8');
    } else if (validNumerator) {
      logger.info(`Wrote bundle ${bundlePath} to ${numerPath}`);
      fs.writeFileSync(`${numerPath}/${path.basename(bundlePath)}`, bundleContent, 'utf8');
    } else if (validDenominator) {
      logger.info(`Wrote bundle ${bundlePath} to ${denomPath}`);
      fs.writeFileSync(`${denomPath}/${path.basename(bundlePath)}`, bundleContent, 'utf8');
    } else if (validIpop) {
      logger.info(`Wrote bundle ${bundlePath} to ${ipopPath}`);
      fs.writeFileSync(`${ipopPath}/${path.basename(bundlePath)}`, bundleContent, 'utf8');
    } else {
      logger.info(`No population results for ${bundlePath}`);
    }

    // Writes the csv file once we have processed all bundles
    if (results.length === bundleFiles.length) {
      fs.writeFileSync(outputFile, parse(results), 'utf8');
      logger.info(`Wrote csv output to ${outputFile}`);
    }
  }
};

processBundles(bundleFiles);
