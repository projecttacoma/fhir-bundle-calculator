all: setup-cqf-ruler setup-synthea generate-patients calculate-patients

setup-cqf-ruler: build-cqf-ruler clone-connectathon seed-cqf-ruler

build-cqf-ruler:
	docker run --name cqf-ruler --rm -dit -p 8080:8080 contentgroup/cqf-ruler

clone-connectathon:
	git clone https://github.com/DBCG/connectathon.git

seed-cqf-ruler:
	until `curl --output /dev/null --silent --head --fail http://localhost:8080/cqf-ruler-dstu3`; do printf '.'; sleep 5; done
	curl -X POST \
  http://localhost:8080/cqf-ruler-dstu3/fhir/Measure \
  -H 'Content-Type: application/json' \
	-d @EXM_130_bundle.json
	curl -X POST \
  http://localhost:8080/cqf-ruler-dstu3/fhir \
  -H 'Content-Type: application/json' \
	-d @connectathon/resources/fhir3/library/all-libraries-bundle.json
	curl -X POST \
  http://localhost:8080/cqf-ruler-dstu3/fhir \
  -H 'Content-Type: application/json' \
	-d @connectathon/resources/fhir3/valuesets/valuesets-bundle-exm130-FHIR.json

setup-synthea: clone-synthea patch-synthea

clone-synthea:
	git clone https://github.com/synthetichealth/synthea.git

patch-synthea:
	cp patch/synthea.properties ./synthea/src/main/resources/

PATIENT_COUNT := 10
generate-patients:
	cd synthea && ./run_synthea -a 51-51 -p $(PATIENT_COUNT) -m EXM130*

CQL_FILE := EXM130_FHIR3.cql
calculate-patients:
	calculate-bundles -d ./synthea/output/fhir_stu3 -c $(CQL_FILE) -u http://localhost:8080/cqf-ruler-dstu3/fhir

clean:
	docker stop cqf-ruler
	rm -rf synthea output connectathon
