const { logger } = require('./logger');
const {
  getPopulationCount, getMeasureScore, getStratifiers, getStratifierName, getMeasureObservation, getSDEs,
} = require('./fhirpath');

function getPopulationResults(group) {
  const measureScore = getMeasureScore(group);
  if (getPopulationCount(group, 'numerator') > 0) {
    return {
      population: 'numerator',
      measureScore,
    };
  }

  if (getPopulationCount(group, 'denominator') > 0) {
    return {
      population: 'denominator',
      measureScore,
    };
  }

  if (getPopulationCount(group, 'measure-population') > 0) {
    return {
      population: 'measure-population',
      measureScore,
    };
  }

  if (getPopulationCount(group, 'initial-population') > 0) {
    return {
      population: 'ipop',
      measureScore,
    };
  }

  return {
    population: 'none',
    measureScore,
  };
}

const getCalculationResults = (measureReport) => {
  const mainGroup = measureReport.group[0];
  const mainPopulationResults = getPopulationResults(mainGroup);

  logger.debug(`Got individual MeasureReport ${JSON.stringify(measureReport)}`);

  const stratifiers = getStratifiers(measureReport);
  const observation = getMeasureObservation(measureReport);
  const sdes = getSDEs(measureReport);

  return {
    ...mainPopulationResults,
    measureReport,
    stratifiers: stratifiers !== null
      ? (stratifiers.map((strat) => ({
        name: getStratifierName(strat),
        ...getPopulationResults(strat.stratum[0]),
      }))) : [],
    observation,
    sdes,
  };
};

module.exports = {
  getCalculationResults,
};
