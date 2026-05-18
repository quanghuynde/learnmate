const express = require('express');
const router = express.Router();
const { getDocuments, createDocument, getDocument, deleteDocument } = require('../controllers/documentController');
const { protect } = require('../middleware/authMiddleware');
const { uploadDocument } = require('../middleware/uploadMiddleware');

router.use(protect);

router.route('/').get(getDocuments).post(uploadDocument.single('file'), createDocument);
router.route('/:id').get(getDocument).delete(deleteDocument);

module.exports = router;
