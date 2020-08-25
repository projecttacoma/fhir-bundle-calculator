const axios = require('axios');
const nock = require('nock');
const { getCalculationResults } = require('../src/utils/calculation');
const numerMeasureReport = require('./fixtures/numerator-measure-report.json');
const denomMeasureReport = require('./fixtures/denominator-measure-report.json');
const ipopMeasureReport = require('./fixtures/ipop-measure-report.json');
const noPopMeasureReport = require('./fixtures/no-pop-measure-report.json');

const MOCK_URL = 'http://localhost';
const EXAMPLE_PATIENT_ID = 'example-patient';
const EXAMPLE_MEASURE_ID = 'example-measure';
const PERIOD_START = '2019-01-01';
const PERIOD_END = '2019-12-31';

const mockClient = axios.create({ baseURL: MOCK_URL });

test('patient in the numerator should yield an proper population result', async () => {
  nock(MOCK_URL)
    .get(`/Measure/${EXAMPLE_MEASURE_ID}/$evaluate-measure`)
    .query(() => true)
    .reply(200, numerMeasureReport);

  const result = await getCalculationResults(
    mockClient,
    EXAMPLE_PATIENT_ID,
    EXAMPLE_MEASURE_ID,
    PERIOD_START,
    PERIOD_END,
  );

  expect(result.measureReport).toEqual(numerMeasureReport);
  expect(result.population).toBe('numerator');
  expect(result.measureScore).toBe(1);
});

test('patient in the denominator should yield a proper population result', async () => {
  nock(MOCK_URL)
    .get(`/Measure/${EXAMPLE_MEASURE_ID}/$evaluate-measure`)
    .query(() => true)
    .reply(200, denomMeasureReport);

  const result = await getCalculationResults(
    mockClient,
    EXAMPLE_PATIENT_ID,
    EXAMPLE_MEASURE_ID,
    PERIOD_START,
    PERIOD_END,
  );

  expect(result.measureReport).toEqual(denomMeasureReport);
  expect(result.population).toBe('denominator');
  expect(result.measureScore).toBe(0);
});

test('patient in the ipop should yield a proper population result', async () => {
  nock(MOCK_URL)
    .get(`/Measure/${EXAMPLE_MEASURE_ID}/$evaluate-measure`)
    .query(() => true)
    .reply(200, ipopMeasureReport);

  const result = await getCalculationResults(
    mockClient,
    EXAMPLE_PATIENT_ID,
    EXAMPLE_MEASURE_ID,
    PERIOD_START,
    PERIOD_END,
  );

  expect(result.measureReport).toEqual(ipopMeasureReport);
  expect(result.population).toBe('ipop');
  expect(result.measureScore).toBe(0);
});

test('patient in no population should yield a proper population result', async () => {
  nock(MOCK_URL)
    .get(`/Measure/${EXAMPLE_MEASURE_ID}/$evaluate-measure`)
    .query(() => true)
    .reply(200, noPopMeasureReport);

  const result = await getCalculationResults(
    mockClient,
    EXAMPLE_PATIENT_ID,
    EXAMPLE_MEASURE_ID,
    PERIOD_START,
    PERIOD_END,
  );

  expect(result.measureReport).toEqual(noPopMeasureReport);
  expect(result.population).toBe('none');
  expect(result.measureScore).toBe(0);
});
