function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      if (req.path.startsWith('/api/')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      return res.status(403).render('error', {
        title: 'Forbidden',
        message: 'You do not have permission to access this page.',
        user: req.user,
      });
    }
    next();
  };
}

module.exports = { requireRole };
