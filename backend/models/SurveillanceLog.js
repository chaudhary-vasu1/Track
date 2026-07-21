const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const surveillanceSchema = new Schema({
  parentId: { type: Schema.Types.ObjectId, ref: 'Parent' },
  kidDeviceId: String,
  type: { type: String, enum: ['camera', 'microphone'], required: true },
  startedAt: Date,
  endedAt: Date,
  duration: Number, // seconds
  recordingUrl: String, // S3 URL if recorded
  screenshotUrls: [String],
  status: { type: String, enum: ['active', 'completed'], default: 'completed' },
  isRecorded: { type: Boolean, default: false },
  encryptionKey: String,
  ipAddress: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SurveillanceLog', surveillanceSchema);
