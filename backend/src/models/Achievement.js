const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: '🏆',
    },
    category: {
      type: String,
      enum: ['quiz', 'study', 'streak', 'subject', 'level', 'special'],
      required: true,
    },
    subject: {
      type: String,
      default: '',
    },
    requirement: {
      type: {
        type: String,
        enum: ['quiz_count', 'quiz_accuracy', 'study_hours', 'streak_days', 'xp_total', 'subject_mastery'],
        required: true,
      },
      value: {
        type: Number,
        required: true,
      },
    },
    rarity: {
      type: String,
      enum: ['common', 'rare', 'epic', 'legendary'],
      default: 'common',
    },
    xpReward: {
      type: Number,
      default: 100,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Achievement', achievementSchema);
