const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const visibilitySchema = new Schema({
  deviceId: String,
  parentId: { type: Schema.Types.ObjectId, ref: 'Parent' },
  isHidden: { type: Boolean, default: false },
  hiddenAt: Date,
  history: [{
    action: { type: String, enum: ['hide', 'show'] },
    timestamp: { type: Date, default: Date.now },
    initiatedBy: { type: Schema.Types.ObjectId, ref: 'Parent' }
  }]
});

module.exports = mongoose.model('AppVisibility', visibilitySchema);
