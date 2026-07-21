const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const activitySchema = new Schema({
  kidDeviceId: String,
  type: { type: String, enum: ['app_open', 'app_close', 'website_blocked', 'screen_time', 'location_update'] },
  appName: String,
  website: String,
  screenTimeMinutes: Number,
  latitude: Number,
  longitude: Number,
  timestamp: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now, expires: 7776000 } // 90 days TTL
});

module.exports = mongoose.model('ActivityLog', activitySchema);
