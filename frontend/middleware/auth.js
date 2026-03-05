const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // authHeader
  console.log('🔐 Authorization header:', authHeader);
  console.log('🔐 Authenticating token:' , token);
  
  if (token == null) {
    console.log('❌ No token provided');
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  // Check if JWT_SECRET is configured
  if (!process.env.JWT_SECRET) {
    console.error('❌ CRITICAL: JWT_SECRET not configured in environment variables!');
    return res.status(500).json({ success: false, message: 'Server configuration error' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('❌ JWT verify error:', err.message);
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = user;
    console.log('✅ Authenticated user:', req.user.username || req.user.email);
    next();
  });
}

module.exports = authenticateToken;


