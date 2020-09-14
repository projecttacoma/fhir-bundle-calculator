const fhirpath = require('fhirpath');

exports.getPopulationCount = (group, population) => {
  const path = fhirpath.compile(`population.where(code.coding.code = '${population}')`);
  const result = path(group);

  if (!!result && result[0] !== undefined) {
    return result[0].count;
  }
  return null;
};

exports.getMeasureScore = (group) => fhirpath.evaluate(group, 'measureScore.value')[0];

exports.getStratifiers = (mr) => {
  const results = fhirpath.evaluate(mr, 'MeasureReport.group.first().stratifier.where(stratum)');
  return (results && results.length > 0) ? results : null;
};

exports.getStratifierName = (strat) => fhirpath.evaluate(strat, 'code.coding.code')[0] || null;

exports.getMeasureObservation = (mr) => {
  const path = fhirpath.compile(`MeasureReport.contained.where(resourceType = 'Observation'
    and extension.url = 'http://hl7.org/fhir/StructureDefinition/cqf-measureInfo'
    and extension.extension.exists(url = 'populationId' and valueString = 'MeasureObservation'))`);
  const results = path(mr);
  if (results && results.length > 0) {
    return `${results[0].valueQuantity.value} ${results[0].valueQuantity.code}`;
  }
  return null;
};

exports.getSDEs = (mr) => {
  const path = fhirpath.compile(`MeasureReport.contained.where(resourceType = 'Observation'
    and extension.url = 'http://hl7.org/fhir/StructureDefinition/cqf-measureInfo'
    and extension.extension.exists(url = 'populationId'))`);
  const results = path(mr);

  if (results && results.length > 0) {
    return results.filter((obs) => obs.code.text.startsWith('sde-')).map((obs) => {
      const code = fhirpath.evaluate(obs, 'Observation.valueCodeableConcept.coding')[0];
      return {
        name: obs.code.text,
        ...code,
      };
    });
  }
  return null;
};
