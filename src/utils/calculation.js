const querystring = require('querystring');
const { logger } = require('./logger');
const {
  getPopulationCount, getMeasureScore, getStratifiers, getStratifierName,
} = require('./fhirpath');

const buildQueryString = (params) => querystring.encode({ reportType: 'patient', ...params });

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

const getCalculationResults = async (client, patientId, measureId, periodStart, periodEnd) => {
  const evalMeasureUrl = `/Measure/${measureId}/evaluate-measure?${buildQueryString({ patient: patientId, periodStart, periodEnd })}`;

  logger.info(`GET ${evalMeasureUrl}`);
  const response = await client.get(evalMeasureUrl);
  const measureReport = response.data;
  const mainGroup = measureReport.group[0];
  const mainPopulationResults = getPopulationResults(mainGroup);

  logger.debug(`Got individual MeasureReport ${JSON.stringify(measureReport)}`);

  const stratifiers = getStratifiers(measureReport);

  return {
    ...mainPopulationResults,
    measureReport,
    stratifiers: stratifiers !== null
      ? (stratifiers.map((strat) => ({
        name: getStratifierName(strat),
        ...getPopulationResults(strat.stratum[0]),
      }))) : [],
  };
};

module.exports = {
  getCalculationResults,
};
