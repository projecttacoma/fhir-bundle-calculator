const querystring = require('querystring');
const { logger } = require('./logger');

const buildQueryString = (params) => querystring.encode({ reportType: 'patient', ...params });

async function postPatient(bundleId, bundle, client) {
  // POST bundle to the server
  logger.info(`Posting bundle ${bundleId}`);
  const postBundleResponse = await client.post('/', bundle);

  // Server may generate the ID for the posted patient resource
  logger.debug('Searching for patient ID in server response');
  const patientLoc = postBundleResponse.data.entry.find((e) => e.response.location.includes('Patient/')).response.location;

  if (!patientLoc) {
    logger.error(`Could not find a location for 'Patient/' in response: ${JSON.stringiy(postBundleResponse.data)}`);
    process.exit(1);
  }

  // ID will be of format Patient/<something>
  const patientId = patientLoc.split('/')[1];

  if (!patientId) {
    logger.error(`Could not parse an ID from ${patientLoc}`);
    process.exit(1);
  }

  logger.debug(`Found generated patient ID: ${patientId}`);
  return patientId;
}

async function evaluateMeasure(client, patientId, measureId, periodStart, periodEnd) {
  const evalMeasureUrl = `/Measure/${measureId}/$evaluate-measure?${buildQueryString({ subject: patientId, periodStart, periodEnd })}`;

  logger.info(`GET ${evalMeasureUrl}`);
  const response = await client.get(evalMeasureUrl);
  return response.data;
}

module.exports = {
  postPatient,
  evaluateMeasure,
};
