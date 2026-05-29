const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { askAssistant } = require('../controllers/aiAssistantController');

const router = express.Router();

router.use(protect);
router.post('/guide', askAssistant);

module.exports = router;
