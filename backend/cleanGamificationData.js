/**
 * Script để XÓA dữ liệu Gamification
 * Chạy: node cleanGamificationData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Achievement = require('./src/models/Achievement');
const UserAchievement = require('./src/models/UserAchievement');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ Không tìm thấy MONGODB_URI trong file .env');
      process.exit(1);
    }
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB Atlas connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const cleanData = async () => {
  try {
    console.log('\n🗑️  Đang xóa dữ liệu Gamification...\n');

    // Xóa tất cả achievements
    const deletedAchievements = await Achievement.deleteMany({});
    console.log(`✅ Đã xóa ${deletedAchievements.deletedCount} achievements`);

    // Xóa tất cả user achievements
    const deletedUserAchievements = await UserAchievement.deleteMany({});
    console.log(`✅ Đã xóa ${deletedUserAchievements.deletedCount} user achievements`);

    console.log('\n' + '='.repeat(50));
    console.log('✅ HOÀN TẤT! Đã xóa tất cả dữ liệu Gamification');
    console.log('='.repeat(50));
    console.log('\n💡 Dữ liệu đã sạch sẽ!\n');
  } catch (error) {
    console.error('❌ Lỗi khi xóa data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Đã đóng kết nối MongoDB');
  }
};

// Chạy script
(async () => {
  await connectDB();
  await cleanData();
})();
