const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const ActivityLog = require('../models/ActivityLog');
const Kid = require('../models/Kid');

// Get Activity Logs
router.get('/activity', authMiddleware, async (req, res) => {
  try {
    const { kidDeviceId, limit = 50 } = req.query;
    if (!kidDeviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    const activities = await ActivityLog.find({ kidDeviceId })
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    res.json({ activities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Screen Time Statistics
router.get('/screen-time', authMiddleware, async (req, res) => {
  try {
    const { kidDeviceId, date } = req.query;
    if (!kidDeviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    const queryDate = date ? new Date(date) : new Date();
    
    // Find kid to check limit
    const kid = await Kid.findOne({ deviceId: kidDeviceId });
    const limit = kid ? kid.monitoring.screenTimeLimit : 120;

    // Fetch activities for that day
    const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

    const logs = await ActivityLog.find({
      kidDeviceId,
      type: 'app_open',
      timestamp: { $gte: startOfDay, $lte: endOfDay }
    });

    // Mock/Aggregate screen time breakdown
    const breakdown = {};
    let totalMinutes = 0;

    // Build standard breakdown
    logs.forEach(log => {
      const app = log.appName || 'Unknown';
      // Simulate random usage minutes per app for demonstration, or use recorded values
      const usage = log.screenTimeMinutes || Math.floor(Math.random() * 25) + 5;
      breakdown[app] = (breakdown[app] || 0) + usage;
      totalMinutes += usage;
    });

    // Seed defaults if no entries
    if (Object.keys(breakdown).length === 0) {
      breakdown['TikTok'] = 45;
      breakdown['YouTube'] = 60;
      breakdown['Instagram'] = 30;
      breakdown['WhatsApp'] = 15;
      totalMinutes = 150;
    }

    res.json({
      date: date || new Date().toISOString().split('T')[0],
      totalMinutes,
      limit,
      exceeded: totalMinutes > limit,
      breakdown
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Location Data
router.get('/location', authMiddleware, async (req, res) => {
  try {
    const { kidDeviceId } = req.query;
    if (!kidDeviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    const locations = await ActivityLog.find({
      kidDeviceId,
      type: 'location_update'
    }).sort({ timestamp: -1 }).limit(20);

    let currentLocation = null;
    if (locations.length > 0) {
      const latest = locations[0];
      currentLocation = {
        latitude: latest.latitude,
        longitude: latest.longitude,
        address: 'Delhi, India', // Static/Mock address
        accuracy: 10,
        timestamp: latest.timestamp
      };
    } else {
      // Default placeholder location if no GPS entries exist
      currentLocation = {
        latitude: 28.7041,
        longitude: 77.1025,
        address: 'Delhi Central, India',
        accuracy: 12,
        timestamp: new Date()
      };
    }

    res.json({
      currentLocation,
      historicalLocations: locations.map(l => ({
        latitude: l.latitude,
        longitude: l.longitude,
        timestamp: l.timestamp
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST endpoint for devices to upload telemetry activity
router.post('/log', async (req, res) => {
  try {
    const { kidDeviceId, type, appName, website, screenTimeMinutes, latitude, longitude } = req.body;
    if (!kidDeviceId || !type) {
      return res.status(400).json({ error: 'Device ID and log type are required' });
    }

    const log = new ActivityLog({
      kidDeviceId,
      type,
      appName,
      website,
      screenTimeMinutes,
      latitude,
      longitude,
      timestamp: new Date()
    });

    await log.save();
    res.status(201).json({ success: true, message: 'Activity logged successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
