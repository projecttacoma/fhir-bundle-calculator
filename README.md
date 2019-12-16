# FHIR-bundle-calculator

[![Build Status](https://travis-ci.com/projecttacoma/fhir-bundle-calculator.svg?branch=master)](https://travis-ci.com/projecttacoma/fhir-bundle-calculator)

A CLI for outputting population statistics for FHIR patients and executing CQL from an eCQM using the `$cql` operation of the [cqf-ruler](https://github.com/DBCG/cqf-ruler) HAPI FHIR server

# Usage

## Prerequisites

* [Node.js](https://nodejs.org/en/)
* A running `cqf-ruler` server. See their [usage instructions](https://github.com/DBCG/cqf-ruler#usage) or use a public sandbox

## Installation with NPM

``` bash
npm install -g fhir-bundle-calculator
```

Usage:

``` bash
calculate-bundles [--options]
```

Available options:

```
Usage: calculate-bundles -d /path/to/bundles -c /path/to/cql/file -u http://<cqf-ruler-base-url> [-s yyyy-mm-dd -e yyyy-mm-dd]

Options:
  -d --directory <input-directory>  Path to directory of Synthea Bundles
  -c --cql <cql-file>               Path to cql file to be used for calculation
  -u --url <url>                    Base URL of running cqf-ruler instance
  -s --period-start <yyyy-mm-dd>    Start of the calculation period (default: "2019-01-01")
  -e --period-end <yyyy-mm-dd>      End of the calculation period (default: "2019-12-31")
  -h, --help
```

## Local Usage

You can run the CLI from source:

1) `git clone https://github.com/projecttacoma/fhir-bundle-calculator`
2) `cd fhir-bundle-calculator`
3) `npm install`

This will pull the source code and install the necessary dependencies. You can run the CLI with the following command:

``` bash
node src/cli.js [--options]
```

Available options:

```
Usage: cli -d /path/to/bundles -c /path/to/cql/file -u http://<cqf-ruler-base-url> [-s yyyy-mm-dd -e yyyy-mm-dd]

Options:
  -d --directory <input-directory>  Path to directory of Synthea Bundles
  -c --cql <cql-file>               Path to cql file to be used for calculation
  -u --url <url>                    Base URL of running cqf-ruler instance
  -s --period-start <yyyy-mm-dd>    Start of the calculation period (default: "2019-01-01")
  -e --period-end <yyyy-mm-dd>      End of the calculation period (default: "2019-12-31")
  -h, --help                        output usage information
```

## Output

The CLI will create a directory called `output`, and inside this directory will be a subdirectory with a timestamp containing the results. Including:

* A file `results.csv` of the following format:

``` csv
"bundle","initial_population","numerator","denominator","error"
"<bundle-name>",<true or false>,<true or false>,<true or false>,an error message if an error happened
```

* Subdirectories for each population, containing the bundles that fell into those populations. **NOTE**: This will not duplicate bundles. E.g. if a patient falls into the numerator, they will only appear in that directory since it is a subset of the other two. Similar reasoning applies to a patient falling into the denominator as it is a subset of the IPOP.

```
output
├── results-YYYY-MM-DD-THHmmss
│   ├── denominator
│   │   ├── a-patient-bundle.json
│   │   └── ...
│   ├── ipop
│   │   ├── a-patient-bundle.json
│   │   └── ...
│   ├── numerator
│   │   ├── a-patient.bundle.json
│   │   └── ...
│   ├── errors
│   │   ├── a-patient.bundle.json
│   │   └── ...
│   └── results.csv
└──
```

### Epsiode of Care Measures

The cli will be able to detect if the provided CQL represents an Episode of Care measure by inspecting the return types for the various populations. Populations with a return type of `List` will be treated as Episode of Care, as they will contain a FHIR bundle with the relevant resources.

In this case, the above output is mostly the same, but columns will be added that correspond to the number of episodes that fell into the relevant populations for the patient bundle in question, as well as a list of IDs for the episode:

``` csv
"bundle","initial_population","numerator","denominator","initial_population_episodes","initial_population_episodeIds","denominator_episodes","denominator_episodeIds","numerator_episodes","numerator_episodeIds","error"
"<bundle-name>",<true or false>,<true or false>,<true or false>,<count>,<list>,<count>,<list>,<count>,<list>,an error message if an error happened
```

## Unit Testing

This library is configured with [jest](https://jestjs.io/) to make assertions about calculation under a controlled environment. It uses [nock](https://github.com/nock/nock) to mock HTTP responses for the `$cql` operation for unit testing.

To run the tests, simply run the command `npm test`
