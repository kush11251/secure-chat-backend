const axios = require('axios');
const User = require('../models/User');

async function sendFCM(tokens, notification = {}, data = {}) {
  const serverKey = process.env.FCM_SERVER_KEY || process.env.FIREBASE_SERVER_KEY;
  if (!serverKey || !tokens?.length) return { skipped: true };
  try {
    const payload = {
      registration_ids: tokens,
      notification,
      data,
      priority: 'high',
    };
    const res = await axios.post('https://fcm.googleapis.com/fcm/send', payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${serverKey}`,
      },
      timeout: 5000,
    });
    return res.data;
  } catch (e) {
    console.error('FCM error', e?.response?.data || e.message);
    return { error: true };
  }
}

async function notifyUsers(userIds, title, body, data = {}) {
  try {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    const users = await User.find({ _id: { $in: ids } }).select('notificationsToken');
    const tokens = users.map(u => u.notificationsToken).filter(Boolean);
    if (!tokens.length) return { skipped: true };
    return await sendFCM(tokens, { title, body }, data);
  } catch (e) {
    console.error('notifyUsers error', e.message);
    return { error: true };
  }
}

module.exports = { notifyUsers };
