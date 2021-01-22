const { getCalculationResults } = require('../src/utils/calculation');
const numerMeasureReport = require('./fixtures/numerator-measure-report.json');
const denomMeasureReport = require('./fixtures/denominator-measure-report.json');
const ipopMeasureReport = require('./fixtures/ipop-measure-report.json');
const noPopMeasureReport = require('./fixtures/no-pop-measure-report.json');
const stratifierMeasureReport = require('./fixtures/stratifier-measure-report.json');

test('patient in the numerator should yield an proper population result', () => {
  const result = getCalculationResults(
    numerMeasureReport,
  );

  expect(result.measureReport).toEqual(numerMeasureReport);
  expect(result.population).toBe('numerator');
  expect(result.measureScore).toBe(1);
});

test('patient in the denominator should yield a proper population result', () => {
  const result = getCalculationResults(
    denomMeasureReport,
  );

  expect(result.measureReport).toEqual(denomMeasureReport);
  expect(result.population).toBe('denominator');
  expect(result.measureScore).toBe(0);
});

test('patient in the ipop should yield a proper population result', () => {
  const result = getCalculationResults(
    ipopMeasureReport,
  );

  expect(result.measureReport).toEqual(ipopMeasureReport);
  expect(result.population).toBe('ipop');
  expect(result.measureScore).toBe(0);
});

test('patient in no population should yield a proper population result', () => {
  const result = getCalculationResults(
    noPopMeasureReport,
  );

  expect(result.measureReport).toEqual(noPopMeasureReport);
  expect(result.population).toBe('none');
  expect(result.measureScore).toBe(0);
});

test('stratifier results should match', () => {
  const result = getCalculationResults(
    stratifierMeasureReport,
  );

  const EXPECTED_STRATIFIER_RESULT = [
    {
      name: 'stratifier-0',
      population: 'numerator',
      measureScore: 1,
    },
    {
      name: 'stratifier-1',
      population: 'denominator',
      measureScore: 0,
    },
  ];

  expect(result.measureReport).toEqual(stratifierMeasureReport);
  expect(result.population).toBe('numerator');
  expect(result.measureScore).toBe(1);
  expect(result.stratifiers).toEqual(EXPECTED_STRATIFIER_RESULT);
});
