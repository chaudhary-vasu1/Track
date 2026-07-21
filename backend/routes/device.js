const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const AppVisibility = require('../models/AppVisibility');
const Kid = require('../models/Kid');

// Hide App
router.post('/app/hide', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    let visibility = await AppVisibility.findOne({ deviceId });
    if (!visibility) {
      visibility = new AppVisibility({
        deviceId,
        parentId: req.parentId,
        isHidden: true,
        hiddenAt: new Date()
      });
    } else {
      visibility.isHidden = true;
      visibility.hiddenAt = new Date();
    }

    visibility.history.push({
      action: 'hide',
      timestamp: new Date(),
      initiatedBy: req.parentId
    });

    await visibility.save();

    // Update Kid settings block
    await Kid.findOneAndUpdate(
      { deviceId },
      { 'monitoring.isAppHidden': true }
    );

    res.json({
      status: 'hidden',
      hiddenAt: visibility.hiddenAt,
      message: 'App hidden successfully. Kid cannot find it.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Show App
router.post('/app/show', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    let visibility = await AppVisibility.findOne({ deviceId });
    if (!visibility) {
      visibility = new AppVisibility({
        deviceId,
        parentId: req.parentId,
        isHidden: false
      });
    } else {
      visibility.isHidden = false;
    }

    visibility.history.push({
      action: 'show',
      timestamp: new Date(),
      initiatedBy: req.parentId
    });

    await visibility.save();

    // Update Kid settings block
    await Kid.findOneAndUpdate(
      { deviceId },
      { 'monitoring.isAppHidden': false }
    );

    res.json({
      status: 'visible',
      shownAt: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get App Visibility status
router.get('/app/status', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.query;
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    const visibility = await AppVisibility.findOne({ deviceId });
    if (!visibility) {
      return res.json({
        isHidden: false,
        hiddenAt: null,
        visibilityHistory: []
      });
    }

    res.json({
      isHidden: visibility.isHidden,
      hiddenAt: visibility.hiddenAt,
      visibilityHistory: visibility.history
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get list of all registered kids for parent
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const kids = await Kid.find({ parentId: req.parentId });
    res.json({
      kids: kids.map(k => ({
        id: k._id,
        name: k.name,
        deviceId: k.deviceId,
        model: k.device ? k.device.model : 'Android Device',
        os: k.device ? k.device.os : 'Android',
        createdAt: k.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove registered device from parent account
router.delete('/:deviceId', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    // Find kid
    const kid = await Kid.findOne({ deviceId, parentId: req.parentId });
    if (!kid) {
      return res.status(404).json({ error: 'Device not found or not linked to this parent account' });
    }

    // Remove kid reference from parent's kids array
    const Parent = require('../models/Parent');
    await Parent.findByIdAndUpdate(req.parentId, {
      $pull: { kids: kid._id }
    });

    // Delete Kid record
    await Kid.deleteOne({ _id: kid._id });

    // Cleanup visibility records
    await AppVisibility.deleteMany({ deviceId });

    res.json({
      message: `Device "${kid.name}" (${deviceId}) removed successfully.`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
