const { sequelize } = require('../models');
const { logger } = require('./logger');

async function waitForDb({ retries = 30, delayMs = 2000 } = {}) {
  let lastErr;
  for (let i = 0; i < retries; i += 1) {
    try {
      await sequelize.authenticate();
      return;
    } catch (err) {
      lastErr = err;
      logger.warn('db_not_ready', { attempt: i + 1, message: err?.message });
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

module.exports = { waitForDb };
