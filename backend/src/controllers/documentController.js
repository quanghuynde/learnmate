const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const textract = require('textract');
const officeparser = require('officeparser');
const Document = require('../models/Document');
const { validateAndDeduct } = require('../services/creditService');

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
  const start = performance.now();
  try {
    const docType = type.toLowerCase();
    console.log(`[BG] Starting extraction: ${filePath}, type: ${docType}`);
    
    if (!fs.existsSync(filePath)) {
      console.error(`[BG] File not found at: ${filePath}`);
      return '';
    }

    let text = '';

    if (docType === 'pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      text = data.text || '';
    } else if (docType === 'docx') {
      const dataBuffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      text = result.value || '';
    } else if (docType === 'pptx' || docType === 'ppt') {
      try {
        text = await new Promise((resolve, reject) => {
          textract.fromFileWithPath(filePath, (error, data) => {
            if (error) reject(error);
            else resolve(data);
          });
        });
      } catch (err) {
        console.warn(`[BG] textract failed for ${docType}, falling back to officeparser:`, err.message);
        text = await new Promise((resolve) => {
          officeparser.parseOffice(filePath, (data, parseErr) => {
            if (parseErr) resolve('');
            else resolve(typeof data === 'string' ? data : String(data));
          });
        });
      }
    } else if (['txt', 'md', 'json', 'url', 'unknown'].includes(docType)) {
      const dataBuffer = fs.readFileSync(filePath);
      text = dataBuffer.toString('utf8').trim();
      
      // Handle URL scraping
      if (text.startsWith('http://') || text.startsWith('https://')) {
        try {
          if (text.includes('youtube.com') || text.includes('youtu.be')) {
            const transcript = await YoutubeTranscript.fetchTranscript(text);
            text = transcript.map(t => t.text).join(' ');
          } else {
            const { data } = await axios.get(text, {
               headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' }
            });
            const $ = cheerio.load(data);
            $('script, style, noscript, nav, footer, iframe').remove();
            text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000);
          }
        } catch (scrapeError) {
          console.error('Lỗi khi scrape URL:', scrapeError.message);
        }
      }
    } else {
      // Try any-text as a general fallback for other formats
      try {
        text = await anytext.getText(filePath);
      } catch (err) {
        console.warn(`[BG] Unsupported format ${docType} and any-text failed.`);
      }
    }

    // SANITIZATION: Remove binary/ZIP headers and non-readable chars
    text = (text || '').toString();
    
    // If it looks like a ZIP file (starts with PK), it's probably failed extraction
    if (text.startsWith('PK') && text.includes('[Content_Types].xml')) {
      console.warn(`[BG] Extraction returned raw ZIP content for ${filePath}. Clearing.`);
      text = '';
    }

    // Remove null bytes and non-printable control characters (except newlines/tabs)
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Collapse multiple spaces/newlines
    text = text.replace(/\s+/g, ' ').trim();

    const end = performance.now();
    console.log(`[BG] ${docType.toUpperCase()} parsed in ${(end - start).toFixed(2)}ms. Text length: ${text.length}`);
    return text;

  } catch (error) {
    console.error('Lỗi trích xuất text:', error);
    return '';
  }
};

// Background processing using setImmediate (no Redis required)
const processDocumentInBackground = (docId, filePath, type) => {
  setImmediate(async () => {
    try {
      const content = (await extractText(filePath, type)) || '';
      
      // Secondary check for binary junk before saving
      const isBinary = content.startsWith('PK\x03\x04') || content.includes('[Content_Types].xml') || content.includes('word/_rels/');
      
      if (content && content.trim().length > 20 && !isBinary) {
        await Document.findByIdAndUpdate(docId, {
          content: content,
          status: 'processed',
          pages: Math.ceil(content.length / 3000)
        });
        console.log(`[BG] ✅ Document ${docId} processed successfully.`);
      } else {
        console.warn(`[BG] ⚠️ Document ${docId} extraction failed or returned invalid content (binary: ${isBinary}).`);
        await Document.findByIdAndUpdate(docId, { status: 'error', content: '' });
      }
    } catch (err) {
      console.error(`[BG] ❌ Error processing document ${docId}:`, err.message);
      await Document.findByIdAndUpdate(docId, { status: 'error' });
    }
  });
};

/**
 * Startup repair: Resume processing for documents lost during server restart
 */
const resumeProcessing = async () => {
  try {
    const stuckDocs = await Document.find({ status: 'processing' });
    if (stuckDocs.length > 0) {
      console.log(`[REPAIR] Found ${stuckDocs.length} documents stuck in "processing". Retrying...`);
      for (const doc of stuckDocs) {
        const relativePath = doc.fileUrl.replace(/^\//, '');
        const filePath = path.resolve(process.cwd(), relativePath);
        processDocumentInBackground(doc._id, filePath, doc.type);
      }
    }
  } catch (err) {
    console.error('[REPAIR] Error during startup repair:', err.message);
  }
};

// @desc    Tai len tai lieu moi
const createDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn file để tải lên' });
    }

    // Check and deduct credit (Cost: 10)
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

    const doc = await Document.create({
      user: req.user.id,
      name: originalNameUtf8,
      type,
      pages: 0,
      fileUrl: `/uploads/documents/${req.file.filename}`,
      fileSize: req.file.size,
      status: 'processing',
    });

    const relativePath = doc.fileUrl.replace(/^\//, '');
    const filePath = path.resolve(process.cwd(), relativePath);

    console.log(`[UPLOAD] Starting background processing for: ${filePath}`);

    // Process in background (non-blocking, no Redis)
    processDocumentInBackground(doc._id, filePath, type);

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

module.exports = { getDocuments, createDocument, getDocument, deleteDocument, extractText, resumeProcessing };
