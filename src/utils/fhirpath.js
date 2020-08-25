const fhirpath = require('fhirpath');

exports.getPopulationCount = (mr, population) => {
  const path = fhirpath.compile(`MeasureReport.group.population.where(code.coding.code = '${population}')`);
  const result = path(mr);

  if (!!result && result[0] !== undefined) {
    return result[0].count;
  }
  return null;
};

exports.getMeasureScore = (mr) => fhirpath.evaluate(mr, 'MeasureReport.group.measureScore.value')[0];
