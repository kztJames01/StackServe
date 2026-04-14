const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authMiddleware = require('./middleware/auth');
const { bootstrapDatabase } = require('./db/bootstrap');
const errorHandler = require('./middleware/errorHandler');
const { apiRateLimit } = require('./middleware/rateLimit');

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

app.use(apiRateLimit);
app.use(authMiddleware);

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'makerspace-api', database: 'postgres' }));

// Routes
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

//error handler
app.use(errorHandler);

async function startServer() {
  await bootstrapDatabase();

  app.listen(port, () => {
    console.log(`makerspace-api running on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start makerspace-api', error);
  process.exit(1);
});
