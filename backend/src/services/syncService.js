const axios = require('axios');
const cron = require('node-cron');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { addCredits } = require('./creditService');

/**
 * Poll SePay API to sync pending payments
 */
const syncPaymentsWithSePay = async () => {
  const apiToken = process.env.SEPAY_API_TOKEN;
  const clientId = process.env.SEPAY_CLIENT_ID;
  const bankAccount = process.env.BANK_ACCOUNT_NO;

  if (!apiToken) {
    console.warn('SEPAY_API_TOKEN is not set. Skipping payment sync.');
    return;
  }

  try {
    let remoteTxns = [];

    if (clientId) {
      // Using SePay v2 API (more stable) even for BankHub-style tokens
      // Sandbox/Test tokens start with BH-SB... or similar
      const url = 'https://api.sepay.vn/v2/transactions/list';

      console.log(`Polling SePay/BankHub (ClientId: ${clientId})...`);
      
      const response = await axios.get(url, {
        params: {
          account_number: bankAccount,
          limit: 20
        },
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      remoteTxns = response.data.transactions || response.data || [];
    } else {
      // Standard SePay v2 API
      const response = await axios.get('https://api.sepay.vn/v2/transactions/list', {
        params: {
          account_number: bankAccount,
          limit: 20
        },
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      remoteTxns = response.data.transactions || [];
    }

    if (!Array.isArray(remoteTxns)) {
       // In some BankHub versions, it might be in a different field
       remoteTxns = remoteTxns.items || [];
    }

    // 2. Get all pending manual payments
    const pendingPayments = await Payment.find({ 
      status: 'pending',
      paymentMethod: 'VietQR'
    }).populate('packageId');

    if (pendingPayments.length === 0) return;

    // 3. Match and update
    for (const payment of pendingPayments) {
      // Find a remote transaction that matches this payment's memo and amount
      // SePay uses 'content', BankHub uses 'description'
      const match = remoteTxns.find(t => {
        const content = (t.content || t.description || '').toLowerCase();
        const amount = parseFloat(t.amount || 0);
        return content.includes(payment.memo.toLowerCase()) && amount >= payment.amount;
      });

      if (match) {
        const txnId = match.transaction_id || match.reference || match.id;
        console.log(`Matching transaction found for Payment ${payment._id}: ${txnId}`);
        
        // Update payment
        payment.status = 'completed';
        payment.transactionCode = txnId;
        await payment.save();

        // Add credits
        await addCredits(payment.userId, payment.packageId.credits, `Mua gói ${payment.packageId.name} (Auto-sync)`, payment._id);

        // Set subscription expiry and tier
        if (['Pro', 'Premium'].includes(payment.packageId.name)) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 30);
          await User.findByIdAndUpdate(payment.userId, { 
            subscriptionExpiresAt: expiryDate,
            subscriptionTier: payment.packageId.name
          });
        }

        console.log(`Successfully auto-synced payment ${payment._id} for User ${payment.userId}`);
      }
    }
  } catch (error) {
    if (error.response) {
      console.error('SePay Sync Error (Response):', error.response.status, error.response.data);
    } else {
      console.error('SePay Sync Error (Message):', error.message);
    }
  }
};

/**
 * Start the background sync job
 */
const startPaymentSync = () => {
  console.log('Starting Payment Sync Service (Interval: 1 minute)...');
  
  // Run every minute
  cron.schedule('*/1 * * * *', async () => {
    await syncPaymentsWithSePay();
  });

  // Also run once on startup
  syncPaymentsWithSePay();
};

module.exports = {
  startPaymentSync,
  syncPaymentsWithSePay
};
