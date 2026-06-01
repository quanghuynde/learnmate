const cron = require('node-cron');
const { getWeeklyLeaderboard } = require('./gamificationService');
const { addCredits } = require('./creditService');

/**
 * Start the weekly ranking reward job
 * Runs every Sunday at 23:59:59
 */
const startWeeklyRankingRewardJob = () => {
  // schedule(minute, hour, dayOfMonth, month, dayOfWeek)
  // '59 23 * * 0' = 23:59 on Sunday
  cron.schedule('59 23 * * 0', async () => {
    console.log('Running weekly ranking reward job...');
    try {
      const topUsers = await getWeeklyLeaderboard(3);
      
      const rewards = [80, 60, 40]; // Top 1, Top 2, Top 3

      for (let i = 0; i < topUsers.length; i++) {
        const user = topUsers[i];
        const rewardAmount = rewards[i];
        
        if (user && user.userId) {
          await addCredits(
            user.userId, 
            rewardAmount, 
            `Phần thưởng xếp hạng Tuần: Top ${i + 1}`
          );
          console.log(`Awarded ${rewardAmount} credits to Top ${i+1} user: ${user.name}`);
        }
      }
    } catch (error) {
      console.error('Weekly ranking reward job error:', error);
    }
  });
  console.log('Weekly ranking reward job scheduled.');
};

module.exports = { startWeeklyRankingRewardJob };
