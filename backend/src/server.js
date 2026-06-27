const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();
require('./instrument');
const express = require('express');
const cors = require('cors');

const authMiddleware = require('./middleware/auth');
const { bootstrapDatabase } = require('./db/bootstrap');
const errorHandler = require('./middleware/errorHandler');
const { initRateLimiters, apiRateLimit } = require('./middleware/rateLimit');
const arcjetMiddleware = require('./middleware/arcjet');

const app = express();
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

app.use(arcjetMiddleware);
app.use(apiRateLimit);
app.use(authMiddleware);

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'makerspace-api', database: 'postgres' }));

app.use('/api', require('./routes/feed'));
app.use('/api', require('./routes/profile'));
app.use('/api', require('./routes/projects'));
app.use('/api', require('./routes/tasks'));
app.use('/api', require('./routes/teams'));
app.use('/api', require('./routes/messages'));
app.use('/api', require('./routes/notifications'));
app.use('/api', require('./routes/recruit'));
app.use('/api', require('./routes/investors'));
app.use('/api', require('./routes/users'));
app.use('/api', require('./routes/history'));

app.use(errorHandler);

async function startServer() {
  await initRateLimiters();
  await bootstrapDatabase();

  app.listen(port, host, () => {
    console.log(`makerspace-api running on http://${host}:${port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start makerspace-api', error);
  process.exit(1);
});
