const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/token');
const { generateUniqueUID } = require('../utils/generateUserID');
const { emitToUsers } = require('../config/websocket');

const SALT_ROUNDS = 10;

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });
    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) return res.status(409).json({ message: 'Email already registered' });
    const uid = await generateUniqueUID(User);
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ uid, name, email: String(email).toLowerCase(), password: passwordHash, status: 'online', lastSeen: new Date() });
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    res.status(201).json({ user: { id: user._id, uid: user.uid, name: user.name, email: user.email, avatarUrl: user.avatarUrl, status: user.status }, tokens: { accessToken, refreshToken } });
  } catch (err) {
    console.error('register error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    await User.findByIdAndUpdate(user._id, { status: 'online', lastSeen: new Date() });
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    res.json({ user: { id: user._id, uid: user.uid, name: user.name, email: user.email, avatarUrl: user.avatarUrl, status: 'online' }, tokens: { accessToken, refreshToken } });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.refresh = async (req, res) => {
  try {
    const token = req.body?.refreshToken || req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ message: 'Missing refresh token' });
    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'Invalid refresh token' });
    const accessToken = signAccessToken(user);
    res.json({ accessToken });
  } catch (err) {
    console.error('refresh error', err);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

exports.logout = async (req, res) => {
  try {
    if (req.user?.id) {
      const me = await User.findByIdAndUpdate(
        req.user.id,
        { status: 'offline', lastSeen: new Date() },
        { new: true }
      ).select('contacts');
      try {
        const contacts = (me?.contacts || []).map(String);
        emitToUsers(contacts, 'user:offline', { userId: req.user.id });
      } catch (e) {
        console.error('logout presence emit error', e.message);
      }
    }
    res.json({ message: 'Logged out' });
  } catch {
    res.json({ message: 'Logged out' });
  }
};
