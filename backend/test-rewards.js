require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const { getWeeklyLeaderboard } = require('./src/services/gamificationService');
const { addCredits } = require('./src/services/creditService');
const User = require('./src/models/User');

async function testWeeklyRewards() {
  await connectDB();
  console.log('Connected to DB');

  try {
    console.log('Fetching Top 3 from Weekly Leaderboard...');
    const topUsers = await getWeeklyLeaderboard(3);
    console.log('Top Users:', JSON.stringify(topUsers, null, 2));

    const rewards = [80, 60, 40];

    for (let i = 0; i < topUsers.length; i++) {
        const user = topUsers[i];
        const rewardAmount = rewards[i];
        
        if (user && user.userId) {
          console.log(`Testing reward for Top ${i+1}: ${user.name} (${user.userId})`);
          
          const oldCredits = (await User.findById(user.userId)).currentCredits;
          
          await addCredits(
            user.userId, 
            rewardAmount, 
            `TEST Phần thưởng xếp hạng Tuần: Top ${i + 1}`
          );
          
          const newCredits = (await User.findById(user.userId)).currentCredits;
          
          console.log(`Result: ${oldCredits} -> ${newCredits} (+${rewardAmount}) ✅`);
        } else {
          console.log(`No user found for Top ${i+1}`);
        }
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed');
  }
}

testWeeklyRewards();
