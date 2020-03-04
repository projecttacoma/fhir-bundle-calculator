# FHIR-bundle-calculator

[![Build Status](https://travis-ci.com/projecttacoma/fhir-bundle-calculator.svg?branch=master)](https://travis-ci.com/projecttacoma/fhir-bundle-calculator)

A CLI for outputting population statistics and MeasureReports for FHIR patients for an eCQM using the `$evaluate-measure` operation of the [cqf-ruler](https://github.com/DBCG/cqf-ruler) HAPI FHIR server

# Usage

## Prerequisites

* [Node.js >=10.15.1](https://nodejs.org/en/)
* A running `cqf-ruler` server. See their [usage instructions](https://github.com/DBCG/cqf-ruler#usage) or use a public sandbox

## Installation with NPM

``` bash
npm install -g fhir-bundle-calculator
```

Installation can be verified with the `--version` flag:

```bash
calculate-bundles --version
X.Y.Z
```

Usage:

``` bash
calculate-bundles [--options]
```

Available options:

```
Usage: calculate-bundles -d /path/to/bundles -u http://<cqf-ruler-base-url> -m <measure-id> [-s yyyy-mm-dd -e yyyy-mm-dd]

Options:
  -v, --version                      print the current version
  -d, --directory <input-directory>  path to directory of Synthea Bundles
  -m, --measure-id <measure-id>      measure ID to evaluate
  -u, --url <url>                    base URL of running cqf-ruler instance (default: "http://localhost:8080/cqf-ruler-r4/fhir")
  -s, --period-start <yyyy-mm-dd>    start of the calculation period (default: "2019-01-01")
  -e, --period-end <yyyy-mm-dd>      end of the calculation period (default: "2019-12-31")
  -h, --help                         output usage information
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

Options are the same as above.

## Output

The CLI will create a directory called `output`, and inside this directory will be a subdirectory with a timestamp containing the results. Including:

* A file `results.csv` of the following format:

``` csv
"bundle","population"
"<bundle-name>","<numerator|denominator|ipop|none>"
```

* Subdirectories for each population, containing the bundles that fell into those populations. **NOTE**: This will not duplicate bundles. E.g. if a patient falls into the numerator, they will only appear in that directory since it is a subset of the other two. Similar reasoning applies to a patient falling into the denominator as it is a subset of the IPOP.
* Indivual MeasureReports that were returned by the server after each `$evaluate-measure` call

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
│   │   ├── a-patient-bundle.json
│   │   └── ...
│   ├── none
│   │   ├── a-patient-bundle.json
│   │   └── ...
│   ├── measure-reports
│   │   ├── a-measure-report.json
│   │   └── ...
│   └── results.csv
└──
```

## Debugging

Some initial logging is done for the CLI, but more verbose logging can be done by setting `DEBUG=true` in the environment. 

Example:
``` bash
DEBUG=true calculate-bundles [--options]
```

## Unit Testing

This library is configured with [jest](https://jestjs.io/) to make assertions about calculation under a controlled environment. It uses [nock](https://github.com/nock/nock) to mock HTTP responses for the `$cql` operation for unit testing.

To run the tests, simply run the command `npm test`
