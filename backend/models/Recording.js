const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const recordingSchema = new Schema({
  parentId: { type: Schema.Types.ObjectId, ref: 'Parent' },
  kidDeviceId: String,
  type: { type: String, enum: ['video', 'audio'], required: true },
  s3Url: String,
  duration: Number,
  size: Number,
  createdAt: { type: Date, default: Date.now },
  startedAt: Date,
  endedAt: Date,
  notes: String,
  isDownloaded: { type: Boolean, default: false }
});

module.exports = mongoose.model('Recording', recordingSchema);
