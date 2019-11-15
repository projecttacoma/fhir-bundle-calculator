const axios = require('axios');
const _ = require('lodash');

// Assembles the payload for the $cql operation supported by cqf-ruler
const buildParameters = (cql, patientId, periodStart, periodEnd) => ({
  resourceType: 'Parameters',
  parameter: [{
    name: 'code',
    valueString: cql,
  }, {
    name: 'patientId',
    valueString: patientId,
  }, {
    name: 'periodStart',
    valueString: periodStart,
  }, {
    name: 'periodEnd',
    valueString: periodEnd,
  }, {
    name: 'context',
    valueString: 'context',
  }],
});

/**
 * Use the $cql operation to process calculation results
 *
 * @param {string} url base url of the running cqf-ruler instance
 * @param {string} cql a stringingied version of the cql code to be used for execution
 * @param {string} patientId id of the patient resource on the server to calculate against
 * @param {string} periodStart yyyy-mm-dd for the start of the calculation period
 * @param {string} periodEnd yyyy-mm-dd for the end of the calculation period
 *
 * @returns {object} {
 *   initial_population: true|false|null,
 *   numerator: true|false|null,
 *   denominator: true|false|null,
 *   error: an error message if an error was encountered
 * }
 */
const calculate = async (url, cql, patientId, periodStart, periodEnd) => {
  const parameters = buildParameters(cql, patientId, periodStart, periodEnd);
  const response = await axios.post(`${url}/$cql`, parameters);

  // Get results for only the definitions that we care about
  const definitions = ['Initial Population', 'Numerator', 'Denominator', 'Error'];
  const relevantResults = response.data.entry.filter((e) => _.includes(definitions, e.resource.id));

  // Populations will be remain null if an error occurs
  const result = {
    initial_population: null,
    numerator: null,
    denominator: null,
  };

  relevantResults.forEach((r) => {
    // Only grab the value that the definition returns
    const value = r.resource.parameter.find((p) => p.name === 'value');
    const populationIdentifier = r.resource.id.toLowerCase().replace(/\s/g, '_');

    // NOTE: using === 'true' to get a boolean value from the string that is returned from cqf-ruler
    if (value) result[populationIdentifier] = value.valueString === 'true';
    // If no value for a given population, we have an error
    else {
      const error = r.resource.parameter.find((p) => p.name === 'error');
      result.error = `Error: ${error.valueString}`;
    }
  });

  return result;
};

module.exports = {
  calculate,
};
