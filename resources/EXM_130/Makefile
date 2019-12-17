all: info .setup-cqf-ruler synthea generate-patients calculate-patients

info:
	$(info `make` will cache the cqf-ruler, connectathon, and synythea setups, but repeat patient generation and calculation.)
	$(info To repeat all steps, do `make clean; make`)

.setup-cqf-ruler: .cqf-ruler connectathon .seed-cqf-ruler
	touch .setup-cqf-ruler

.cqf-ruler:
	docker run --name cqf-ruler --rm -dit -p 8080:8080 contentgroup/cqf-ruler
	touch .cqf-ruler

connectathon:
	$(info connectathon checks out a specific commit SHA in case filepaths are updated)
	git clone --depth=1 https://github.com/DBCG/connectathon.git
	cd connectathon

.seed-cqf-ruler:
	until `curl --output /dev/null --silent --head --fail http://localhost:8080/cqf-ruler-r4`; do printf '.'; sleep 5; done
	curl -X POST \
  http://localhost:8080/cqf-ruler-r4/fhir/ \
  -H 'Content-Type: application/json' \
	-d @connectathon/fhir4/bundles/EXM130_FHIR4-7.2.000/EXM130_FHIR4-7.2.000-files/library-deps-EXM130_FHIR4-7.2.000-bundle.json
	curl -X POST \
  http://localhost:8080/cqf-ruler-r4/fhir/ \
  -H 'Content-Type: application/json' \
	-d @connectathon/fhir4/bundles/EXM130_FHIR4-7.2.000/EXM130_FHIR4-7.2.000-bundle.json
	curl -X POST \
  http://localhost:8080/cqf-ruler-r4/fhir/ \
  -H 'Content-Type: application/json' \
	-d @connectathon/fhir4/bundles/EXM130_FHIR4-7.2.000/EXM130_FHIR4-7.2.000-files/valuesets-EXM130_FHIR4-7.2.000-bundle.json

synthea:
	git clone --single-branch --branch abacus_r4 --depth=1 https://github.com/projecttacoma/synthea.git

PATIENT_COUNT := 10
generate-patients:
	cd synthea && ./run_synthea -a 51-51 -p $(PATIENT_COUNT) -m EXM130*

CQL_FILE := EXM130_FHIR4.cql
calculate-patients:
	calculate-bundles -d ./synthea/output/fhir -c $(CQL_FILE) -u http://localhost:8080/cqf-ruler-r4/fhir

clean:
	-docker stop cqf-ruler
	-rm -rf synthea output connectathon .cqf-ruler .seed-cqf-ruler .generate-patients .calculate-patients .setup-cqf-ruler

.PHONY: all clean info
