const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const QuizResult = require('../models/QuizResult');
const StudySession = require('../models/StudySession');
const User = require('../models/User');

/**
 * Kiểm tra và unlock achievements cho user
 */
const checkAndUnlockAchievements = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Lấy dữ liệu
    const quizResults = await QuizResult.find({
      user: userId,
      createdAt: { $gte: thirtyDaysAgo },
    }).populate('quiz', 'subject');

    const studySessions = await StudySession.find({
      user: userId,
      date: { $gte: thirtyDaysAgo },
    });

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
    const unlockedAchievements = [];

    for (const achievement of allAchievements) {
      // Kiểm tra đã unlock chưa
      const existing = await UserAchievement.findOne({
        user: userId,
        achievement: achievement._id,
      });

      if (existing) continue; // Đã unlock rồi

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
        user.level = Math.floor(user.xp / 500) + 1;
        await user.save();

        unlockedAchievements.push(achievement);
      }
    }

    return unlockedAchievements;
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
const getAchievementsProgress = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const quizResults = await QuizResult.find({
      user: userId,
      createdAt: { $gte: thirtyDaysAgo },
    }).populate('quiz', 'subject');

    const studySessions = await StudySession.find({
      user: userId,
      date: { $gte: thirtyDaysAgo },
    });

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
 * Lấy leaderboard tuần
 */
const getWeeklyLeaderboard = async (limit = 10) => {
  try {
    const users = await User.find({ role: 'student' })
      .select('name email avatar xp level streak')
      .sort({ xp: -1 })
      .limit(limit);

    return users.map((user, index) => ({
      rank: index + 1,
      userId: user._id,
      name: user.name,
      avatar: user.avatar,
      xp: user.xp,
      level: user.level,
      streak: user.streak,
    }));
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
};

module.exports = {
  checkAndUnlockAchievements,
  getUserAchievements,
  getAchievementsProgress,
  getWeeklyLeaderboard,
};
