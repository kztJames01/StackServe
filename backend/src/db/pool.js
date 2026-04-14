const { Pool } = require('pg');

function buildConnectionString() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.PGHOST || 'localhost';
  const port = process.env.PGPORT || '5432';
  const database = process.env.PGDATABASE || 'makerspace';
  const user = process.env.PGUSER || 'makerspace';
  const password = process.env.PGPASSWORD || 'makerspace';

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

const pool = new Pool({
  connectionString: buildConnectionString(),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = {
  pool,
  query,
};
