#!/usr/bin/env node

/* eslint-disable no-await-in-loop */

const fs = require('fs');
const path = require('path');
const program = require('commander');

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
  fs.mkdirSync(outputRoot);
}