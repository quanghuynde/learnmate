const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { summarizeDocument, generateQuiz, generateDialogue } = require('../controllers/aiController');

router.use(protect);

router.post('/summarize', summarizeDocument);
router.post('/generate-quiz', generateQuiz);
router.post('/generate-dialogue', generateDialogue);

module.exports = router;
