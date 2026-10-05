// extract workspace_id from param or header, verify membership, attach to req
const { getMemberRole } = require('../services/workspace');

// use as: tenantScope(req.params.id or req.body.workspaceId)
function tenantScope(getWorkspaceId) {
  return async (req, res, next) => {
    const workspaceId = typeof getWorkspaceId === 'function'
      ? getWorkspaceId(req)
      : req.params[getWorkspaceId] || req.body?.[getWorkspaceId] || req.query[getWorkspaceId];

    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });
    if (!req.user?.uid) return res.status(401).json({ message: 'Authentication required' });

    const role = await getMemberRole(workspaceId, req.user.uid);
    if (!role) return res.status(403).json({ message: 'You are not a member of this workspace' });

    req.workspaceId = workspaceId;
    req.workspaceRole = role;
    next();
  };
}

// check if caller has one of the allowed roles (use after tenantScope)
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.workspaceRole)) {
      return res.status(403).json({ message: `Required role: ${allowedRoles.join(' or ')}` });
    }
    next();
  };
}

module.exports = { tenantScope, requireRole };
