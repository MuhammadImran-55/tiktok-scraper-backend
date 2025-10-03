require('dotenv').config();
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const moment = require('moment-timezone');
const { testLogin } = require('./scraper');

const CRON = process.env.CRON_EXPR || '*/30 * * * *';
const TZ = process.env.TIMEZONE || 'Europe/Berlin';
const RUNS_FILE = path.resolve(__dirname, '..', 'runs.json');


async function job() {
  logger.info('🚀 Running TikTok login test...');
  await testLogin();
}

async function main() {
  logger.info({ CRON }, 'Scheduler starting');
  await job(); // run immediately

  cron.schedule(CRON, () => {
    job().catch(err => logger.error({ err: err.stack }, 'Job failed'));
  }, { timezone: TZ });
}

main().catch(err => {
  logger.error({ err: err.stack }, 'Fatal error on startup');
  process.exit(1);
});
