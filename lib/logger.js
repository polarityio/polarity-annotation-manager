const winston = require('winston');

const logger = null;

function getLogger(level = 'info') {
  if (logger !== null) {
    return logger;
  }

  return winston.createLogger({
    level,
    format: winston.format.json(),
    defaultMeta: { service: 'polarity-annotation-manager' },
    transports: [new winston.transports.Console()]
  });
}

module.exports = {
  getLogger
};
