const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Tên tài liệu là bắt buộc'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['pdf', 'docx', 'pptx', 'txt', 'web', 'text'],
      required: true,
    },
    pages: {
      type: Number,
      default: 0,
    },
    fileUrl: {
      type: String,
      default: '',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['uploading', 'processing', 'processed', 'error'],
      default: 'uploading',
    },
    relevance: {
      type: String,
      default: 'Đang phân tích',
    },
    topics: [String],
    content: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
