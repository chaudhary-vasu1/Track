const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Parent = require('../models/Parent');
const Kid = require('../models/Kid');
const env = require('../config/env');

// Parent Signup
router.post('/parent/signup', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existingParent = await Parent.findOne({ email });
    if (existingParent) {
      return res.status(400).json({ error: 'Parent with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const parent = new Parent({
      email,
      password: hashedPassword,
      name,
      phone
    });

    await parent.save();

    const token = jwt.sign({ parentId: parent._id }, env.jwtSecret, { expiresIn: '7d' });

    res.status(201).json({
      token,
      parentId: parent._id,
      message: 'Parent registered successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Parent Login
router.post('/parent/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const parent = await Parent.findOne({ email }).populate('kids');
    if (!parent) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, parent.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ parentId: parent._id }, env.jwtSecret, { expiresIn: '7d' });

    res.json({
      token,
      parentId: parent._id,
      kids: parent.kids.map(k => ({ id: k._id, name: k.name, deviceId: k.deviceId }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Kid Device Registration
router.post('/kid/register', async (req, res) => {
  try {
    const { parentId, deviceId, name, age, model, os, osVersion } = req.body;
    if (!parentId || !deviceId) {
      return res.status(400).json({ error: 'Parent ID and Device ID are required' });
    }

    // Check parent exists
    const parent = await Parent.findById(parentId);
    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    // Find or create kid profile
    let kid = await Kid.findOne({ deviceId });
    if (kid) {
      kid.name = name || kid.name;
      kid.age = age || kid.age;
      kid.device = {
        model: model || kid.device.model,
        os: os || kid.device.os,
        osVersion: osVersion || kid.device.osVersion
      };
      await kid.save();
    } else {
      kid = new Kid({
        parentId,
        name: name || 'Child Device',
        deviceId,
        age: age || 10,
        device: {
          model: model || 'Unknown Model',
          os: os || 'Android',
          osVersion: osVersion || '13.0'
        }
      });
      await kid.save();

      // Add to parent kids list
      parent.kids.push(kid._id);
      await parent.save();
    }

    res.json({
      kidId: kid._id,
      message: 'Kid device registered. App will hide after permissions.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
