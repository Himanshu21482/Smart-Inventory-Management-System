const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT authentication token from the Authorization header.
 * Attaches decoded user payload (id, username, email, role) to req.user.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <TOKEN>

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication token is missing. Please log in.'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'supersecret_inventory_key_2026', (err, user) => {
    if (err) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session token. Please log in again.'
      });
    }
    req.user = user;
    next();
  });
}

/**
 * Middleware to restrict access to users with the 'ADMIN' role.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Admin access required for this action.'
    });
  }
  next();
}

module.exports = {
  authenticateToken,
  requireAdmin
};
