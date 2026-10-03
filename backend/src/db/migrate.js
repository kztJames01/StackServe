const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(728419)');
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    const dir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir).filter((file) => file.endsWith('.sql')).sort();
    for (const file of files) {
      const existing = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
      if (existing.rows.length > 0) continue;
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      console.log(`[migrate] applying ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(728419)');
    client.release();
  }
}

module.exports = { runMigrations };
