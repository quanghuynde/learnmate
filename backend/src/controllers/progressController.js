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

// @desc    Lấy tổng quan tiến độ
// @route   GET /api/progress/overview
const getOverview = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sessions = await StudySession.find({
      user: req.user.id,
      date: { $gte: thirtyDaysAgo },
    });

    const quizResults = await QuizResult.find({
      user: req.user.id,
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Tổng thời gian (phút -> giờ)
    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

    // TB hàng ngày
    const daysActive = new Set(sessions.map((s) => s.date.toISOString().split('T')[0])).size;
    const avgDaily = daysActive > 0 ? Math.round(totalHours / daysActive * 10) / 10 : 0;

    // Phân bổ thời gian theo buổi
    const timeDistribution = { morning: 0, afternoon: 0, evening: 0 };
    sessions.forEach((s) => {
      timeDistribution[s.timeOfDay] += s.duration;
    });
    const totalDist = timeDistribution.morning + timeDistribution.afternoon + timeDistribution.evening;
    const distribution = {
      morning: totalDist > 0 ? Math.round((timeDistribution.morning / totalDist) * 100) : 0,
      afternoon: totalDist > 0 ? Math.round((timeDistribution.afternoon / totalDist) * 100) : 0,
      evening: totalDist > 0 ? Math.round((timeDistribution.evening / totalDist) * 100) : 0,
    };

    // Dữ liệu biểu đồ (giờ học theo ngày)
    const chartData = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dayMinutes = sessions
        .filter((s) => s.date.toISOString().split('T')[0] === dateStr)
        .reduce((sum, s) => sum + s.duration, 0);
      chartData.push({ day: (i + 1).toString(), hours: Math.round(dayMinutes / 60 * 10) / 10 });
    }

    res.json({
      totalHours,
      avgDaily,
      totalQuizzes: quizResults.length,
      distribution,
      chartData,
    });
  } catch (error) {
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
