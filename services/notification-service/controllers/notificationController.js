const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const PushDevice = require('../models/PushDevice');
const { dispatch } = require('../services/dispatchService');

exports.internalSend = async (req, res) => {
  try {
    const result = await dispatch(req.body);
    res.status(200).json({ message: 'Queued', ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.listMine = async (req, res) => {
  try {
    const uid = req.user?.id || req.user?._id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    const [items, total, unread] = await Promise.all([
      Notification.find({ userId: String(uid) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId: String(uid) }),
      Notification.countDocuments({ userId: String(uid), readAt: null }),
    ]);

    res.json({
      notifications: items,
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      unreadCount: unread,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    const uid = String(req.user?.id || req.user?._id);
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: uid },
      { readAt: new Date() },
      { new: true },
    );
    if (!n) return res.status(404).json({ error: 'Not found' });
    res.json({ notification: n });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    const uid = String(req.user?.id || req.user?._id);
    await Notification.updateMany({ userId: uid, readAt: null }, { readAt: new Date() });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPreferences = async (req, res) => {
  try {
    const uid = String(req.user?.id || req.user?._id);
    let p = await NotificationPreference.findOne({ userId: uid });
    if (!p) p = await NotificationPreference.create({ userId: uid });
    res.json({ preferences: p });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.putPreferences = async (req, res) => {
  try {
    const uid = String(req.user?.id || req.user?._id);
    const allowed = ['email', 'push', 'orderUpdates', 'paymentAlerts', 'deliveryAlerts', 'marketing'];
    const update = {};
    for (const k of allowed) {
      if (typeof req.body[k] === 'boolean') update[k] = req.body[k];
    }
    const p = await NotificationPreference.findOneAndUpdate(
      { userId: uid },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    res.json({ preferences: p });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.registerDevice = async (req, res) => {
  try {
    const uid = String(req.user?.id || req.user?._id);
    const { token, platform, userAgent } = req.body;
    if (!token) return res.status(400).json({ error: 'token required' });
    await PushDevice.findOneAndUpdate(
      { userId: uid, token },
      { userId: uid, token, platform: platform || 'web', userAgent: userAgent || '' },
      { upsert: true },
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.unregisterDevice = async (req, res) => {
  try {
    const uid = String(req.user?.id || req.user?._id);
    const { token } = req.body;
    await PushDevice.deleteMany({ userId: uid, token });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
