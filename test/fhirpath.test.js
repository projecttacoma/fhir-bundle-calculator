const { getPopulationCount } = require('../src/utils/fhirpath');
const ipopMeasureReport = require('./fixtures/ipop-measure-report.json');

test('Nonzero population that exists should return the right count', async () => {
  expect(getPopulationCount(ipopMeasureReport, 'initial-population')).toEqual(1);
});

test('Zero population that exists should return the right count', async () => {
  expect(getPopulationCount(ipopMeasureReport, 'numerator')).toEqual(0);
});

test('Nonexistent population should return null', async () => {
  expect(getPopulationCount(ipopMeasureReport, 'measure-observation')).toEqual(null);
});
