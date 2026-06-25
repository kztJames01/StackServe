import arcjet, { detectBot, shield, slidingWindow } from '@arcjet/next';

const key = process.env.ARCJET_KEY;
const mode =
  process.env.ARCJET_MODE ||
  (process.env.NODE_ENV === 'production' ? 'LIVE' : 'DRY_RUN');

const aj = key
  ? arcjet({
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
          max: 100,
        }),
      ],
    })
  : null;

export default aj;
