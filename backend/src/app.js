require('dotenv').config();

const cors = require('cors');
const express = require('express');
const helmet = require('helmet');

const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');
const { waitForDb } = require('./utils/waitForDb');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: false,
  })
);
app.use(express.json({ limit: '1mb' }));

app.use('/api', routes);

app.use(errorHandler);

async function main() {
  await waitForDb({ retries: 40, delayMs: 2000 });

  const port = Number(process.env.PORT || 8000);
  app.listen(port, () => {
    logger.info('server_started', { port });
  });
}

main().catch((err) => {
  logger.error('server_boot_failed', { message: err?.message, stack: err?.stack });
  process.exit(1);
});
