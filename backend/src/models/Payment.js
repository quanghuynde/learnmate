const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    default: 'PayOS',
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  transactionCode: String,
  memo: String,
  orderCode: {
    type: Number,
    unique: true,
    sparse: true
  },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
