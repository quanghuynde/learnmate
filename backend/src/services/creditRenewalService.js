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
      // and whose credits are below 100
      
      const usersToReset = await User.find({
        lastCreditReset: { $lte: fourteenDaysAgo },
        currentCredits: { $lt: 1000 }
      });

      for (const user of usersToReset) {
        const topUp = 1000 - user.currentCredits;
        if (topUp > 0) {
          user.currentCredits = 1000;
          user.lastCreditReset = new Date();
          await user.save();
          
          console.log(`Reset credits for user ${user.email}`);
        }
      }
    } catch (error) {
      console.error('Credit renewal job error:', error);
    }
  });
};

module.exports = { initCreditRenewalJob };
