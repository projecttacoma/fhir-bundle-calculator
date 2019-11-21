const fs = require("fs");
const path = require('path');
const FormData = require('form-data');
const http = require('http');
const multiparty = require('multiparty');
const os = require('os');

const translateCQLFiles = (cqlFiles) => {
  return new Promise((resolve, reject) => {
    let form = new FormData()
    cqlFiles.forEach(cqlFile => {
      form.append('file', fs.createReadStream(cqlFile))
    });
    
    let transRequest = http.request('http://localhost:8080/cql/translator', {
      method: 'post',
      headers: {
        'Accept': 'multipart/form-data',
        'X-TargetFormat': 'application/elm+xml',
        'Content-Type': form.getHeaders()['content-type']
      }
    })

    transRequest.on('response', (response) => {
      let elmXMLs = []
      if (response.statusCode == 200) {
        let incomingForm = new multiparty.Form();
        incomingForm.parse(response, (err, fields, files) => {
          resolve(fields.file)
        });
      } else {
        reject(response.statusCode)
      }
    });
    transRequest.on('error', (reason) => {
      reject(reason)
    })

    // pipe multipart from to the request
    form.pipe(transRequest)
  });
};

module.exports = {
  translateCQLFiles,
}