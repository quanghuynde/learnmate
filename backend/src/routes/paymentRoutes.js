const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getPackages, createVNPayUrl, vnpayIPN } = require('../controllers/paymentController');

router.get('/packages', protect, getPackages);
router.post('/checkout', protect, createVNPayUrl);
router.get('/vnpay-ipn', vnpayIPN); // Public webhook

// Credit history endpoints
const { getCreditHistory, getAIUsageLogs } = require('../controllers/creditController');
router.get('/credits/history', protect, getCreditHistory);
router.get('/credits/usage', protect, getAIUsageLogs);

module.exports = router;
