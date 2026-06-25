// uid from verified token; dev-only demo fallback
function getUserId(req) {
  const uid = req.user?.uid || req.user?.id;
  if (uid) return uid;
  if (process.env.NODE_ENV !== 'production') return 'current-user';
  return null;
}

function getUserIdOr401(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: 'Authentication required' });
    return null;
  }
  return userId;
}

module.exports = { getUserId, getUserIdOr401 };
