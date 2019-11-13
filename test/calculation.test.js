const nock = require('nock');
const { calculate } = require('../src/utils/calculation');

const EXAMPLE_NUMERATOR_CQL = 'define "Initial Population":\r\n    true\r\n\r\ndefine "Numerator":\r\n    true\r\n\r\ndefine "Denominator":\r\n    true';
const EXAMPLE_IPP_CQL = 'define "Initial Population":\r\n    true\r\n\r\ndefine "Numerator":\r\n    false\r\n\r\ndefine "Denominator":\r\n    true';
const ILLEGAL_CQL = 'this is not cql';
const MOCK_URL = 'http://example.com';
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

test('patient in the numerator should yield an object of all true', async () => {
  nock(MOCK_URL)
    .post('/$cql', getParamsForCQL(EXAMPLE_NUMERATOR_CQL))
    .reply(200, {
      resourceType: 'Bundle',
      type: 'collection',
      entry: [{
        fullUrl: 'Initial Population',
        resource: {
          resourceType: 'Parameters',
          id: 'Initial Population',
          parameter: [{
            name: 'location',
            valueString: '[1:1]',
          },
          {
            name: 'value',
            valueString: 'true',
          },
          {
            name: 'resultType',
            valueString: 'Boolean',
          },
          ],
        },
      },
      {
        fullUrl: 'Numerator',
        resource: {
          resourceType: 'Parameters',
          id: 'Numerator',
          parameter: [{
            name: 'location',
            valueString: '[4:1]',
          },
          {
            name: 'value',
            valueString: 'true',
          },
          {
            name: 'resultType',
            valueString: 'Boolean',
          },
          ],
        },
      },
      {
        fullUrl: 'Denominator',
        resource: {
          resourceType: 'Parameters',
          id: 'Denominator',
          parameter: [{
            name: 'location',
            valueString: '[7:1]',
          },
          {
            name: 'value',
            valueString: 'true',
          },
          {
            name: 'resultType',
            valueString: 'Boolean',
          },
          ],
        },
      }],
    });

  const result = await calculate('http://example.com', EXAMPLE_NUMERATOR_CQL, EXAMPLE_PATIENT_ID, PERIOD_START, PERIOD_END);

  // Should have all true for the three populations
  expect(result.initial_population).toBe(true);
  expect(result.numerator).toBe(true);
  expect(result.denominator).toBe(true);
});

test('patient in ipp/denom but not numerator should yield proper booleans', async () => {
  nock(MOCK_URL)
    .post('/$cql', getParamsForCQL(EXAMPLE_IPP_CQL))
    .reply(200, {
      resourceType: 'Bundle',
      type: 'collection',
      entry: [{
        fullUrl: 'Initial Population',
        resource: {
          resourceType: 'Parameters',
          id: 'Initial Population',
          parameter: [{
            name: 'location',
            valueString: '[1:1]',
          },
          {
            name: 'value',
            valueString: 'true',
          },
          {
            name: 'resultType',
            valueString: 'Boolean',
          },
          ],
        },
      },
      {
        fullUrl: 'Numerator',
        resource: {
          resourceType: 'Parameters',
          id: 'Numerator',
          parameter: [{
            name: 'location',
            valueString: '[4:1]',
          },
          {
            name: 'value',
            valueString: 'false',
          },
          {
            name: 'resultType',
            valueString: 'Boolean',
          },
          ],
        },
      },
      {
        fullUrl: 'Denominator',
        resource: {
          resourceType: 'Parameters',
          id: 'Denominator',
          parameter: [{
            name: 'location',
            valueString: '[7:1]',
          },
          {
            name: 'value',
            valueString: 'true',
          },
          {
            name: 'resultType',
            valueString: 'Boolean',
          },
          ],
        },
      }],
    });

  const result = await calculate('http://example.com', EXAMPLE_IPP_CQL, EXAMPLE_PATIENT_ID, PERIOD_START, PERIOD_END);

  // Should have all true for everything except numerator
  expect(result.initial_population).toBe(true);
  expect(result.numerator).toBe(false);
  expect(result.denominator).toBe(true);
});

test('illegal cql should yield no population results', async () => {
  nock(MOCK_URL)
    .post('/$cql', getParamsForCQL(ILLEGAL_CQL))
    .reply(200, {
      resourceType: 'Bundle',
      type: 'collection',
      entry: [{
        fullUrl: 'Initial Population',
        resource: {
          resourceType: 'Parameters',
          id: 'Error',
          parameter: [{
            name: 'location',
            valueString: '[1:0]',
          },
          {
            name: 'error',
            valueString: 'Syntax error at this',
          }],
        },
      }],
    });

  const result = await calculate('http://example.com', ILLEGAL_CQL, EXAMPLE_PATIENT_ID, PERIOD_START, PERIOD_END);
  expect(result).toEqual({});
});
