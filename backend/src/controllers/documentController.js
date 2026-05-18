const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');

// @desc    Lay danh sach tai lieu cua user
// @route   GET /api/documents
const getDocuments = async (req, res) => {
  try {
    const docs = await Document.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ count: docs.length, documents: docs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Tai len tai lieu moi
// @route   POST /api/documents
const createDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui long chon file de tai len' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const typeMap = { '.pdf': 'pdf', '.docx': 'docx', '.pptx': 'pptx' };
    const type = typeMap[ext];

    if (!type) {
      return res.status(400).json({ message: 'Dinh dang file khong duoc ho tro' });
    }

    const doc = await Document.create({
      user: req.user.id,
      name: req.file.originalname,
      type,
      pages: 0,
      fileUrl: `/uploads/documents/${req.file.filename}`,
      fileSize: req.file.size,
      status: 'processing',
    });

    // Mo phong xu ly AI (thuc te se dung queue)
    setTimeout(async () => {
      await Document.findByIdAndUpdate(doc._id, {
        status: 'processed',
        relevance: 'Quan trong',
      });
    }, 5000);

    res.status(201).json({ message: 'Tai len thanh cong', document: doc });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Lay chi tiet tai lieu
// @route   GET /api/documents/:id
const getDocument = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, user: req.user.id });
    if (!doc) {
      return res.status(404).json({ message: 'Khong tim thay tai lieu' });
    }
    res.json({ document: doc });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Xoa tai lieu
// @route   DELETE /api/documents/:id
const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!doc) {
      return res.status(404).json({ message: 'Khong tim thay tai lieu' });
    }

    if (doc.fileUrl) {
      const filePath = path.join(__dirname, '../../', doc.fileUrl.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({ message: 'Da xoa tai lieu' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDocuments, createDocument, getDocument, deleteDocument };
