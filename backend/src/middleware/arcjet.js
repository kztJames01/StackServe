const arcjetPkg = require('@arcjet/node');
const { shield, detectBot, slidingWindow } = require('@arcjet/node');
const arcjet = arcjetPkg.default || arcjetPkg;

const key = process.env.ARCJET_KEY;
const mode = process.env.ARCJET_MODE || (process.env.NODE_ENV === 'production' ? 'LIVE' : 'DRY_RUN');

let aj = null;

if (key) {
  aj = arcjet({
    key,
    rules: [
      shield({ mode }),
      detectBot({
        mode,
        allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW'],
      }),
      slidingWindow({
        mode,
        interval: '1m',
        max: 120,
      }),
    ],
  });
}

async function arcjetMiddleware(req, res, next) {
  if (!aj) return next();

  try {
    const decision = await aj.protect(req);
    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return res.status(429).json({ message: 'Too many requests' });
      }
      return res.status(403).json({ message: 'Forbidden' });
    }
    return next();
  } catch (err) {
    console.error('[arcjet]', err.message);
    return next();
  }
}

module.exports = arcjetMiddleware;
