const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['Basic', 'Premium', 'Pro', 'Custom'],
  },
  credits: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Package', packageSchema);
