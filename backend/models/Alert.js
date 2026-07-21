const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const alertSchema = new Schema({
  parentId: { type: Schema.Types.ObjectId, ref: 'Parent', required: true },
  kidDeviceId: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'screen_time_exceeded',
      'website_blocked',
      'geofence_exit',
      'permission_change',
      'app_blocked',
      'device_offline',
      'surveillance_started'
    ],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  severity: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  isRead: { type: Boolean, default: false },
  metadata: { type: Schema.Types.Mixed }, // Extra context data (app name, URL, etc.)
  createdAt: { type: Date, default: Date.now }
});

// Index for fast parent-specific queries
alertSchema.index({ parentId: 1, createdAt: -1 });
alertSchema.index({ parentId: 1, isRead: 1 });

module.exports = mongoose.model('Alert', alertSchema);
