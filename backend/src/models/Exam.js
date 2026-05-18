const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Tên kỳ thi là bắt buộc'],
    },
    subject: {
      type: String,
      default: '',
    },
    examDate: {
      type: Date,
      required: [true, 'Ngày thi là bắt buộc'],
    },
    readinessScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    topicsMastered: {
      type: Number,
      default: 0,
    },
    totalTopics: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Exam', examSchema);
