const mongoose = require('mongoose');

const creditTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ['add', 'deduct'],
    required: true,
  },
  description: String,
  feature: String, // e.g., 'summarize', 'quiz'
  referenceId: {
    type: mongoose.Schema.Types.ObjectId, // Link to Payment or UsageLog
    refPath: 'referenceModel'
  },
  referenceModel: {
    type: String,
    enum: ['Payment', 'UsageLog']
  }
}, { timestamps: true });

module.exports = mongoose.model('CreditTransaction', creditTransactionSchema);
