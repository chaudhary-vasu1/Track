const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const SurveillanceLog = require('../models/SurveillanceLog');
const Recording = require('../models/Recording');
const { uploadRecordingToS3 } = require('../services/recording.service');
const { v4: uuidv4 } = require('uuid');

// Start Camera Stream
router.post('/camera/start', authMiddleware, async (req, res) => {
  try {
    const { kidDeviceId } = req.body;
    if (!kidDeviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    const streamId = `stream_${uuidv4()}`;
    res.json({
      status: 'starting',
      streamId,
      signalingUrl: `${process.env.BACKEND_URL || 'https://localhost:8443'}/signal`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop Camera Stream
router.post('/camera/stop', authMiddleware, async (req, res) => {
  try {
    const { kidDeviceId, duration } = req.body;
    res.json({
      status: 'stopped',
      duration: duration || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Camera Video Recording
router.post('/camera/record/start', authMiddleware, async (req, res) => {
  try {
    const { kidDeviceId } = req.body;
    const recordingId = `rec_${uuidv4()}`;
    res.json({
      recordingId,
      status: 'recording'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop Camera Video Recording
router.post('/camera/record/stop', authMiddleware, async (req, res) => {
  try {
    const { recordingId, kidDeviceId, duration, s3Url, base64Data } = req.body;

    // Use real recording service for storage
    let recordingUrl = s3Url || null;
    if (base64Data) {
      const buffer = Buffer.from(base64Data, 'base64');
      recordingUrl = await uploadRecordingToS3(buffer, recordingId || uuidv4(), 'video');
    } else if (!recordingUrl) {
      // Fallback: create empty placeholder
      recordingUrl = await uploadRecordingToS3(
        Buffer.from('placeholder video recording'),
        recordingId || uuidv4(),
        'video'
      );
    }
    
    // Save to Database
    const recording = new Recording({
      parentId: req.parentId,
      kidDeviceId,
      type: 'video',
      s3Url: recordingUrl,
      duration: duration || 0,
      size: base64Data ? Buffer.from(base64Data, 'base64').length : 0,
      createdAt: new Date(),
      startedAt: new Date(Date.now() - (duration || 0) * 1000),
      endedAt: new Date()
    });
    await recording.save();

    res.json({
      status: 'saved',
      s3Url: recording.s3Url,
      duration: recording.duration,
      recordingId: recording._id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Mic Stream
router.post('/mic/start', authMiddleware, async (req, res) => {
  try {
    const { kidDeviceId } = req.body;
    const streamId = `audio_stream_${uuidv4()}`;
    res.json({
      status: 'starting',
      streamId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Mic Recording
router.post('/mic/record/start', authMiddleware, async (req, res) => {
  try {
    const { kidDeviceId } = req.body;
    const recordingId = `audio_rec_${uuidv4()}`;
    res.json({
      recordingId,
      status: 'recording'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Surveillance Logs/History
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { kidDeviceId, type, limit = 10, offset = 0 } = req.query;
    
    // Fetch combined recordings/history from MongoDB
    const query = { parentId: req.parentId };
    if (kidDeviceId) query.kidDeviceId = kidDeviceId;
    if (type) query.type = type;

    const sessions = await Recording.find(query)
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit));

    const total = await Recording.countDocuments(query);

    res.json({
      sessions: sessions.map(s => ({
        id: s._id,
        type: s.type === 'video' ? 'camera' : 'microphone',
        startedAt: s.startedAt || s.createdAt,
        endedAt: s.endedAt || s.createdAt,
        duration: s.duration,
        isRecorded: true,
        recordingUrl: s.s3Url
      })),
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
