all: info .setup-cqf-ruler synthea generate-patients calculate-patients

info:
	$(info `make` will cache the cqf-ruler, connectathon, and synythea setups, but repeat patient generation and calculation.)
	$(info To repeat all steps, do `make clean; make`)

.setup-cqf-ruler: .cqf-ruler connectathon .seed-cqf-ruler
	touch .setup-cqf-ruler

.cqf-ruler:
	# docker run --name cqf-ruler --rm -dit -p 8080:8080 contentgroup/cqf-ruler
	touch .cqf-ruler

connectathon:
	git clone --depth=1 https://github.com/DBCG/connectathon.git
	cd connectathon

.seed-cqf-ruler:
	until `curl --output /dev/null --silent --head --fail http://localhost:8080/cqf-ruler-r4`; do printf '.'; sleep 5; done
	curl -X POST \
  http://localhost:8080/cqf-ruler-r4/fhir/ \
  -H 'Content-Type: application/json' \
	-d @EXM125_FHIR4-7.2.000-bundle.json

synthea:
	git clone --single-branch --branch abacus_r4 --depth=1 https://github.com/projecttacoma/synthea.git

PATIENT_COUNT := 10
generate-patients:
	cd synthea && ./run_synthea -a 52-52 -g F -p $(PATIENT_COUNT) -m EXM125*

CQL_FILE := EXM125_FHIR4-7.2.000.cql
calculate-patients:
	calculate-bundles -d ./synthea/output/fhir -c $(CQL_FILE) -u http://localhost:8080/cqf-ruler-r4/fhir -s "2019-01-01" -e "2019-12-31"

clean:
	-rm -rf synthea output connectathon .cqf-ruler .seed-cqf-ruler .generate-patients .calculate-patients .setup-cqf-ruler

.PHONY: all clean info
.SECONDARY: main-build
