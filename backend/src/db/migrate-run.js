require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
require('dotenv').config();
const { runMigrations } = require('./migrate');

runMigrations()
  .then(() => {
    console.log('[migrate] done');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[migrate] failed', err);
    process.exit(1);
  });
