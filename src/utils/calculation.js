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

// Get the return type and return value for relevant cql definitions
const getValueAndType = (results) => ({
  value: results.find((p) => p.name === 'value'),
  valueType: results.find((p) => p.name === 'resultType'),
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
    const { value, valueType } = getValueAndType(r.resource.parameter);
    const populationIdentifier = r.resource.id.toLowerCase().replace(/\s/g, '_');

    if (value) {
      if (valueType.valueString === 'Boolean') {
        // NOTE: using === 'true' to get a boolean value from the returned string
        result[populationIdentifier] = value.valueString === 'true';
      } else if (valueType.valueString === 'List') {
        // For a List return type in episode of care measures, we want a non-zero
        // amount of episodes for this patient
        const isEmptyPopulation = value.valueString === '[]';
        const numEpisodes = isEmptyPopulation ? 0 : value.resource.entry.length;
        result[populationIdentifier] = numEpisodes > 0;

        // Add a column for number of episodes in the population for episode of care measures
        if (!result.counts) {
          result.counts = {};
        }
        result.counts[`${populationIdentifier}_episodes`] = numEpisodes;
      }
    } else {
      // If no value for a given population, we have an error
      const error = r.resource.parameter.find((p) => p.name === 'error');
      result.error = `Error: ${error.valueString}`;
    }
  });

  return result;
};

module.exports = {
  calculate,
};
