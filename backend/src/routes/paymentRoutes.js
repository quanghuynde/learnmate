const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  getPackages, 
  createManualPayment,
  sepayWebhook 
} = require('../controllers/paymentController');

router.get('/packages', protect, getPackages);
router.post('/checkout-manual', protect, createManualPayment);

// SePay Webhook
router.post('/webhook', sepayWebhook); // Changed from /sepay-webhook to match SePay config

// Credit history endpoints
const { getCreditHistory, getAIUsageLogs } = require('../controllers/creditController');
router.get('/credits/history', protect, getCreditHistory);
router.get('/credits/usage', protect, getAIUsageLogs);

module.exports = router;
