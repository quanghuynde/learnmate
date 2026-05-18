const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getExams, createExam, updateExam, deleteExam } = require('../controllers/examController');

router.use(protect);

router.route('/').get(getExams).post(createExam);
router.route('/:id').put(updateExam).delete(deleteExam);

module.exports = router;
