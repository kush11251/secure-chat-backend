const { verifyAccessToken } = require('../utils/token');

module.exports = function verifyToken(req, res, next) {
  try {
    const header = req.headers['authorization'];
    let token;
    if (header && header.startsWith('Bearer ')) token = header.substring(7);
    else if (req.cookies?.accessToken) token = req.cookies.accessToken;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    const payload = verifyAccessToken(token);
    req.user = { id: payload.id, uid: payload.uid, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
