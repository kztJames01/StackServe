const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();
require('./instrument');
const http = require('http');
const express = require('express');
const cors = require('cors');

const authMiddleware = require('./middleware/auth');
const { bootstrapDatabase } = require('./db/bootstrap');
const errorHandler = require('./middleware/errorHandler');
const { initRateLimiters, apiRateLimit } = require('./middleware/rateLimit');
const arcjetMiddleware = require('./middleware/arcjet');
const { initSocket } = require('./realtime/socket');
const { billingRouter, billingWebhookHandler } = require('./routes/billing');
const storageRoutes = require('./routes/storage');

const app = express();
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), billingWebhookHandler);
app.use(express.json());

app.use(arcjetMiddleware);
app.use(apiRateLimit);
app.use(authMiddleware);

app.get('/api/health', (_req, res) => {
  const { getAuthMode } = require('./middleware/auth');
  res.json({
    ok: true,
    service: 'makerspace-api',
    database: 'postgres',
    auth: getAuthMode(),
  });
});

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
app.use('/api', require('./routes/verification'));
app.use('/api', require('./routes/history'));
app.use('/api', billingRouter);
app.use('/api', storageRoutes);

app.use(errorHandler);

async function startServer() {
  await initRateLimiters();
  await bootstrapDatabase();

  const httpServer = http.createServer(app);
  const io = initSocket(httpServer);
  app.set('io', io);

  httpServer.listen(port, host, () => {
    console.log(`makerspace-api running on http://${host}:${port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start makerspace-api', error);
  process.exit(1);
});
