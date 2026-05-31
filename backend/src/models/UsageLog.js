const mongoose = require('mongoose');

const usageLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  feature: {
    type: String,
    required: true,
  },
  creditsUsed: {
    type: Number,
    required: true,
  },
  promptTokens: Number,
  completionTokens: Number,
  totalTokens: Number,
  status: {
    type: String,
    enum: ['success', 'error'],
    default: 'success'
  },
  errorMessage: String,
  metadata: Object, // Store any extra info (e.g., documentId)
}, { timestamps: true });

module.exports = mongoose.model('UsageLog', usageLogSchema);
