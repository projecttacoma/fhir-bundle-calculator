const { loggers, format, transports } = require('winston');

const LOGGER_NAME = 'cli';
const logFormat = format.printf(({ level, message, timestamp }) => (`${timestamp} [${level}]: ${message}`));

if (!loggers.has(LOGGER_NAME)) {
  loggers.add(LOGGER_NAME, {
    level: process.env.DEBUG ? 'debug' : 'info',
    format: format.combine(
      format.colorize(),
      format.timestamp({ format: 'HH:mm:ss.SS' }),
      format.align(),
      logFormat,
    ),
    transports: [
      new transports.Console({
        silent: process.env.NODE_ENV === 'test',
      }),
    ],
  });
}

module.exports = {
  logger: loggers.get(LOGGER_NAME),
};
