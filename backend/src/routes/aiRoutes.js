const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { summarizeDocument, generateQuiz } = require('../controllers/aiController');

router.use(protect);

router.post('/summarize', summarizeDocument);
router.post('/generate-quiz', generateQuiz);

module.exports = router;
