const { getEntityById } = require('../db/repository');

const PLAN_RANK = { free: 0, agency: 1, pro: 1, studio: 2 };
const FREE_SEAT_LIMIT = 3;

async function getPlan(userId) {
  const user = await getEntityById('users', userId);
  return user?.billing?.plan || 'free';
}

// blocks unless the user's plan is at least `minPlan`
function requirePlan(minPlan) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.uid || req.user?.id || 'current-user';
      const plan = await getPlan(userId);
      if ((PLAN_RANK[plan] || 0) < (PLAN_RANK[minPlan] || 0)) {
        return res.status(403).json({ message: `This feature requires the ${minPlan} plan`, plan });
      }
      req.plan = plan;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requirePlan, getPlan, FREE_SEAT_LIMIT };
