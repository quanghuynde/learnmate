const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const textract = require('textract');
const officeparser = require('officeparser');
const { YoutubeTranscript } = require('youtube-transcript');
const anytext = require('any-text');
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
      const parser = new PDFParse({ data: dataBuffer });
      const data = await parser.getText();
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
            const youtubeUrl = text.trim();
            let videoTitle = '';
            let videoAuthor = '';
            let videoDescription = '';
            let transcriptText = '';

            // 1. Get title & author via oEmbed (reliable, no API key needed)
            try {
              const oEmbedRes = await axios.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`);
              videoTitle = oEmbedRes.data.title || '';
              videoAuthor = oEmbedRes.data.author_name || '';
            } catch (oembedErr) {
              console.warn('[BG] oEmbed failed:', oembedErr.message);
            }

            // 2. Get description via HTML meta tag
            try {
              const { data: htmlData } = await axios.get(youtubeUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' },
                timeout: 10000
              });
              const $ = cheerio.load(htmlData);
              videoDescription = $('meta[property="og:description"]').attr('content') || '';
            } catch (descErr) {
              console.warn('[BG] YouTube description fetch failed:', descErr.message);
            }

            // 3. Get transcript
            try {
              const transcript = await YoutubeTranscript.fetchTranscript(youtubeUrl);
              transcriptText = transcript.map(t => t.text).join(' ');
            } catch (transcriptErr) {
              console.warn('[BG] YouTube transcript fetch failed:', transcriptErr.message);
            }

            // 4. Combine all metadata + transcript into rich content
            const parts = [];
            if (videoTitle) parts.push(`TIÊU ĐỀ VIDEO: ${videoTitle}`);
            if (videoAuthor) parts.push(`KÊNH: ${videoAuthor}`);
            if (videoDescription) parts.push(`MÔ TẢ VIDEO: ${videoDescription}`);
            if (transcriptText) parts.push(`NỘI DUNG TRANSCRIPT:\n${transcriptText}`);
            else if (!transcriptText && videoDescription) parts.push('(Video không có transcript tự động)');
            text = parts.join('\n\n');

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
    } else if (['jpg', 'jpeg', 'png', 'bmp', 'webp'].includes(docType)) {
      try {
        const Tesseract = require('tesseract.js');
        const { data: { text: rawText } } = await Tesseract.recognize(filePath, 'vie+eng');
        text = rawText || '';
      } catch (err) {
        console.warn(`[BG] OCR failed for ${filePath}:`, err.message);
      }
    } else if (['mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(docType)) {
      try {
        console.log(`[BG] Starting transcription for audio: ${filePath}`);
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));
        formData.append('model', 'whisper-1');
        formData.append('language', 'vi');

        const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        });
        text = response.data.text || '';
        console.log(`[BG] Audio transcribed successfully: ${text.length} chars`);
      } catch (err) {
        console.error(`[BG] Audio transcription failed:`, err.response?.data || err.message);
        text = '';
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
const processDocumentInBackground = (docId, filePath, type, userId) => {
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
        if (userId) {
          const { createUserNotification } = require('../services/notificationService');
          await createUserNotification(userId, {
            title: 'Tài liệu đã xử lý xong',
            message: `Tài liệu đã được xử lý thành công và sẵn sàng để sử dụng.`,
            type: 'system',
            metadata: { documentId: docId }
          });
        }
        
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

    // Check document limit based on subscription tier
    let tier = req.user.subscriptionTier || 'Basic';
    if (tier !== 'Basic' && req.user.subscriptionExpiresAt && new Date(req.user.subscriptionExpiresAt) < new Date()) {
      tier = 'Basic';
    }

    const docCount = await Document.countDocuments({ user: req.user.id });
    const limits = { 'Basic': 40, 'Pro': 80, 'Premium': Infinity };
    const userLimit = limits[tier] || 40;

    if (docCount >= userLimit) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({ 
        message: `Bạn đã đạt giới hạn lưu trữ tối đa (${userLimit} tài liệu) cho gói ${tier}. Vui lòng nâng cấp gói hoặc xóa bớt tài liệu cũ.` 
      });
    }

    // Check and deduct credit (Cost: 10)
    try {
      await validateAndDeduct(req.user.id, 10, 'Upload Document');
    } catch (err) {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) { console.error('Failed to unlink file after credit failure:', e); }
      }
      return res.status(402).json({ message: err.message });
    }

    const originalNameUtf8 = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(originalNameUtf8).toLowerCase();
    const type = ext ? ext.replace('.', '') : 'unknown';

    let doc;
    try {
      doc = await Document.create({
        user: req.user.id,
        name: originalNameUtf8,
        type,
        pages: 0,
        fileUrl: `/uploads/documents/${req.file.filename}`,
        fileSize: req.file.size,
        status: 'processing',
      });
    } catch (createErr) {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) { console.error('Failed to unlink file after DB creation failure:', e); }
      }
      throw createErr;
    }

    const relativePath = doc.fileUrl.replace(/^\//, '');
    const filePath = path.resolve(process.cwd(), relativePath);

    console.log(`[UPLOAD] Starting background processing for: ${filePath}`);

    // Process in background (non-blocking, no Redis)
    processDocumentInBackground(doc._id, filePath, type, req.user.id);

    res.status(201).json({ 
      message: 'Tải lên thành công. Hệ thống đang trích xuất nội dung trong nền.', 
      document: doc 
    });
  } catch (error) {
    console.error('Create Document Error:', error.message);
    // Final cleanup attempt if anything failed and we have a file path
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
       try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
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
