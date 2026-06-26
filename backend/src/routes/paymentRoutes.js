const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  getPackages, 
  createPayOSPayment,
  payosWebhook 
} = require('../controllers/paymentController');

router.get('/packages', protect, getPackages);
router.post('/checkout', protect, createPayOSPayment);
router.get('/:id/status', protect, async (req, res) => {
  const Payment = require('../models/Payment');
  try {
    const payment = await Payment.findOne({ _id: req.params.id, userId: req.user.id });
    if (!payment) return res.status(404).json({ message: 'Không tìm thấy giao dịch' });
    res.json({ status: payment.status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PayOS Webhook
router.post('/webhook', payosWebhook);

// Credit history endpoints
const { getCreditHistory, getAIUsageLogs } = require('../controllers/creditController');
router.get('/credits/history', protect, getCreditHistory);
router.get('/credits/usage', protect, getAIUsageLogs);

module.exports = router;
