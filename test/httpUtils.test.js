const axios = require('axios');
const nock = require('nock');
const { postPatient, evaluateMeasure } = require('../src/utils/httpUtils');
const numerMeasureReport = require('./fixtures/numerator-measure-report.json');
const txnResponse = require('./fixtures/txn-response-bundle.json');

const MOCK_URL = 'http://localhost';
const EXAMPLE_PATIENT_ID = 'example-patient';
const EXAMPLE_MEASURE_ID = 'example-measure';
const PERIOD_START = '2019-01-01';
const PERIOD_END = '2019-12-31';
const mockClient = axios.create({ baseURL: MOCK_URL });

test('should properly parse id location', async () => {
  nock(MOCK_URL)
    .post('/')
    .reply(200, txnResponse);

  const result = await postPatient('', {}, mockClient);
  expect(result).toEqual(EXAMPLE_PATIENT_ID);
});

test('should properly call $evaluate-measure', async () => {
  nock(MOCK_URL)
    .get(`/Measure/${EXAMPLE_MEASURE_ID}/$evaluate-measure`)
    .query({
      reportType: 'patient',
      patient: EXAMPLE_PATIENT_ID,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
    })
    .reply(200, numerMeasureReport);

  const result = await evaluateMeasure(mockClient, EXAMPLE_PATIENT_ID, EXAMPLE_MEASURE_ID, PERIOD_START, PERIOD_END);
  expect(result).toEqual(numerMeasureReport);
});
