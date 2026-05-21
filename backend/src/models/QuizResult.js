const mongoose = require('mongoose');

const quizResultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
    },
    score: {
      type: Number,
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    percentage: {
      type: Number,
      required: true,
    },
    xpEarned: {
      type: Number,
      default: 0,
    },
    answers: [
      {
        questionIndex: Number,
        selectedAnswer: Number,
        essayAnswer: { type: String, default: '' },
        isCorrect: Boolean,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('QuizResult', quizResultSchema);
