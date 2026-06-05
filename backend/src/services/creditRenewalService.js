const cron = require('node-cron');
const User = require('../models/User');
const { addCredits } = require('./creditService');

// Check and reset Free tier credits every 14 days
// Run daily at midnight to check who is due
const initCreditRenewalJob = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily credit renewal check...');
    try {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const usersToReset = await User.find({
        lastCreditReset: { $lte: fourteenDaysAgo }
      });

      const TIER_BASES = {
        'Basic': 800,
        'Pro': 2500,
        'Premium': 5000
      };

      for (const user of usersToReset) {
        const tier = user.subscriptionTier || 'Basic';
        const baseAmount = TIER_BASES[tier] || 800;

        if (user.currentCredits < baseAmount) {
          user.currentCredits = baseAmount;
          user.lastCreditReset = new Date();
          await user.save();
          console.log(`Reset credits to ${baseAmount} for ${tier} user: ${user.email}`);
        }
      }
    } catch (error) {
      console.error('Credit renewal job error:', error);
    }
  });
};

module.exports = { initCreditRenewalJob };
