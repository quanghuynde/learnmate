const mongoose = require('mongoose');
const StudySession = require('../models/StudySession');
const QuizResult = require('../models/QuizResult');

// @desc    Ghi nhận phiên học tập
// @route   POST /api/progress/sessions
const createSession = async (req, res) => {
  try {
    const { subject, duration, type, date, timeOfDay } = req.body;
    const session = await StudySession.create({
      user: req.user.id,
      subject,
      duration,
      type,
      date: date || new Date(),
      timeOfDay,
    });
    res.status(201).json({ message: 'Ghi nhận thành công', session });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Lấy tổng quan tiến độ (365 ngày)
// @route   GET /api/progress/overview
const getOverview = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Tổng quát chung (30 ngày gần nhất cho các thẻ chính)
    const recentSessions = await StudySession.find({
      user: userId,
      date: { $gte: thirtyDaysAgo },
    });

    const totalMinutes = recentSessions.reduce((sum, s) => sum + s.duration, 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    
    const daysActive = new Set(recentSessions.map((s) => s.date.toISOString().split('T')[0])).size;
    const avgDaily = daysActive > 0 ? Math.round((totalHours / daysActive) * 10) / 10 : 0;

    // 2. Phân bổ thời gian (30 ngày)
    const timeDistribution = { morning: 0, afternoon: 0, evening: 0 };
    recentSessions.forEach((s) => {
      if (timeDistribution.hasOwnProperty(s.timeOfDay)) {
        timeDistribution[s.timeOfDay] += s.duration;
      }
    });
    const totalDist = timeDistribution.morning + timeDistribution.afternoon + timeDistribution.evening;
    const distribution = {
      morning: totalDist > 0 ? Math.round((timeDistribution.morning / totalDist) * 100) : 0,
      afternoon: totalDist > 0 ? Math.round((timeDistribution.afternoon / totalDist) * 100) : 0,
      evening: totalDist > 0 ? Math.round((timeDistribution.evening / totalDist) * 100) : 0,
    };

    // 3. Toàn diện dữ liệu biểu đồ nhiệt (365 ngày)
    const [studyAgg, quizAgg, usageAgg, docAgg] = await Promise.all([
      // Study Sessions
      StudySession.aggregate([
        { $match: { user: userId, date: { $gte: oneYearAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, minutes: { $sum: '$duration' } } }
      ]),
      // Quiz Results
      QuizResult.aggregate([
        { $match: { user: userId, createdAt: { $gte: oneYearAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }
      ]),
      // AI Usage
      require('../models/UsageLog').aggregate([
        { $match: { userId, status: 'success', createdAt: { $gte: oneYearAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }
      ]),
      // Document Uploads
      require('../models/Document').aggregate([
        { $match: { user: userId, createdAt: { $gte: oneYearAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }
      ])
    ]);

    // Map kết quả aggregation vào mảng liên tục
    const heatmapMap = new Map();

    const process = (agg, weight, type = 'count') => {
      agg.forEach(item => {
        const current = heatmapMap.get(item._id) || 0;
        const val = type === 'minutes' ? Math.min(10, Math.floor(item.minutes / 10)) : item.count * weight;
        heatmapMap.set(item._id, current + val);
      });
    };

    process(studyAgg, 1, 'minutes');
    process(quizAgg, 3);
    process(usageAgg, 2);
    process(docAgg, 2);

    const chartData = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      chartData.push({
        date: dateStr,
        score: heatmapMap.get(dateStr) || 0,
      });
    }

    const quizCount = await QuizResult.countDocuments({
      user: userId,
      createdAt: { $gte: thirtyDaysAgo },
    });

    const studyHoursData = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const daySessions = recentSessions.filter(s => s.date.toISOString().split('T')[0] === dateStr);
      const dayMinutes = daySessions.reduce((sum, s) => sum + s.duration, 0);
      
      studyHoursData.push({
        day: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        hours: Math.round((dayMinutes / 60) * 10) / 10
      });
    }

    res.json({
      totalHours,
      avgDaily,
      totalQuizzes: quizCount,
      distribution,
      chartData, // For Heatmap (365 days)
      studyHoursData, // For Progress Chart (30 days)
    });
  } catch (error) {
    console.error('Error in getOverview:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Lấy lịch sử phiên học tập
// @route   GET /api/progress/sessions
const getSessions = async (req, res) => {
  try {
    const sessions = await StudySession.find({ user: req.user.id })
      .sort({ date: -1 })
      .limit(50);
    res.json({ count: sessions.length, sessions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createSession, getOverview, getSessions };
