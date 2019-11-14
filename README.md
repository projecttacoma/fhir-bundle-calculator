# FHIR-bundle-calculator

A CLI for outputting population statistics for FHIR patients and executing CQL from an eCQM using the `$cql` operation of the [cqf-ruler](https://github.com/DBCG/cqf-ruler) HAPI FHIR server

# Usage

## Prerequisites

* [Node.js](https://nodejs.org/en/)
* A running `cqf-ruler` server. See their [usage instructions](https://github.com/DBCG/cqf-ruler#usage) or use a public sandbox

## Installation with NPM

Coming soon

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
"bundle","initial_population","numerator","denominator"
"<bundle-name>",<true or false>,<true or false>,<true or false>
```

* Subdirectories for each population, containing the bundles that fell into those populations:

```
output
├── results-YYYY-MM-DD-THHmmss
│   ├── denominator
│   │   ├── a-patient-bundle.json
│   │   └── ...
│   ├── ipp
│   │   ├── a-patient-bundle.json
│   │   └── ...
│   ├── numerator
│   │   ├── a-patient.bundle.json
│   │   └── ...
│   └── results.csv
└──
```

## Unit Testing

This library is configured with [jest](https://jestjs.io/) to make assertions about calculation under a controlled environment. It uses [nock](https://github.com/nock/nock) to mock HTTP responses for the `$cql` operation for unit testing.

To run the tests, simply run the command `npm test`
