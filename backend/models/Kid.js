const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const kidSchema = new Schema({
  parentId: { type: Schema.Types.ObjectId, ref: 'Parent', required: true },
  name: String,
  deviceId: { type: String, required: true, unique: true }, // unique device identifier
  age: Number,
  createdAt: { type: Date, default: Date.now },
  device: {
    model: String,
    os: String, // Android or iOS
    osVersion: String
  },
  monitoring: {
    screenTimeLimit: { type: Number, default: 120 }, // minutes per day
    isScreenTimeLimitEnabled: { type: Boolean, default: false },
    blockedWebsites: [{ type: String }],
    blockedApps: [{ type: String }],
    isAppHidden: { type: Boolean, default: false },
    locationEnabled: { type: Boolean, default: true },
    cameraEnabled: { type: Boolean, default: true },
    microphoneEnabled: { type: Boolean, default: true }
  }
});

module.exports = mongoose.model('Kid', kidSchema);
