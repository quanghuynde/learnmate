const mongoose = require('mongoose');

const knowledgeMapSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    documentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      }
    ],
    mapData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('KnowledgeMap', knowledgeMapSchema);
