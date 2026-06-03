const mongoose = require('mongoose');

const knowledgeMapNodeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    color: { type: String, default: 'bg-slate-200' },
    size: { type: String, default: 'w-32 h-32' },
  },
  { _id: false }
);

const knowledgeMapEdgeSchema = new mongoose.Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
  },
  { _id: false }
);

const knowledgeMapSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    documentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true,
      },
    ],
    nodes: [knowledgeMapNodeSchema],
    connections: [knowledgeMapEdgeSchema],
    crossLinks: [knowledgeMapEdgeSchema],
    aiInsight: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('KnowledgeMap', knowledgeMapSchema);