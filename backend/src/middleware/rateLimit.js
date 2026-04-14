//in-memory ratelimiter, no external dependencies
function createRateLimiter({ windowMs, maxRequests }) {
  // Map<ip, { count: number, windowStart: number }>
  const store = new Map();

  //periodically purge stale entries to avoid unbounded memory growth.
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of store.entries()) {
      if (now - record.windowStart >= windowMs) {
        store.delete(ip);
      }
    }
  }, windowMs);

  //allow the process to exit even if this interval is still running.
  if (cleanupInterval.unref) cleanupInterval.unref();

  return (req, res, next) => {
    // Prefer the real client IP, falling back to Express's req.ip.
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0].trim()) || req.ip || 'unknown';

    const now = Date.now();
    const record = store.get(ip);

    if (!record || now - record.windowStart >= windowMs) {
      //first request in this window, or previous window expired.
      store.set(ip, { count: 1, windowStart: now });
      return next();
    }

    record.count += 1;

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(429).json({
        message: 'Too many requests, please try again later',
      });
    }

    next();
  };
}

const apiRateLimit = createRateLimiter({ windowMs: 60_000, maxRequests: 100 });
const authRateLimit = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
module.exports = { apiRateLimit, authRateLimit };
