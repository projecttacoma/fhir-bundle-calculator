# Steps to recreate patients.

The makefile contained in this directory contains automated ways of recreating
these patients. It assumes you have `docker`, `curl`, and `calculate-bundles` (from
this repository) installed and configured already

To recreate the generation, run `make`. Optionally pass in the number of
patients you wish to create to override the default of 10 patients:
```
make PATIENT_COUNT=20
```

Refer to the Makefile for individual
steps if you need to repeat a particular one one-at-a-time. This will put the
results in the ./output/ directory

The `patients` directory contains FHIR STU3 bundles of sample patients for
EXM124, placed in the directory of the population they are in for CQL
calculation.  Note that for EXM124, Denominator is equal to Initial Population,
so there are no patients in the Initial Population but not the Denominator.

The `patch` directory contains modifications to `synthea` that were made in
order to accomodate this measure.
