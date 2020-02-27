const fhirpath = require('fhirpath');

exports.getPopulationCount = (mr, population) => {
  const path = fhirpath.compile(`MeasureReport.group.population.where(code.coding.code = '${population}')`);
  return path(mr)[0].count;
};
