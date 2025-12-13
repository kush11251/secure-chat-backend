const jwt = require('jsonwebtoken');

const ACCESS_TTL = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_TTL = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function signAccessToken(user) {
  return jwt.sign({ id: user._id.toString(), uid: user.uid, email: user.email }, process.env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

function signRefreshToken(user) {
  return jwt.sign({ id: user._id.toString() }, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

function verifyAccessToken(token) { return jwt.verify(token, process.env.JWT_ACCESS_SECRET); }
function verifyRefreshToken(token) { return jwt.verify(token, process.env.JWT_REFRESH_SECRET); }

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
