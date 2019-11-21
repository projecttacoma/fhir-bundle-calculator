#!/usr/bin/env node

/* eslint-disable no-await-in-loop */

const fs = require('fs');
const path = require('path');
const program = require('commander');
const cqlDependencyResolver = require('./utils/cqlDependencyResolver')
const cqlTranslator = require('./utils/cqlTranslator')

// Prints the usage and quits (can also be seen with -h/--help)
const printHelpAndExit = () => {
  program.help();
  process.exit(1);
};

program
  .option('-c --cql <cql-file>', 'Path to main cql file.')
  .option('-o --output-dir <directory>', 'Directory to output resources and bundle into', './output')
  .usage('-c /path/to/main/cql/file [-o /path/to/output/directory]')
  .parse(process.argv);


// Enforce required parameters
if (!program.cql) {
  console.error('-c/--cql is required');
  printHelpAndExit();
}

// We expect the main cql file to exist
if (!fs.existsSync(program.cql)) {
  console.error(`Cannot find file ${program.cql}\n`);
  printHelpAndExit();
}

// Create output folder if it doesn't exist
if (!fs.existsSync(program.outputDir)) {
  fs.mkdirSync(program.outputDir);
}


cqlDependencyResolver.findDependentCQLFiles(program.cql)
  .catch((e) => {
    console.error(`Failed to resolve dependencies. ${e.message}`)
    process.exit(1);
  })
  .then((dependentCQLFiles) => {
    let cqlFiles = [program.cql, ...dependentCQLFiles]
    console.log(cqlFiles)
    return cqlTranslator.translateCQLFiles(cqlFiles);
  })
  .catch((e) => {
    console.error(`Failed to translate CQL. ${e}`)
    process.exit(1);
  })
  .then((cqlElmXML) => {
    console.log('translated to elmxml')
  })
  

