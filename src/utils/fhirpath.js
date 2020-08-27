const fhirpath = require('fhirpath');

exports.getPopulationCount = (group, population) => {
  const path = fhirpath.compile(`population.where(code.coding.code = '${population}')`);
  const result = path(group);

  if (!!result && result[0] !== undefined) {
    return result[0].count;
  }
  return null;
};

exports.getMeasureScore = (group) => fhirpath.evaluate(group, 'measureScore.value')[0];

exports.getStratifiers = (mr) => {
  const results = fhirpath.evaluate(mr, 'MeasureReport.group.first().stratifier.where(stratum)');
  return (results && results.length > 0) ? results : null;
};

exports.getStratifierName = (strat) => fhirpath.evaluate(strat, 'code.coding.code')[0] || null;
