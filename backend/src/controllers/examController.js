const Exam = require('../models/Exam');
const QuizResult = require('../models/QuizResult');
const StudySession = require('../models/StudySession');
const {
  calculateReadinessScore,
  getRadarChartData,
  getTrendData,
  getTopicsAnalysis,
  getOverallMetrics,
} = require('../services/examAnalyticsService');

// @desc    Lấy danh sách kỳ thi
// @route   GET /api/exams
const getExams = async (req, res) => {
  try {
    const exams = await Exam.find({ user: req.user.id }).sort({ examDate: 1 });
    res.json({ count: exams.length, exams });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Tạo kỳ thi mới
// @route   POST /api/exams
const createExam = async (req, res) => {
  try {
    const { name, subject, examDate, totalTopics } = req.body;
    const exam = await Exam.create({
      user: req.user.id,
      name,
      subject,
      examDate,
      totalTopics: totalTopics || 0,
    });
    res.status(201).json({ message: 'Tạo kỳ thi thành công', exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cập nhật kỳ thi
// @route   PUT /api/exams/:id
const updateExam = async (req, res) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!exam) {
      return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
    }
    res.json({ message: 'Cập nhật thành công', exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Xóa kỳ thi
// @route   DELETE /api/exams/:id
const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!exam) {
      return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
    }
    res.json({ message: 'Đã xóa kỳ thi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Lấy phân tích độ sẵn sàng thi
// @route   GET /api/exams/:id/readiness
const getExamReadiness = async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, user: req.user.id });
    if (!exam) {
      return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
    }

    const today = new Date();
    const examDate = new Date(exam.examDate);
    const daysRemaining = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));

    // Pre-fetch raw data for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [quizResults, sessions] = await Promise.all([
      QuizResult.find({
        user: req.user.id,
        createdAt: { $gte: thirtyDaysAgo }
      }).populate('quiz', 'subject title'),
      StudySession.find({
        user: req.user.id,
        date: { $gte: thirtyDaysAgo }
      })
    ]);

    // Use pre-fetched data for analytics
    const readinessScore = await calculateReadinessScore(req.user.id, exam._id, quizResults, sessions);
    const metrics = await getOverallMetrics(exam._id, quizResults, sessions);
    const radarData = await getRadarChartData(quizResults, sessions);
    const trendData = await getTrendData(req.user.id, exam._id, quizResults, sessions, 30);
    const topics = await getTopicsAnalysis(quizResults, sessions);

    // Update exam readiness score
    exam.readinessScore = readinessScore;
    exam.topicsMastered = metrics.topicsMastered;
    await exam.save();

    res.json({
      exam: {
        _id: exam._id,
        name: exam.name,
        subject: exam.subject,
        examDate: exam.examDate,
        daysRemaining,
      },
      readinessScore,
      metrics,
      radarData,
      trendData,
      topics,
    });
  } catch (error) {
    console.error('Error in getExamReadiness:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getExams, createExam, updateExam, deleteExam, getExamReadiness };
