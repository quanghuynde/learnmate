const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDir = path.join(__dirname, '../../uploads/documents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const uploadPostDir = path.join(__dirname, '../../uploads/posts');
if (!fs.existsSync(uploadPostDir)) {
  fs.mkdirSync(uploadPostDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'image') {
      cb(null, uploadPostDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `${Date.now()}-${baseName}${ext}`);
  },
});

const uploadDocument = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB Limit
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
});

const uploadPostImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit for images
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh!'), false);
    }
  },
});

module.exports = { uploadDocument, uploadPostImage };
