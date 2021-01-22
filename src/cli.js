#!/usr/bin/env node

/* eslint-disable no-await-in-loop */

const axios = require('axios');
const fs = require('fs');
const { parse } = require('json2csv');
const path = require('path');
const { program, Option } = require('commander');
const moment = require('moment');
const _ = require('lodash');
const { Calculator } = require('fqm-execution');
const errors = require('./utils/errors');
const { logger } = require('./utils/logger');
const { getCalculationResults } = require('./utils/calculation');
const { postPatient, evaluateMeasure } = require('./utils/httpUtils');

program
  .version('4.0.0', '-v, --version', 'print the current version')
  .addOption(new Option('-t, --type <type>', 'type of calculation').choices(['http', 'fqm']).default('fqm')) // use addOption to enforce list of options
  .requiredOption('-d, --directory <input-directory>', 'path to directory of patient Bundles')
  .option('-b, --measure-bundle <measure-bundle>', 'path to measure bundle; required when type is "fqm"')
  .option('-m, --measure-id <measure-id>', 'measure ID to evaluate; required when type is "http"')
  .option('-u, --url <url>', 'base URL of running FHIR server; required when type is "http"')
  .option('-s, --period-start <yyyy-mm-dd>', 'start of the calculation period', '2019-01-01')
  .option('-e, --period-end <yyyy-mm-dd>', 'end of the calculation period', '2019-12-31')
  .usage('-d /path/to/bundles -u http://<fhir-server-base-url> -m <measure-id> [-s yyyy-mm-dd -e yyyy-mm-dd]')
  .parse();

const options = program.opts();

// Enforce parameter rules
if (options.type === 'http') {
  if (!options.url || !options.measureId) {
    logger.error('-u/--url, and -m/--measure-id are required for type "http"');
    program.help();
  }

  if (options.measureBundle) {
    logger.error('-b/--measure-bundle only supported when using type "fqm"');
    program.help();
  }
} else {
  if (options.url) {
    logger.error('-u/--url only supported when using type "http"');
    program.help();
  }

  if (options.measureId) {
    logger.error('-m/--measureId only supported when using type "http"');
    program.help();
  }
}
// We expect the directory containing the bundles to already exist
if (!fs.existsSync(options.directory)) {
  logger.error(`Cannot find directory ${options.directory}\n`);
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
  measurePopulation: path.join(outputPath, '/measure-population'),
};

Object.values(dirPaths).forEach((dir) => {
  fs.mkdirSync(dir, { recursive: true });
});

const outputFile = `${outputPath}/results.csv`;

// Read in bundles and cql
logger.debug('Reading bundles');
const bundleFiles = fs.readdirSync(options.directory).filter((f) => path.extname(f) === '.json');

if (_.isEmpty(bundleFiles)) {
  logger.error(`No bundles found in ${options.directory}`);
  process.exit(1);
}

const populationCodes = {
  numerator: 'numerator',
  denominator: 'denominator',
  ipop: 'ipop',
  measurePopulation: 'measure-population',
  none: 'none',
};

const results = [];
const resultCounts = {
  ipop: 0,
  numerator: 0,
  denominator: 0,
  measurePopulation: 0,
  none: 0,
  total: 0,
};

const client = options.type === 'http' ? axios.create({ baseURL: options.url }) : null;
const writeJSONFile = (filePath, content) => fs.writeFileSync(filePath, JSON.stringify(content), 'utf8');

