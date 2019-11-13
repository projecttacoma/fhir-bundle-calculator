const program = require('commander');

program
  .option('-d --directory <input-directory>', 'Path to directory of Synthea Bundles')
  .option('-u --url <url>', 'Base URL of runningcqf-ruler instance')
  .option('-o --output <output-directory>', 'Path to directory for output files/csv', './synthea-calculation-output')
  .usage(' -d /path/to/bundles -u http://<cqf-ruler-base-url> [-o /path/for/output]')
  .parse(process.argv);
