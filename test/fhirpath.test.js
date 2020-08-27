const {
  getPopulationCount, getMeasureScore, getStratifiers, getStratifierName,
} = require('../src/utils/fhirpath');
const ipopMeasureReport = require('./fixtures/ipop-measure-report.json');
const stratifierMeasureReport = require('./fixtures/stratifier-measure-report.json');

const ipopGroup = ipopMeasureReport.group[0];

test('Nonzero population that exists should return the right count', () => {
  expect(getPopulationCount(ipopGroup, 'initial-population')).toEqual(1);
});

test('Zero population that exists should return the right count', () => {
  expect(getPopulationCount(ipopGroup, 'numerator')).toEqual(0);
});

test('Nonexistent population should return null', () => {
  expect(getPopulationCount(ipopGroup, 'measure-observation')).toEqual(null);
});

test('Returns correct measure score', () => {
  expect(getMeasureScore(ipopGroup)).toEqual(0);
});

test('Returns stratifiers', () => {
  const stratifiers = stratifierMeasureReport.group[0].stratifier;
  expect(getStratifiers(stratifierMeasureReport)).toEqual(stratifiers);
});

test('Returns stratifier name', () => {
  const stratifiers = stratifierMeasureReport.group[0].stratifier;
  expect(getStratifierName(stratifiers[0])).toEqual('stratifier-0');
  expect(getStratifierName(stratifiers[1])).toEqual('stratifier-1');
});