const processBundles = async (files) => {
  // Notes: Need to use for ... of ... to allow loop to halt until we get a response from the server
  // eslint-disable-next-line no-restricted-syntax
  for (const file of files) {
    const bundlePath = path.join(path.resolve(options.directory), file);
    const bundleId = path.basename(bundlePath, '.json');

    logger.debug(`Parsing patient bundle ${bundleId}`);
    const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));

    let patientId;
    if (options.type === 'http') {
      patientId = await postPatient(bundleId, bundle, client);
    } else {
      const patient = bundle.entry.map((e) => e.resource).find((e) => e.resourceType === 'Patient');

      if (!patient.id) {
        logger.error(`Could not find a patiend resource with an id in ${bundleId}`);
        process.exit(1);
      }

      patientId = patient.id;
    }

    logger.info(`Running calculation on Patient ${patientId}`);

    let measureReport;
    if (options.type === 'http') {
      try {
        measureReport = await evaluateMeasure(
          client,
          patientId,
          options.measureId,
          options.periodStart,
          options.periodEnd,
        );
      } catch (e) {
        errors.handleHttpError(e);
      }
    } else {
      const measureBundle = JSON.parse(fs.readFileSync(options.measureBundle, 'utf8'));

      try {
        const calcResults = Calculator.calculateMeasureReports(measureBundle, [bundle], {
          calculateSDEs: true,
          calculateHTML: true,
          periodStart: options.periodStart,
          periodEnd: options.periodEnd,
        });

        [measureReport] = calcResults.results;
      } catch (e) {
        logger.error(`Calculation error in fqm-execution: ${e.message}`);
      }
    }

    const res = getCalculationResults(measureReport);

    const measureReportFile = `${dirPaths.measureReport}/${bundleId}-MeasureReport.json`;
    writeJSONFile(measureReportFile, res.measureReport);
    logger.info(`Wrote individual MeasureReport to ${measureReportFile}`);

    if (res.measureScore) {
      logger.info(`Measure Score: ${res.measureScore}`);
    }

    const csvEntry = {
      bundle: bundleId,
      population: res.population,
      observation: res.observation,
    };

    if (res.sdes) {
      res.sdes.forEach((sde) => {
        csvEntry[sde.name] = `${sde.code}${sde.display ? ` - ${sde.display}` : ''}`;
      });
    }

    logger.debug(`Bundle ${bundleId} calculated with population ${res.population}`);
    results.push(csvEntry);

    if (res.stratifiers) {
      res.stratifiers.forEach((strat) => {
        const stratifierPath = path.join(outputPath, `/${strat.name}`);
        const stratifierPaths = {
          ipop: path.join(stratifierPath, '/ipop'),
          numerator: path.join(stratifierPath, '/numerator'),
          denominator: path.join(stratifierPath, '/denominator'),
          measurePopulation: path.join(stratifierPath, '/measure-population'),
          none: path.join(stratifierPath, '/none'),
        };

        if (!fs.existsSync(stratifierPath)) {
          Object.values(stratifierPaths).forEach((dir) => {
            fs.mkdirSync(dir, { recursive: true });
          });
        }

        if (strat.population === populationCodes.numerator) {
          logger.info(`[${strat.name} - NUMERATOR] Wrote bundle ${bundleId} to ${stratifierPaths.numerator}`);
          writeJSONFile(`${stratifierPaths.numerator}/${path.basename(bundlePath)}`, bundle);
        } else if (strat.population === populationCodes.denominator) {
          logger.info(`[${strat.name} - DENOMINATOR] Wrote bundle ${bundleId} to ${stratifierPaths.denominator}`);
          writeJSONFile(`${stratifierPaths.denominator}/${path.basename(bundlePath)}`, bundle);
        } else if (strat.population === populationCodes.measurePopulation) {
          logger.info(`[${strat.name} - MEASURE POPULATION] Wrote bundle ${bundleId} to ${dirPaths.measurePopulation}`);
          writeJSONFile(`${stratifierPaths.measurePopulation}/${path.basename(bundlePath)}`, bundle);
        } else if (strat.population === populationCodes.ipop) {
          logger.info(`[${strat.name} - IPOP] Wrote bundle ${bundleId} to ${stratifierPaths.ipop}`);
          writeJSONFile(`${stratifierPaths.ipop}/${path.basename(bundlePath)}`, bundle);
        } else {
          logger.info(`[${strat.name} - NONE] Wrote bundle ${bundleId} to ${stratifierPaths.none}`);
          writeJSONFile(`${stratifierPaths.none}/${path.basename(bundlePath)}`, bundle);
        }
      });
    }

    // Write the content to the proper directories
    if (res.population === populationCodes.numerator) {
      logger.info(`[NUMERATOR] Wrote bundle ${bundleId} to ${dirPaths.numerator}`);
      writeJSONFile(`${dirPaths.numerator}/${path.basename(bundlePath)}`, bundle);
      resultCounts.numerator += 1;
    } else if (res.population === populationCodes.denominator) {
      logger.info(`[DENOMINATOR] Wrote bundle ${bundleId} to ${dirPaths.denominator}`);
      writeJSONFile(`${dirPaths.denominator}/${path.basename(bundlePath)}`, bundle);
      resultCounts.denominator += 1;
    } else if (res.population === populationCodes.measurePopulation) {
      logger.info(`[MEASURE POPULATION] Wrote bundle ${bundleId} to ${dirPaths.measurePopulation}`);
      writeJSONFile(`${dirPaths.measurePopulation}/${path.basename(bundlePath)}`, bundle);
      resultCounts.measurePopulation += 1;
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
          - Measure Population: ${resultCounts.measurePopulation}
          - IPOP: ${resultCounts.ipop}
          - No Population: ${resultCounts.none}
          --------------------
          - Total: ${resultCounts.total}
      `);

  // Get a patient-list MeasureReport from server
  if (options.type === 'http') {
    try {
      logger.info('Generating patient-list MeasureReport');
      logger.debug(`Using measure ID: ${options.measureId}`);
      const mrResp = await client.get(`/Measure/${options.measureId}/$evaluate-measure?reportType=patient-list&periodStart=${options.periodStart}&periodEnd=${options.periodEnd}`);
      writeJSONFile(`${outputPath}/population-measure-report.json`, mrResp.data);
      logger.info(`Wrote MeasureReport to ${outputPath}/population-measure-report.json`);
    } catch (e) {
      errors.handleHttpError(e);
    }
  }
};

processBundles(bundleFiles);
