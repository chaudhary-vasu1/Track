const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Alert = require('../models/Alert');

// Get Alerts for the logged-in parent
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { kidDeviceId, type, isRead, limit = 20, offset = 0 } = req.query;

    const query = { parentId: req.parentId };
    if (kidDeviceId) query.kidDeviceId = kidDeviceId;
    if (type) query.type = type;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit));

    const total = await Alert.countDocuments(query);
    const unreadCount = await Alert.countDocuments({ parentId: req.parentId, isRead: false });

    res.json({
      alerts: alerts.map(a => ({
        id: a._id,
        type: a.type,
        title: a.title,
        message: a.message,
        severity: a.severity,
        kidDeviceId: a.kidDeviceId,
        isRead: a.isRead,
        metadata: a.metadata,
        createdAt: a.createdAt
      })),
      total,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark alert as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, parentId: req.parentId },
      { isRead: true },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ success: true, alert: { id: alert._id, isRead: alert.isRead } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all alerts as read
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    const { kidDeviceId } = req.body;
    const query = { parentId: req.parentId, isRead: false };
    if (kidDeviceId) query.kidDeviceId = kidDeviceId;

    const result = await Alert.updateMany(query, { isRead: true });

    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dismiss / Delete alert
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const alert = await Alert.findOneAndDelete({
      _id: req.params.id,
      parentId: req.parentId
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ success: true, message: 'Alert dismissed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
