/**
 * Script để thêm dữ liệu Gamification (Achievements + Leaderboard)
 * Chạy: node seedGamificationData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Achievement = require('./src/models/Achievement');
const User = require('./src/models/User');
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

const seedAchievements = async () => {
  try {
    console.log('\n🏆 Tạo Achievements...\n');

    // Xóa achievements cũ
    await Achievement.deleteMany({});

    const achievements = [
      // Quiz Achievements
      {
        name: 'Người mới bắt đầu',
        description: 'Hoàn thành 5 bài quiz đầu tiên',
        icon: '🎯',
        category: 'quiz',
        requirement: { type: 'quiz_count', value: 5 },
        rarity: 'common',
        xpReward: 100,
      },
      {
        name: 'Học sinh chăm chỉ',
        description: 'Hoàn thành 20 bài quiz',
        icon: '📚',
        category: 'quiz',
        requirement: { type: 'quiz_count', value: 20 },
        rarity: 'rare',
        xpReward: 250,
      },
      {
        name: 'Bậc thầy Quiz',
        description: 'Hoàn thành 50 bài quiz',
        icon: '🎓',
        category: 'quiz',
        requirement: { type: 'quiz_count', value: 50 },
        rarity: 'epic',
        xpReward: 500,
      },
      {
        name: 'Độ chính xác cao',
        description: 'Đạt trung bình 80% độ chính xác',
        icon: '🎯',
        category: 'quiz',
        requirement: { type: 'quiz_accuracy', value: 80 },
        rarity: 'rare',
        xpReward: 300,
      },
      {
        name: 'Hoàn hảo',
        description: 'Đạt trung bình 95% độ chính xác',
        icon: '💯',
        category: 'quiz',
        requirement: { type: 'quiz_accuracy', value: 95 },
        rarity: 'legendary',
        xpReward: 1000,
      },

      // Study Achievements
      {
        name: 'Học tập đều đặn',
        description: 'Học tập 10 giờ',
        icon: '⏰',
        category: 'study',
        requirement: { type: 'study_hours', value: 10 },
        rarity: 'common',
        xpReward: 150,
      },
      {
        name: 'Người học không mệt mỏi',
        description: 'Học tập 30 giờ',
        icon: '📖',
        category: 'study',
        requirement: { type: 'study_hours', value: 30 },
        rarity: 'rare',
        xpReward: 350,
      },
      {
        name: 'Học giả',
        description: 'Học tập 100 giờ',
        icon: '🧠',
        category: 'study',
        requirement: { type: 'study_hours', value: 100 },
        rarity: 'epic',
        xpReward: 750,
      },

      // Streak Achievements
      {
        name: 'Khởi đầu tốt',
        description: 'Học liên tục 3 ngày',
        icon: '🔥',
        category: 'streak',
        requirement: { type: 'streak_days', value: 3 },
        rarity: 'common',
        xpReward: 100,
      },
      {
        name: 'Kiên trì',
        description: 'Học liên tục 7 ngày',
        icon: '💪',
        category: 'streak',
        requirement: { type: 'streak_days', value: 7 },
        rarity: 'rare',
        xpReward: 250,
      },
      {
        name: 'Không thể ngăn cản',
        description: 'Học liên tục 30 ngày',
        icon: '🚀',
        category: 'streak',
        requirement: { type: 'streak_days', value: 30 },
        rarity: 'epic',
        xpReward: 600,
      },
      {
        name: 'Huyền thoại',
        description: 'Học liên tục 100 ngày',
        icon: '👑',
        category: 'streak',
        requirement: { type: 'streak_days', value: 100 },
        rarity: 'legendary',
        xpReward: 2000,
      },

      // Level/XP Achievements
      {
        name: 'Level 5',
        description: 'Đạt Level 5',
        icon: '⭐',
        category: 'level',
        requirement: { type: 'xp_total', value: 2000 },
        rarity: 'common',
        xpReward: 200,
      },
      {
        name: 'Level 10',
        description: 'Đạt Level 10',
        icon: '🌟',
        category: 'level',
        requirement: { type: 'xp_total', value: 4500 },
        rarity: 'rare',
        xpReward: 400,
      },
      {
        name: 'Level 20',
        description: 'Đạt Level 20',
        icon: '✨',
        category: 'level',
        requirement: { type: 'xp_total', value: 9500 },
        rarity: 'epic',
        xpReward: 800,
      },

      // Subject Mastery
      {
        name: 'Bậc thầy Toán',
        description: 'Đạt 85% độ chính xác môn Toán',
        icon: '🔢',
        category: 'subject',
        subject: 'Toán',
        requirement: { type: 'subject_mastery', value: 85 },
        rarity: 'rare',
        xpReward: 300,
      },
      {
        name: 'Bậc thầy Lý',
        description: 'Đạt 85% độ chính xác môn Lý',
        icon: '⚛️',
        category: 'subject',
        subject: 'Lý',
        requirement: { type: 'subject_mastery', value: 85 },
        rarity: 'rare',
        xpReward: 300,
      },
      {
        name: 'Bậc thầy Hóa',
        description: 'Đạt 85% độ chính xác môn Hóa',
        icon: '🧪',
        category: 'subject',
        subject: 'Hóa',
        requirement: { type: 'subject_mastery', value: 85 },
        rarity: 'rare',
        xpReward: 300,
      },

      // Special
      {
        name: 'Người tiên phong',
        description: 'Là một trong 100 người dùng đầu tiên',
        icon: '🎖️',
        category: 'special',
        requirement: { type: 'xp_total', value: 0 },
        rarity: 'legendary',
        xpReward: 500,
      },
    ];

    const createdAchievements = await Achievement.insertMany(achievements);
    console.log(`✅ Đã tạo ${createdAchievements.length} achievements`);

    return createdAchievements;
  } catch (error) {
    console.error('❌ Lỗi khi tạo achievements:', error);
    return [];
  }
};

const unlockAchievementsForUser = async (email) => {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`❌ Không tìm thấy user ${email}`);
      return;
    }

    console.log(`\n🔓 Unlock achievements cho ${user.name}...\n`);

    // Xóa user achievements cũ
    await UserAchievement.deleteMany({ user: user._id });

    // Lấy một số achievements để unlock
    const achievements = await Achievement.find();
    const toUnlock = achievements.filter((a) => {
      // Unlock các achievement dễ
      if (a.rarity === 'common') return true;
      if (a.category === 'quiz' && a.requirement.value <= 20) return true;
      if (a.category === 'streak' && a.requirement.value <= 7) return true;
      if (a.category === 'study' && a.requirement.value <= 30) return true;
      return false;
    });

    let totalXPGained = 0;
    for (const achievement of toUnlock) {
      await UserAchievement.create({
        user: user._id,
        achievement: achievement._id,
        progress: 100,
      });
      totalXPGained += achievement.xpReward;
      console.log(`  ✅ ${achievement.icon} ${achievement.name} (+${achievement.xpReward} XP)`);
    }

    // Cập nhật user XP
    user.xp += totalXPGained;
    user.level = Math.floor(user.xp / 500) + 1;
    await user.save();

    console.log(`\n✅ Đã unlock ${toUnlock.length} achievements`);
    console.log(`✅ Tổng XP nhận được: ${totalXPGained}`);
    console.log(`✅ User XP mới: ${user.xp}, Level: ${user.level}`);
  } catch (error) {
    console.error('❌ Lỗi khi unlock achievements:', error);
  }
};

const seedData = async () => {
  try {
    // 1. Tạo achievements
    await seedAchievements();

    // 2. Unlock achievements cho user vana@gmail.com
    await unlockAchievementsForUser('vana@gmail.com');

    // 3. Tổng kết
    console.log('\n' + '='.repeat(50));
    console.log('✅ HOÀN TẤT! Dữ liệu Gamification đã được tạo');
    console.log('='.repeat(50));
    console.log('\n💡 Bây giờ bạn có thể:');
    console.log('   1. Đăng nhập với vana@gmail.com');
    console.log('   2. Vào trang "Gamification"');
    console.log('   3. Xem huy hiệu và bảng xếp hạng!\n');
  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Đã đóng kết nối MongoDB');
  }
};

// Chạy script
(async () => {
  await connectDB();
  await seedData();
})();
