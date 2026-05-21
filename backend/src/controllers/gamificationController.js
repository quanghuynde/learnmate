const {
  checkAndUnlockAchievements,
  getUserAchievements,
  getAchievementsProgress,
  getWeeklyLeaderboard,
} = require('../services/gamificationService');
const User = require('../models/User');

// @desc    Lấy tổng quan gamification
// @route   GET /api/gamification/overview
const getGamificationOverview = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Check và unlock achievements mới
    const newAchievements = await checkAndUnlockAchievements(req.user.id);
    
    // Lấy tất cả achievements với progress
    const achievements = await getAchievementsProgress(req.user.id);
    
    // Lấy leaderboard
    const leaderboard = await getWeeklyLeaderboard(10);
    
    // Tính user rank
    const userRank = leaderboard.findIndex((u) => u.userId.toString() === req.user.id.toString()) + 1;

    // Tính level progress
    const currentLevelXP = (user.level - 1) * 500;
    const nextLevelXP = user.level * 500;
    const levelProgress = Math.round(((user.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100);

    res.json({
      user: {
        name: user.name,
        avatar: user.avatar,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        levelProgress,
        nextLevelXP,
      },
      achievements: {
        total: achievements.length,
        unlocked: achievements.filter((a) => a.isUnlocked).length,
        list: achievements,
      },
      leaderboard: {
        userRank: userRank || null,
        top: leaderboard,
      },
      newAchievements: newAchievements.map((a) => ({
        name: a.name,
        description: a.description,
        icon: a.icon,
        xpReward: a.xpReward,
      })),
    });
  } catch (error) {
    console.error('Error in getGamificationOverview:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Lấy danh sách achievements
// @route   GET /api/gamification/achievements
const getAchievements = async (req, res) => {
  try {
    const achievements = await getAchievementsProgress(req.user.id);
    res.json({ achievements });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Lấy leaderboard
// @route   GET /api/gamification/leaderboard
const getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = await getWeeklyLeaderboard(limit);
    
    const userRank = leaderboard.findIndex((u) => u.userId.toString() === req.user.id.toString()) + 1;
    
    res.json({
      userRank: userRank || null,
      leaderboard,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getGamificationOverview,
  getAchievements,
  getLeaderboard,
};
