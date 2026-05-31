const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { YoutubeTranscript } = require('youtube-transcript');
const Document = require('../models/Document');
const { validateAndDeduct } = require('../services/creditService');
const { addDocumentToQueue } = require('../services/queueService');

// @desc    Lay danh sach tai lieu cua user
const getDocuments = async (req, res) => {
  try {
    const docs = await Document.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ count: docs.length, documents: docs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function trích xuất text từ file
const extractText = async (filePath, type) => {
  try {
    console.log(`Starting extraction: ${filePath}, type: ${type}`);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found at: ${filePath}`);
      return '';
    }

    const dataBuffer = fs.readFileSync(filePath);
    console.log(`File read successfully. Buffer size: ${dataBuffer.length} bytes`);

    if (type === 'pdf') {
      const data = await pdf(dataBuffer);
      console.log(`PDF parsed. Text length: ${data.text?.length || 0}`);
      return data.text;
    } else if (type === 'docx') {
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      console.log(`Docx parsed. Text length: ${result.value?.length || 0}`);
      return result.value;
    } else {
      // Fallback: Thử đọc dưới dạng text UTF-8 cho mọi loại file khác (.txt, .md, .js, .csv, v.v.)
      const text = dataBuffer.toString('utf8').trim();
      console.log(`Read as generic text. Length: ${text.length}`);
      
      // Kiểm tra nếu là URL (giữ nguyên logic cũ cho txt/web)
      if (text.startsWith('http://') || text.startsWith('https://')) {
        try {
          if (text.includes('youtube.com') || text.includes('youtu.be')) {
            const transcript = await YoutubeTranscript.fetchTranscript(text);
            return transcript.map(t => t.text).join(' ');
          } else {
            // Web thông thường
            const { data } = await axios.get(text, {
               headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' }
            });
            const $ = cheerio.load(data);
            $('script, style, noscript, nav, footer, iframe').remove();
            return $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000);
          }
        } catch (scrapeError) {
          console.error('Lỗi khi scrape URL:', scrapeError.message);
          return text;
        }
      }
      return text;
    }

  } catch (error) {
    console.error('Lỗi trích xuất text:', error);
    return '';
  }
};

// @desc    Tai len tai lieu moi (Async with BullMQ)
const createDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn file để tải lên' });
    }

    // Step 1: Check and deduct credit (Cost: 10)
    try {
      await validateAndDeduct(req.user.id, 10, 'Upload Document');
    } catch (err) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(402).json({ message: err.message });
    }

    const originalNameUtf8 = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(originalNameUtf8).toLowerCase();
    const type = ext ? ext.replace('.', '') : 'unknown';

    // Create document record entry
    const doc = await Document.create({
      user: req.user.id,
      name: originalNameUtf8,
      type,
      pages: 0,
      fileUrl: `/uploads/documents/${req.file.filename}`,
      fileSize: req.file.size,
      status: 'processing', // Bắt đầu ở trạng thái đang xử lý
    });

    const filePath = path.join(__dirname, '../../', doc.fileUrl.replace(/^\//, ''));

    // Step 2: OFF-LOAD TO BACKGROUND QUEUE
    try {
      await addDocumentToQueue(doc._id, filePath, type);
    } catch (queueErr) {
      console.error('Queue add error, falling back to sync:', queueErr);
      // Fallback (optional) or just let it stay in "processing"
    }

    res.status(201).json({ 
      message: 'Tải lên thành công. Hệ thống đang trích xuất nội dung trong nền.', 
      document: doc 
    });
  } catch (error) {
    console.error('Create Document Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Lay chi tiết tai lieu
const getDocument = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, user: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy tài liệu' });
    res.json({ document: doc });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Xoa tai lieu
const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy tài liệu' });

    if (doc.fileUrl) {
      const filePath = path.join(__dirname, '../../', doc.fileUrl.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({ message: 'Đã xóa tài liệu' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDocuments, createDocument, getDocument, deleteDocument, extractText };
