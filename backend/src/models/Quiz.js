const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [String],
  correctIndex: { type: Number, required: true },
  explanation: { type: String, default: '' },
});

const quizSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    title: { type: String, required: true },
    subject: { type: String, default: '' },
    format: {
      type: String,
      enum: ['Trắc nghiệm', 'Đúng/Sai', 'Tự luận'],
      default: 'Trắc nghiệm',
    },
    questions: [questionSchema],
    totalQuestions: { type: Number, default: 5 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Quiz', quizSchema);
