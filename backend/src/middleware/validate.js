//input validation 
function requireFields(...fields) {
  return (req, res, next) => {
    const missing = fields.filter((field) => {
      const value = req.body?.[field];
      return value === undefined || value === null || String(value).trim() === '';
    });

    if (missing.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missing.join(', ')}`,
      });
    }

    next();
  };
}

//middlewar rejects 401 requests
function requireAuth(req, res, next) {
  if (!req.user) {
    const hasBearer = /^Bearer\s+\S+/i.test(req.headers.authorization || '');
    return res.status(401).json({
      message: hasBearer ? 'Invalid or expired token' : 'Authentication required',
      code: hasBearer ? 'INVALID_TOKEN' : 'AUTH_REQUIRED',
    });
  }
  next();
}

module.exports = { requireFields, requireAuth };
