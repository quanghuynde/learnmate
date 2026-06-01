const QuizResult = require('../models/QuizResult');
const StudySession = require('../models/StudySession');
const {
  checkAndUnlockAchievements,
  getUserAchievements,
  getAchievementsProgress,
  getWeeklyLeaderboard,
  getMonthlyLeaderboard,
} = require('../services/gamificationService');
const User = require('../models/User');

/**
 * Helper to reset monthly XP if month changed
 */
const checkAndResetMonthlyXP = async (user) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  if (!user.monthlyXPResetAt || user.monthlyXPResetAt < startOfMonth) {
    user.monthlyXP = 0;
    user.monthlyXPResetAt = startOfMonth;
    await user.save();
  }
};

// @desc    Lấy tổng quan gamification
// @route   GET /api/gamification/overview
const getGamificationOverview = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    await checkAndResetMonthlyXP(user);
    
    // ... rest of the code remains the same but updated below for clarity ...
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [quizResults, studySessions] = await Promise.all([
      QuizResult.find({
        user: req.user.id,
        createdAt: { $gte: thirtyDaysAgo }
      }).populate('quiz', 'subject'),
      StudySession.find({
        user: req.user.id,
        date: { $gte: thirtyDaysAgo }
      })
    ]);

    const newAchievements = await checkAndUnlockAchievements(req.user.id, quizResults, studySessions);
    const achievements = await getAchievementsProgress(req.user.id, quizResults, studySessions);
    
    // Default to monthly leaderboard for overview
    const leaderboard = await getMonthlyLeaderboard(10);
    
    const userRank = leaderboard.findIndex((u) => u.userId.toString() === req.user.id.toString()) + 1;

    const currentLevelXP = (user.level - 1) * 500;
    const nextLevelXP = user.level * 500;
    const levelProgress = Math.round(((user.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100);

    res.json({
      user: {
        name: user.name,
        avatar: user.avatar,
        xp: user.xp,
        monthlyXP: user.monthlyXP,
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
    const type = req.query.type || 'monthly'; // 'weekly' or 'monthly'
    const limit = parseInt(req.query.limit) || 10;
    const month = req.query.month; // 0-11
    const year = req.query.year;
    
    const user = await User.findById(req.user.id);
    await checkAndResetMonthlyXP(user);

    let leaderboard;
    if (type === 'weekly') {
      leaderboard = await getWeeklyLeaderboard(limit);
    } else {
      leaderboard = await getMonthlyLeaderboard(limit, month, year);
    }
    
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
