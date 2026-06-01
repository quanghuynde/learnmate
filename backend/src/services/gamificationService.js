const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const QuizResult = require('../models/QuizResult');
const StudySession = require('../models/StudySession');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * Kiểm tra và unlock achievements cho user
 */
/**
 * Kiểm tra và unlock achievements cho user
 */
const checkAndUnlockAchievements = async (userId, quizResults, studySessions) => {
  try {
    const user = await User.findById(userId);
    if (!user) return [];

    // Tính toán stats
    const stats = {
      quizCount: quizResults.length,
      avgAccuracy: quizResults.length > 0
        ? quizResults.reduce((sum, r) => sum + r.percentage, 0) / quizResults.length
        : 0,
      totalHours: studySessions.reduce((sum, s) => sum + s.duration, 0) / 60,
      streak: user.streak,
      xp: user.xp,
      level: user.level,
    };

    // Tính subject mastery
    const subjectStats = {};
    quizResults.forEach((result) => {
      const subject = result.quiz?.subject || 'Khác';
      if (!subjectStats[subject]) {
        subjectStats[subject] = { count: 0, totalPercentage: 0 };
      }
      subjectStats[subject].count++;
      subjectStats[subject].totalPercentage += result.percentage;
    });

    // Lấy tất cả achievements
    const allAchievements = await Achievement.find();
    const userAchievements = await UserAchievement.find({ user: userId });
    const unlockedIds = new Set(userAchievements.map(ua => ua.achievement.toString()));

    const newUnlocked = [];

    for (const achievement of allAchievements) {
      if (unlockedIds.has(achievement._id.toString())) continue;

      let shouldUnlock = false;

      // Kiểm tra điều kiện
      switch (achievement.requirement.type) {
        case 'quiz_count':
          shouldUnlock = stats.quizCount >= achievement.requirement.value;
          break;
        case 'quiz_accuracy':
          shouldUnlock = stats.avgAccuracy >= achievement.requirement.value;
          break;
        case 'study_hours':
          shouldUnlock = stats.totalHours >= achievement.requirement.value;
          break;
        case 'streak_days':
          shouldUnlock = stats.streak >= achievement.requirement.value;
          break;
        case 'xp_total':
          shouldUnlock = stats.xp >= achievement.requirement.value;
          break;
        case 'subject_mastery':
          if (achievement.subject && subjectStats[achievement.subject]) {
            const avgScore = subjectStats[achievement.subject].totalPercentage / subjectStats[achievement.subject].count;
            shouldUnlock = avgScore >= achievement.requirement.value;
          }
          break;
      }

      if (shouldUnlock) {
        // Unlock achievement
        await UserAchievement.create({
          user: userId,
          achievement: achievement._id,
          progress: 100,
        });

        // Thêm XP reward
        user.xp += achievement.xpReward;
        user.monthlyXP = (user.monthlyXP || 0) + achievement.xpReward;
        user.level = Math.floor(user.xp / 500) + 1;
        await user.save();

        newUnlocked.push(achievement);
      }
    }

    return newUnlocked;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
};

/**
 * Lấy tất cả achievements của user
 */
const getUserAchievements = async (userId) => {
  try {
    const userAchievements = await UserAchievement.find({ user: userId })
      .populate('achievement')
      .sort({ unlockedAt: -1 });

    return userAchievements.map((ua) => ({
      ...ua.achievement.toObject(),
      unlockedAt: ua.unlockedAt,
      progress: ua.progress,
    }));
  } catch (error) {
    console.error('Error getting user achievements:', error);
    return [];
  }
};

/**
 * Lấy progress của tất cả achievements
 */
const getAchievementsProgress = async (userId, quizResults, studySessions) => {
  try {
    const user = await User.findById(userId);
    if (!user) return [];

    const stats = {
      quizCount: quizResults.length,
      avgAccuracy: quizResults.length > 0
        ? quizResults.reduce((sum, r) => sum + r.percentage, 0) / quizResults.length
        : 0,
      totalHours: studySessions.reduce((sum, s) => sum + s.duration, 0) / 60,
      streak: user.streak,
      xp: user.xp,
    };

    const subjectStats = {};
    quizResults.forEach((result) => {
      const subject = result.quiz?.subject || 'Khác';
      if (!subjectStats[subject]) {
        subjectStats[subject] = { count: 0, totalPercentage: 0 };
      }
      subjectStats[subject].count++;
      subjectStats[subject].totalPercentage += result.percentage;
    });

    const allAchievements = await Achievement.find();
    const userAchievements = await UserAchievement.find({ user: userId });
    const unlockedIds = new Set(userAchievements.map((ua) => ua.achievement.toString()));

    const achievementsWithProgress = allAchievements.map((achievement) => {
      const isUnlocked = unlockedIds.has(achievement._id.toString());
      let progress = 0;
      let current = 0;
      let target = achievement.requirement.value;

      if (!isUnlocked) {
        switch (achievement.requirement.type) {
          case 'quiz_count':
            current = stats.quizCount;
            break;
          case 'quiz_accuracy':
            current = Math.round(stats.avgAccuracy);
            break;
          case 'study_hours':
            current = Math.round(stats.totalHours);
            break;
          case 'streak_days':
            current = stats.streak;
            break;
          case 'xp_total':
            current = stats.xp;
            break;
          case 'subject_mastery':
            if (achievement.subject && subjectStats[achievement.subject]) {
              current = Math.round(subjectStats[achievement.subject].totalPercentage / subjectStats[achievement.subject].count);
            }
            break;
        }
        progress = Math.min((current / target) * 100, 100);
      } else {
        progress = 100;
        current = target;
      }

      return {
        ...achievement.toObject(),
        isUnlocked,
        progress: Math.round(progress),
        current,
        target,
      };
    });

    return achievementsWithProgress;
  } catch (error) {
    console.error('Error getting achievements progress:', error);
    return [];
  }
};

/**
 * Lấy leaderboard tuần (XP kiếm được trong 7 ngày qua)
 */
const getWeeklyLeaderboard = async (limit = 10) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    // 1. Lấy XP từ Quiz trong 7 ngày qua
    const quizXP = await QuizResult.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$user', totalQuizXP: { $sum: '$xpEarned' } } }
    ]);

    // 2. Lấy XP từ Achievements trong 7 ngày qua
    const achievementXP = await UserAchievement.aggregate([
      { $match: { unlockedAt: { $gte: sevenDaysAgo } } },
      {
        $lookup: {
          from: 'achievements',
          localField: 'achievement',
          foreignField: '_id',
          as: 'meta'
        }
      },
      { $unwind: '$meta' },
      { $group: { _id: '$user', totalAchievementXP: { $sum: '$meta.xpReward' } } }
    ]);

    // 3. Hợp nhất kết quả
    const userXPMap = new Map();
    
    quizXP.forEach(item => {
      userXPMap.set(item._id.toString(), item.totalQuizXP);
    });

    achievementXP.forEach(item => {
      const userId = item._id.toString();
      const current = userXPMap.get(userId) || 0;
      userXPMap.set(userId, current + item.totalAchievementXP);
    });

    // 4. Chuyển sang array và lấy info user
    const usersData = Array.from(userXPMap.entries())
      .map(([userId, xp]) => ({ userId, xp }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, limit);

    const userIds = usersData.map(u => u.userId);
    const usersInfo = await User.find({ _id: { $in: userIds } }).select('name avatar level streak');

    const result = usersData.map((u, index) => {
      const info = usersInfo.find(i => i._id.toString() === u.userId);
      return {
        rank: index + 1,
        userId: u.userId,
        name: info?.name || 'Unknown',
        avatar: info?.avatar,
        xp: u.xp,
        level: info?.level || 1,
        streak: info?.streak || 0,
      };
    });

    return result;
  } catch (error) {
    console.error('Error getting weekly leaderboard:', error);
    return [];
  }
};


