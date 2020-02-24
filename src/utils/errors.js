const { logger } = require('./logger');

exports.handleHttpError = (err) => {
  if (err.response) {
    logger.debug('Got response from server, but bad status code');
    logger.error(`${err.message}: ${JSON.stringify(err.response.data)}`);
  } else {
    logger.debug('Got no response from server');
    logger.error(err.message);
  }
  process.exit(1);
};
