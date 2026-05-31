const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { getAdminStats } = require('../controllers/adminController');

router.get('/stats', protect, adminOnly, getAdminStats);

module.exports = router;
