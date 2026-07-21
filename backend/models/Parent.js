const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const parentSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // bcrypt hashed
  name: String,
  phone: String,
  createdAt: { type: Date, default: Date.now },
  kids: [{ type: Schema.Types.ObjectId, ref: 'Kid' }],
  settings: {
    emailAlerts: { type: Boolean, default: true },
    pushAlerts: { type: Boolean, default: true },
    recordByDefault: { type: Boolean, default: false }
  }
});

module.exports = mongoose.model('Parent', parentSchema);
