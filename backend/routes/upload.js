const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');
const Recording = require('../models/Recording');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'public', 'recordings');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype.includes('video') ? '.webm' : '.webm');
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'video/webm', 'video/mp4', 'video/x-matroska',
      'audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/wav',
      'application/octet-stream' // fallback for some browsers
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  }
});

// Upload a recording file
router.post('/recording', authMiddleware, upload.single('recording'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No recording file provided' });
    }

    const { kidDeviceId, type, duration, startedAt, endedAt } = req.body;
    const recordingType = type || (req.file.mimetype.includes('video') ? 'video' : 'audio');

    // Create recording document in MongoDB
    const recording = new Recording({
      parentId: req.parentId,
      kidDeviceId: kidDeviceId || 'unknown',
      type: recordingType,
      s3Url: `/recordings/${req.file.filename}`,
      duration: Number(duration) || 0,
      size: req.file.size,
      startedAt: startedAt ? new Date(startedAt) : new Date(Date.now() - (Number(duration) || 0) * 1000),
      endedAt: endedAt ? new Date(endedAt) : new Date()
    });

    await recording.save();

    res.status(201).json({
      success: true,
      recording: {
        id: recording._id,
        type: recording.type,
        url: recording.s3Url,
        duration: recording.duration,
        size: recording.size,
        createdAt: recording.createdAt
      }
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Upload recording from mobile device (binary blob via POST body)
router.post('/recording/blob', authMiddleware, async (req, res) => {
  try {
    const { kidDeviceId, type, duration, base64Data } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: 'No recording data provided' });
    }

    const recordingType = type || 'video';
    const ext = recordingType === 'video' ? '.webm' : '.webm';
    const filename = `${uuidv4()}${ext}`;
    const filePath = path.join(uploadDir, filename);

    // Decode base64 and write to file
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    const recording = new Recording({
      parentId: req.parentId,
      kidDeviceId: kidDeviceId || 'unknown',
      type: recordingType,
      s3Url: `/recordings/${filename}`,
      duration: Number(duration) || 0,
      size: buffer.length,
      startedAt: new Date(Date.now() - (Number(duration) || 0) * 1000),
      endedAt: new Date()
    });

    await recording.save();

    res.status(201).json({
      success: true,
      recording: {
        id: recording._id,
        url: recording.s3Url,
        duration: recording.duration,
        size: recording.size
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
