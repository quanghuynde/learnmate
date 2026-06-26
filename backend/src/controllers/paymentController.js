const PayOS = require('@payos/node');
const Payment = require('../models/Payment');
const Package = require('../models/Package');
const User = require('../models/User');
const { addCredits } = require('../services/creditService');

// Official PayOS SDK Node.js CommonJS initialization
const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

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

/**
 * @desc Create PayOS Payment Link
 */
const createPayOSPayment = async (req, res) => {
  try {
    const { packageId } = req.body;
    const pkg = await Package.findById(packageId);
    if (!pkg) return res.status(404).json({ message: 'Gói tài khoản không tồn tại' });

    const userId = req.user.id;
    const amount = pkg.price;
    // Generate a shorter, unique numeric orderCode (6 digits)
    const orderCode = Math.floor(100000 + Math.random() * 900000); 

    // Determine the frontend base URL dynamically to support both Localhost and Production
    const origin = req.get('origin') || process.env.FRONTEND_URL || 'http://localhost:5173';
    
    const body = {
      orderCode: orderCode,
      amount: amount,
      description: `Thanh toan goi ${pkg.name}`,
      items: [
        {
          name: pkg.name,
          quantity: 1,
          price: amount,
        },
      ],
      returnUrl: `${origin}/payment-result`,
      cancelUrl: `${origin}/pricing`,
    };

    console.log('[PayOS] Creating payment link with body:', body);
    const paymentLinkRes = await payos.createPaymentLink(body);

    // Create pending payment record
    await Payment.create({
      userId,
      packageId,
      amount,
      paymentMethod: 'PayOS',
      orderCode: orderCode,
      status: 'pending'
    });

    res.json({
      checkoutUrl: paymentLinkRes.checkoutUrl,
      orderCode: orderCode
    });
  } catch (error) {
    console.error('Create PayOS Payment Error Details:', error);
    res.status(500).json({ 
      message: 'Lỗi khi tạo yêu cầu thanh toán qua PayOS',
      error: error.message 
    });
  }
};

/**
 * @desc PayOS Webhook handler
 */
const payosWebhook = async (req, res) => {
  try {
    console.log('[PayOS Webhook] Received webhook data:', req.body);
    
    // Verify webhook data
    const webhookData = payos.verifyPaymentWebhookData(req.body);

    if (!webhookData || webhookData.code !== '00') {
        console.warn('[PayOS Webhook] Invalid or unsuccessful payment data');
        return res.status(200).json({ message: 'Webhook received but ignored' });
    }

    const { orderCode, amount } = webhookData;
    
    // Find payment by orderCode
    const payment = await Payment.findOne({ 
      orderCode: orderCode,
      status: 'pending'
    }).populate('packageId');

    if (!payment) {
      console.log(`[PayOS Webhook] Payment not found for orderCode: ${orderCode}`);
      return res.status(200).json({ message: 'Order not found' });
    }

    // Verify amount (PayOS uses full numeric amount)
    if (amount < payment.amount) {
      console.warn(`[PayOS Webhook] Amount mismatch for order ${orderCode}: expected ${payment.amount}, got ${amount}`);
      return res.status(200).json({ message: 'Amount mismatch' });
    }

    // Success! Update payment and add credits
    payment.status = 'completed';
    payment.transactionCode = webhookData.paymentTaskId || 'payos_sync';
    await payment.save();

    await addCredits(payment.userId, payment.packageId.credits, `Mua gói ${payment.packageId.name}`, payment._id);

    // Set subscription expiry (30 days) and tier for Pro and Premium
    if (['Pro', 'Premium'].includes(payment.packageId.name)) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      await User.findByIdAndUpdate(payment.userId, { 
        subscriptionExpiresAt: expiryDate,
        subscriptionTier: payment.packageId.name
      });
    }

    console.log(`Successfully processed PayOS payment for order ${orderCode}`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('PayOS Webhook Error:', error);
    res.status(200).json({ message: 'Internal Server Error', error: error.message });
  }
};

module.exports = {
  getPackages,
  createPayOSPayment,
  payosWebhook
};
