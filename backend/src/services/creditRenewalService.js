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

      // Find users who haven't been reset in 14+ days
      const usersToReset = await User.find({
        lastCreditReset: { $lte: fourteenDaysAgo }
      });

      for (const user of usersToReset) {
        let tierMax = 800; // Basic
        if (user.subscriptionTier === 'Pro') tierMax = 2500;
        if (user.subscriptionTier === 'Premium') tierMax = 5000;

        // Reset to tier max only if they have fewer credits
        if (user.currentCredits < tierMax) {
          user.currentCredits = tierMax;
          user.lastCreditReset = new Date();
          await user.save();
          
          console.log(`Reset credits for user ${user.email} (${user.subscriptionTier}) to ${tierMax}`);
        }
      }
    } catch (error) {
      console.error('Credit renewal job error:', error);
    }
  });
};

module.exports = { initCreditRenewalJob };