/**
 * Lấy leaderboard tháng (đã refactor sang aggregation)
 */
const getMonthlyLeaderboard = async (limit = 10, month, year) => {
  try {
    const now = new Date();
    const m = month !== undefined ? parseInt(month) : now.getMonth();
    const y = year !== undefined ? parseInt(year) : now.getFullYear();
    
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 1);

    // 1. Lấy XP từ Quiz
    const quizXP = await QuizResult.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: '$user', totalQuizXP: { $sum: '$xpEarned' } } }
    ]);

    // 2. Lấy XP từ Achievements (cần join với bảng Achievement để lấy xpReward)
    const achievementXP = await UserAchievement.aggregate([
      { $match: { unlockedAt: { $gte: start, $lt: end } } },
      {
        $lookup: {
          from: 'achievements',
          localField: 'achievement',
          foreignField: '_id',
          as: 'meta'
        }
      },
      { $unwind: '$meta' },
      { $group: { _id: '$user', totalAchievementXP: { $sum: '$meta.xpReward' } } }
    ]);

    // 3. Hợp nhất kết quả
    const userXPMap = new Map();
    
    quizXP.forEach(item => {
      userXPMap.set(item._id.toString(), item.totalQuizXP);
    });

    achievementXP.forEach(item => {
      const userId = item._id.toString();
      const current = userXPMap.get(userId) || 0;
      userXPMap.set(userId, current + item.totalAchievementXP);
    });

    // 4. Chuyển sang array và lấy info user
    const usersData = Array.from(userXPMap.entries())
      .map(([userId, xp]) => ({ userId, xp }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, limit);

    // Join với bảng User để lấy tên và avatar
    const User = require('../models/User');
    const userIds = usersData.map(u => u.userId);
    const usersInfo = await User.find({ _id: { $in: userIds } }).select('name avatar level streak');

    const result = usersData.map((u, index) => {
      const info = usersInfo.find(i => i._id.toString() === u.userId);
      return {
        rank: index + 1,
        userId: u.userId,
        name: info?.name || 'Unknown',
        avatar: info?.avatar,
        xp: u.xp,
        level: info?.level || 1,
        streak: info?.streak || 0,
      };
    });

    return result;
  } catch (error) {
    console.error('Error getting monthly leaderboard:', error);
    return [];
  }
};

module.exports = {
  checkAndUnlockAchievements,
  getUserAchievements,
  getAchievementsProgress,
  getWeeklyLeaderboard,
  getMonthlyLeaderboard,
};
