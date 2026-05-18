const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getQuizzes, createQuiz, getQuiz, submitQuiz, getQuizHistory } = require('../controllers/quizController');

router.use(protect);

router.get('/results/history', getQuizHistory);
router.route('/').get(getQuizzes).post(createQuiz);
router.get('/:id', getQuiz);
router.post('/:id/submit', submitQuiz);

module.exports = router;
