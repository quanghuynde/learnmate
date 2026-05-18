const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createSession, getOverview, getSessions } = require('../controllers/progressController');

router.use(protect);

router.get('/overview', getOverview);
router.route('/sessions').get(getSessions).post(createSession);

module.exports = router;
