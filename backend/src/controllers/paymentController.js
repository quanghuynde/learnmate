const crypto = require('crypto');
const Payment = require('../models/Payment');
const Package = require('../models/Package');
const { addCredits } = require('../services/creditService');

/**
 * @desc Get available packages
 */
const getPackages = async (req, res) => {
  try {
    const packages = await Package.find({ isActive: true });
    res.json({ packages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Utils
function formatDate(date, compact = false) {
  const y = date.getFullYear();
  const m = ('0' + (date.getMonth() + 1)).slice(-2);
  const d = ('0' + date.getDate()).slice(-2);
  const h = ('0' + date.getHours()).slice(-2);
  const mi = ('0' + date.getMinutes()).slice(-2);
  const s = ('0' + date.getSeconds()).slice(-2);

  return `${y}${m}${d}${h}${mi}${s}`;
}

/**
 * @desc Create Manual (VietQR) payment
 */
const createManualPayment = async (req, res) => {
  try {
    const { packageId } = req.body;
    const pkg = await Package.findById(packageId);
    if (!pkg) return res.status(404).json({ message: 'Gói tài khoản không tồn tại' });

    const userId = req.user.id;
    const amount = pkg.price;
    const date = new Date();
    
    // Generate a unique memo for SePay matching
    // Format: LM + 6 chars of Date + 3 random digits
    const txnRef = 'LM' + formatDate(date, true).slice(-6) + Math.floor(Math.random() * 1000);

    // Create pending payment record
    const payment = await Payment.create({
      userId,
      packageId,
      amount,
      paymentMethod: 'VietQR',
      memo: txnRef,
      status: 'pending'
    });

    const qrUrl = `https://img.vietqr.io/image/${process.env.BANK_ID}-${process.env.BANK_ACCOUNT_NO}-compact.png?amount=${amount}&addInfo=${txnRef}&accountName=${encodeURIComponent(process.env.BANK_ACCOUNT_NAME)}`;

    res.json({
      paymentId: payment._id,
      amount,
      memo: txnRef,
      qrUrl,
      bankInfo: {
        bankId: process.env.BANK_ID,
        accountNo: process.env.BANK_ACCOUNT_NO,
        accountName: process.env.BANK_ACCOUNT_NAME
      }
    });
  } catch (error) {
    console.error('Create Manual Payment Error:', error);
    res.status(500).json({ message: 'Lỗi khi tạo yêu cầu thanh toán' });
  }
};

/**
 * @desc SePay Webhook handler (HMAC-SHA256)
 */
const sepayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-sepay-signature'] || '';
    const timestamp = req.headers['x-sepay-timestamp'] || '';
    const payload = JSON.stringify(req.body);
    const secret = process.env.SEPAY_SECRET_KEY;

    // Verify HMAC-SHA256 signature
    const expected = 'sha256=' + crypto.createHmac('sha256', secret)
      .update(timestamp + '.' + payload)
      .digest('hex');

    if (signature !== expected) {
      console.warn('Invalid SePay signature');
      return res.status(401).send('Invalid signature');
    }

    const { content, amount, trans_date } = req.body;
    
    // SePay sends the memo in 'content'
    // Find payment by memo
    const payment = await Payment.findOne({ 
      memo: { $regex: content, $options: 'i' }, // Partial match to be safe
      status: 'pending'
    }).populate('packageId');

    if (!payment) {
      console.log(`Payment not found for content: ${content}`);
      return res.status(200).send('Order not found');
    }

    // Verify amount
    if (parseFloat(amount) < payment.amount) {
      console.warn(`Amount mismatch for ${payment._id}: expected ${payment.amount}, got ${amount}`);
      return res.status(200).send('Amount mismatch');
    }

    // Success! Update payment and add credits
    payment.status = 'completed';
    payment.transactionCode = req.body.transaction_id || 'manual';
    await payment.save();

    await addCredits(payment.userId, payment.packageId.credits, `Mua gói ${payment.packageId.name}`, payment._id);

    // Set subscription expiry (30 days) and tier for Pro and Premium
    if (['Pro', 'Premium'].includes(payment.packageId.name)) {
      const User = require('../models/User');
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      await User.findByIdAndUpdate(payment.userId, { 
        subscriptionExpiresAt: expiryDate,
        subscriptionTier: payment.packageId.name
      });
    }

    console.log(`Successfully processed payment ${payment._id} via SePay`);
    res.status(200).send('OK');
  } catch (error) {
    console.error('SePay Webhook Error:', error);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = {
  getPackages,
  createManualPayment,
  sepayWebhook
};
