const querystring = require('querystring');
const { logger } = require('./logger');
const { getPopulationCount } = require('./fhirpath');

const buildQueryString = (params) => querystring.encode({ reportType: 'patient', ...params });

const getCalculationResults = async (client, patientId, measureId, periodStart, periodEnd) => {
  const evalMeasureUrl = `/Measure/${measureId}/$evaluate-measure?${buildQueryString({ patient: patientId, periodStart, periodEnd })}`;

  logger.info(`GET ${evalMeasureUrl}`);
  const response = await client.get(evalMeasureUrl);
  const measureReport = response.data;

  logger.debug(`Got individual MeasureReport ${JSON.stringify(measureReport)}`);

  if (getPopulationCount(measureReport, 'numerator') > 0) {
    return {
      measureReport,
      population: 'numerator',
    };
  }

  if (getPopulationCount(measureReport, 'denominator') > 0) {
    return {
      measureReport,
      population: 'denominator',
    };
  }

  if (getPopulationCount(measureReport, 'initial-population') > 0) {
    return {
      measureReport,
      population: 'ipop',
    };
  }

  return {
    measureReport,
    population: 'none',
  };
};

module.exports = {
  getCalculationResults,
};
