const app = require('express')();
// const stratifierMeasureReport = require('./test/fixtures/stratifier-measure-report.json');
const exm111MeasureReport = require('./test/fixtures/measurereport-strat1-EXM111-expectedresults.json');

app.get('/Measure/:measureId/evaluate-measure', (req, res) => {
  // res.json(stratifierMeasureReport);
  res.json(exm111MeasureReport);
});

app.listen(3001);
