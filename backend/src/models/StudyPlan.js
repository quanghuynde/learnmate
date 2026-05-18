const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  time: { type: String, required: true },
  duration: { type: String, required: true },
  type: {
    type: String,
    enum: ['Đọc tài liệu', 'Thực hành', 'Ôn tập', 'Xem video', 'Khác'],
    default: 'Đọc tài liệu',
  },
  status: {
    type: String,
    enum: ['todo', 'doing', 'done'],
    default: 'todo',
  },
});

const studyPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      required: [true, 'Tên môn học là bắt buộc'],
    },
    examDate: {
      type: Date,
    },
    intensity: {
      type: String,
      enum: ['light', 'moderate', 'intense'],
      default: 'moderate',
    },
    weakTopics: [String],
    weeklyGoals: [
      {
        text: String,
        completed: { type: Boolean, default: false },
      },
    ],
    tasks: [taskSchema],
    date: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudyPlan', studyPlanSchema);
