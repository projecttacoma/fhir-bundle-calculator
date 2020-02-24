const { loggers, format, transports } = require('winston');

const fileTransport = new transports.File({ filename: 'cql-response.log' });

if (!loggers.has('cli')) {
  loggers.add('cli', {
    level: process.env.DEBUG ? 'debug' : 'info',
    format: format.cli(),
    transports: [
      new transports.Console(),
    ],
  });
}

if (!loggers.has('file')) {
  loggers.add('file', {
    level: process.env.DEBUG ? 'debug' : 'info',
    format: format.json(),
    transports: [
      fileTransport,
    ],
  });
}

module.exports = {
  logger: loggers.get('cli'),
  fileLogger: loggers.get('file'),
};
