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
	git clone --single-branch --branch master https://github.com/DBCG/connectathon.git

.seed-cqf-ruler:
	until `curl --output /dev/null --silent --head --fail http://localhost:8080/cqf-ruler-dstu3`; do printf '.'; sleep 5; done
	curl -X POST \
  http://localhost:8080/cqf-ruler-dstu3/fhir/Measure \
  -H 'Content-Type: application/json' \
	-d @connectathon/resources/fhir3/measure/measure-exm124-FHIR.json
	curl -X POST \
  http://localhost:8080/cqf-ruler-dstu3/fhir \
  -H 'Content-Type: application/json' \
	-d @connectathon/resources/fhir3/library/all-libraries-bundle.json
	curl -X POST \
  http://localhost:8080/cqf-ruler-dstu3/fhir \
  -H 'Content-Type: application/json' \
	-d @connectathon/resources/fhir3/valuesets/valuesets-bundle-exm124-FHIR.json
	touch .seed-cqf-ruler

synthea:
	git clone --single-branch --branch abacus https://github.com/projecttacoma/synthea.git

PATIENT_COUNT := 10
generate-patients:
	cd synthea && ./run_synthea -a 51-74 -g F -p $(PATIENT_COUNT) -m breast_cancer_exm124*

CQL_FILE := EXM124_FHIR3-7.2.000.cql
calculate-patients:
	calculate-bundles -d ./synthea/output/fhir_stu3 -c $(CQL_FILE) -u http://localhost:8080/cqf-ruler-dstu3/fhir -s "2018-01-01" -e "2018-12-31"

clean:
	-docker stop cqf-ruler
	-rm -rf synthea output connectathon .cqf-ruler .seed-cqf-ruler .generate-patients .calculate-patients .setup-cqf-ruler

.PHONY: all clean info
.SECONDARY: main-build
