# FHIR-bundle-calculator

![CI](https://img.shields.io/github/workflow/status/projecttacoma/fhir-bundle-calculator/Continuous%20Integration)

A CLI for outputting population statistics and MeasureReports for FHIR patients for a FHIR-based eCQM

# Usage

## Prerequisites

* [Node.js >=10.15.1](https://nodejs.org/en/)

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
-v, --version                          print the current version
-t, --type <type>                      type of calculation (choices: "http", "fqm", default: "fqm")
-d, --directory <input-directory>      path to directory of patient Bundles
-b, --measure-bundle <measure-bundle>  path to measure bundle; required when type is "fqm"
-m, --measure-id <measure-id>          measure ID to evaluate; required when type is "http"
-u, --url <url>                        base URL of running FHIR server; required when type is "http"
-s, --period-start <yyyy-mm-dd>        start of the calculation period (default: "2019-01-01")
-e, --period-end <yyyy-mm-dd>          end of the calculation period (default: "2019-12-31")
-h, --help                             display help for command
```

## Calculation with fqm-execution (default)

By default, `fhir-bundle-calculator` uses the [fqm-execution](https://github.com/projecttacoma/fqm-execution) library to calculate FHIR MeasureReports.

This library requires a Bundle be provided containing the FHIR Measure resource, any relevant FHIR Library resources, and any FHIR ValueSet resources needed for measure calculation. This is provided via the `-b/--measure-bundle` flag:

e.g.
``` bash
calculate-bundles -d /path/to/patient/bundles -b /path/to/measure/bundle
```

## Calculation with cqf-ruler

`fhir-bundle-calculator` can be used to communicate with any FHIR server that supports the [$evaluate-measure FHIR operation](https://www.hl7.org/fhir/operation-measure-evaluate-measure.html)

The `cqf-ruler` reference implementation is one such server. See their [usage instructions](https://github.com/DBCG/cqf-ruler#usage) or use a public sandbox to quickly get started.

Run the CLI wih output type `"http"`, and provide the ID of the FHIR Measure resourcea along with the URL of the server:

e.g.
``` bash
calculate-bundles -d /path/to/patient/bundles -t http -u http://localhost:8080/cqf-ruler-r4/fhir -m myMeasureID
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
