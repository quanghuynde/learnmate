const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      default: '',
    },
    duration: {
      type: Number, // phút
      required: true,
    },
    type: {
      type: String,
      enum: ['reading', 'quiz', 'review', 'video', 'other'],
      default: 'reading',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    timeOfDay: {
      type: String,
      enum: ['morning', 'afternoon', 'evening'],
      default: 'morning',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudySession', studySessionSchema);
