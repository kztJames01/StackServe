const { RateLimiterMemory, RateLimiterRedis } = require('rate-limiter-flexible');
const { createClient } = require('redis');

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim()) || req.ip || 'unknown';
}

function buildLimiterMiddleware(limiter) {
  return async (req, res, next) => {
    const ip = getClientIp(req);
    try {
      await limiter.consume(ip);
      next();
    } catch (rej) {
      if (rej instanceof Error) return next(rej);
      res.setHeader('Retry-After', String(Math.ceil((rej.msBeforeNext || 60000) / 1000)));
      return res.status(429).json({ message: 'Too many requests, please try again later' });
    }
  };
}

function buildMemoryLimiter({ windowMs, maxRequests, keyPrefix }) {
  const limiter = new RateLimiterMemory({
    keyPrefix: keyPrefix || 'rl',
    points: maxRequests,
    duration: Math.ceil(windowMs / 1000),
  });
  return buildLimiterMiddleware(limiter);
}

async function buildRedisLimiter({ windowMs, maxRequests, keyPrefix, redisUrl }) {
  const client = createClient({ url: redisUrl });
  client.on('error', (err) => console.error('[redis]', err.message));
  await client.connect();

  const limiter = new RateLimiterRedis({
    storeClient: client,
    keyPrefix,
    points: maxRequests,
    duration: Math.ceil(windowMs / 1000),
  });
  return buildLimiterMiddleware(limiter);
}

let apiRateLimit = buildMemoryLimiter({ windowMs: 60_000, maxRequests: 100, keyPrefix: 'rl:api' });
let authRateLimit = buildMemoryLimiter({ windowMs: 60_000, maxRequests: 10, keyPrefix: 'rl:auth' });

async function initRateLimiters() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log('[ratelimit] using in-memory store (set REDIS_URL for redis)');
    return;
  }

  try {
    apiRateLimit = await buildRedisLimiter({
      redisUrl,
      windowMs: 60_000,
      maxRequests: Number(process.env.RATE_LIMIT_API_MAX || 100),
      keyPrefix: 'rl:api',
    });
    authRateLimit = await buildRedisLimiter({
      redisUrl,
      windowMs: 60_000,
      maxRequests: Number(process.env.RATE_LIMIT_AUTH_MAX || 10),
      keyPrefix: 'rl:auth',
    });
    console.log('[ratelimit] redis-backed limiters ready');
  } catch (err) {
    console.error('[ratelimit] redis failed, keeping memory limiters:', err.message);
  }
}

module.exports = { initRateLimiters, apiRateLimit: (req, res, next) => apiRateLimit(req, res, next), authRateLimit: (req, res, next) => authRateLimit(req, res, next) };
