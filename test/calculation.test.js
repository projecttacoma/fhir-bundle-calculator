const nock = require('nock');
const { logger } = require('../src/utils/logger.js');
const { calculate } = require('../src/utils/calculation');
const allPopulationsResponse = require('./fixtures/all-populations-response.json');
const somePopulationResponse = require('./fixtures/some-populations-response.json');
const errorResponse = require('./fixtures/error-response.json');
const episodeOfCareResponse = require('./fixtures/episode-of-care-response.json');

const EXAMPLE_NUMERATOR_CQL = 'define "Initial Population":\r\n    true\r\n\r\ndefine "Numerator":\r\n    true\r\n\r\ndefine "Denominator":\r\n    true';
const EXAMPLE_IPP_CQL = 'define "Initial Population":\r\n    true\r\n\r\ndefine "Numerator":\r\n    false\r\n\r\ndefine "Denominator":\r\n    true';
const ILLEGAL_CQL = 'this is not cql';
const EPISODE_OF_CARE_CQL = 'define "Initial Population":\r\n    [0, 1, 2, 3, 4]\r\n\r\ndefine "Numerator":\r\n    []\r\n\r\ndefine "Denominator":\r\n    []';
const MOCK_URL = 'http://localhost';
const EXAMPLE_PATIENT_ID = 'example-patient';
const PERIOD_START = '2019-01-01';
const PERIOD_END = '2019-12-31';

const getParamsForCQL = (cql) => ({
  resourceType: 'Parameters',
  parameter: [{
    name: 'code',
    valueString: cql,
  }, {
    name: 'patientId',
    valueString: EXAMPLE_PATIENT_ID,
  }, {
    name: 'periodStart',
    valueString: PERIOD_START,
  }, {
    name: 'periodEnd',
    valueString: PERIOD_END,
  }, {
    name: 'context',
    valueString: 'context',
  }],
});

// Mock out process.exit
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

// Disable logger in unit tests
logger.info = jest.fn();
logger.error = jest.fn();

test('patient in the numerator should yield an object of all true', async () => {
  nock(MOCK_URL)
    .post('/$cql', getParamsForCQL(EXAMPLE_NUMERATOR_CQL))
    .reply(200, allPopulationsResponse);

  const result = await calculate(
    MOCK_URL,
    EXAMPLE_NUMERATOR_CQL,
    EXAMPLE_PATIENT_ID,
    PERIOD_START,
    PERIOD_END,
  );

  // Should have all true for the three populations
  expect(result.initial_population).toBe(true);
  expect(result.numerator).toBe(true);
  expect(result.denominator).toBe(true);
});

test('patient in ipp/denom but not numerator should yield proper booleans', async () => {
  nock(MOCK_URL)
    .post('/$cql', getParamsForCQL(EXAMPLE_IPP_CQL))
    .reply(200, somePopulationResponse);

  const result = await calculate(
    MOCK_URL,
    EXAMPLE_IPP_CQL,
    EXAMPLE_PATIENT_ID,
    PERIOD_START,
    PERIOD_END,
  );

  // Should have all true for everything except numerator
  expect(result.initial_population).toBe(true);
  expect(result.numerator).toBe(false);
  expect(result.denominator).toBe(true);
});

test('illegal cql should yield no population results and an error message', async () => {
  nock(MOCK_URL)
    .post('/$cql', getParamsForCQL(ILLEGAL_CQL))
    .reply(200, errorResponse);

  await calculate(
    MOCK_URL,
    ILLEGAL_CQL,
    EXAMPLE_PATIENT_ID,
    PERIOD_START,
    PERIOD_END,
  );

  expect(mockExit).toHaveBeenCalledWith(1);
});

test('episode of care measure should contain episode counts', async () => {
  nock(MOCK_URL)
    .post('/$cql', getParamsForCQL(EPISODE_OF_CARE_CQL))
    .reply(200, episodeOfCareResponse);

  const result = await calculate(
    MOCK_URL,
    EPISODE_OF_CARE_CQL,
    EXAMPLE_PATIENT_ID,
    PERIOD_START,
    PERIOD_END,
  );

  // Populated list should be true (ipop), empty lists should be false
  expect(result.initial_population).toBe(true);
  expect(result.numerator).toBe(false);
  expect(result.denominator).toBe(false);

  // Since this is an Episode of Care measure, we should have a counts field in the result
  expect(result.counts).toBeDefined();
  expect(result.counts.initial_population_episodes).toBe(5);
  expect(result.counts.initial_population_episodeIDs).toEqual([0, 1, 2, 3, 4]);
  expect(result.counts.numerator_episodes).toBe(0);
  expect(result.counts.numerator_episodeIDs).toEqual([]);
  expect(result.counts.denominator_episodes).toBe(0);
  expect(result.counts.denominator_episodeIDs).toEqual([]);
});
