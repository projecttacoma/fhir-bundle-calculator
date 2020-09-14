const {
  getPopulationCount, getMeasureScore, getStratifiers, getStratifierName, getMeasureObservation, getSDEs,
} = require('../src/utils/fhirpath');
const ipopMeasureReport = require('./fixtures/ipop-measure-report.json');
const stratifierMeasureReport = require('./fixtures/stratifier-measure-report.json');
const cvMeasureReport = require('./fixtures/measurereport-strat1-EXM111-expectedresults.json');

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

test('Returns measure observation', () => {
  expect(getMeasureObservation(cvMeasureReport)).toEqual('33 min');
});

test('Returns null measure observation', () => {
  expect(getMeasureObservation(stratifierMeasureReport)).toBe(null);
});

test('Returns list of SDEs', () => {
  expect(getSDEs(cvMeasureReport)).toEqual([
    {
      code: '2106-3',
      display: 'White',
      name: 'sde-race',
      system: 'urn:oid:2.16.840.1.113883.6.238',
    },
    {
      system: 'urn:oid:2.16.840.1.113883.6.238',
      code: '2186-5',
      name: 'sde-ethnicity',
      display: 'Not Hispanic or Latino',
    },
    {
      code: 'F',
      name: 'sde-sex',

    },
  ]);
});

test('Returns null when no SDEs', () => {
  expect(getSDEs(stratifierMeasureReport)).toBe(null);
});
