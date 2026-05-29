const QuizResult = require('../models/QuizResult');
const StudySession = require('../models/StudySession');
const Exam = require('../models/Exam');

/**
 * Tính điểm sẵn sàng tổng hợp (0-100)
 * Công thức:
 * - Quiz accuracy: 40%
 * - Study hours: 30%
 * - Topics coverage: 20%
 * - Consistency: 10%
 */
const calculateReadinessScore = async (userId, examId) => {
  try {
    const exam = await Exam.findById(examId);
    if (!exam) return 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Quiz Accuracy (40 points)
    const quizResults = await QuizResult.find({
      user: userId,
      createdAt: { $gte: thirtyDaysAgo },
    }).populate('quiz', 'subject');

    let quizScore = 0;
    if (quizResults.length > 0) {
      const avgAccuracy = quizResults.reduce((sum, r) => sum + r.percentage, 0) / quizResults.length;
      quizScore = (avgAccuracy / 100) * 40;
    }

    // 2. Study Hours (30 points)
    const sessions = await StudySession.find({
      user: userId,
      date: { $gte: thirtyDaysAgo },
    });

    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalHours = totalMinutes / 60;
    // Giả sử 30 giờ học = full 30 points
    const hoursScore = Math.min((totalHours / 30) * 30, 30);

    // 3. Topics Coverage (20 points)
    const uniqueSubjects = new Set();
    quizResults.forEach((r) => {
      if (r.quiz?.subject) uniqueSubjects.add(r.quiz.subject);
    });
    sessions.forEach((s) => {
      if (s.subject) uniqueSubjects.add(s.subject);
    });

    const topicsCovered = uniqueSubjects.size;
    const expectedTopics = exam.totalTopics || 5;
    const topicsScore = Math.min((topicsCovered / expectedTopics) * 20, 20);

    // 4. Consistency (10 points) - dựa trên số ngày học
    const uniqueDays = new Set(sessions.map((s) => s.date.toISOString().split('T')[0]));
    const daysActive = uniqueDays.size;
    const consistencyScore = Math.min((daysActive / 20) * 10, 10);

    const totalScore = Math.round(quizScore + hoursScore + topicsScore + consistencyScore);
    return Math.min(totalScore, 100);
  } catch (error) {
    console.error('Error calculating readiness score:', error);
    return 0;
  }
};

/**
 * Lấy data cho radar chart - phân tích theo subjects
 */
const getRadarChartData = async (userId, examId) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const quizResults = await QuizResult.find({
      user: userId,
      createdAt: { $gte: thirtyDaysAgo },
    }).populate('quiz', 'subject');

    const sessions = await StudySession.find({
      user: userId,
      date: { $gte: thirtyDaysAgo },
    });

    // Aggregate by subject
    const subjectData = {};

    quizResults.forEach((result) => {
      const subject = result.quiz?.subject || 'Khác';
      if (!subjectData[subject]) {
        subjectData[subject] = { quizCount: 0, totalPercentage: 0, studyTime: 0 };
      }
      subjectData[subject].quizCount++;
      subjectData[subject].totalPercentage += result.percentage;
    });

    sessions.forEach((session) => {
      const subject = session.subject || 'Khác';
      if (!subjectData[subject]) {
        subjectData[subject] = { quizCount: 0, totalPercentage: 0, studyTime: 0 };
      }
      subjectData[subject].studyTime += session.duration;
    });

    // Calculate score for each subject
    const radarData = Object.keys(subjectData).map((subject) => {
      const data = subjectData[subject];
      const avgQuizScore = data.quizCount > 0 ? data.totalPercentage / data.quizCount : 0;
      const studyHours = data.studyTime / 60;
      
      // Weighted score: 70% quiz, 30% study time
      const quizWeight = avgQuizScore * 0.7;
      const timeWeight = Math.min((studyHours / 5) * 100, 100) * 0.3;
      const score = Math.round(quizWeight + timeWeight);

      return {
        subject,
        A: Math.min(score, 100),
      };
    });

    // Nếu không có data, trả về empty array
    return radarData.length > 0 ? radarData : [];
  } catch (error) {
    console.error('Error getting radar chart data:', error);
    return [];
  }
};

/**
 * Lấy xu hướng readiness theo ngày (30 ngày)
 */
const getTrendData = async (userId, examId, days = 30) => {
  try {
    const trendData = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Get quiz results up to this date
      const quizResults = await QuizResult.find({
        user: userId,
        createdAt: { $lte: date },
      }).limit(10).sort({ createdAt: -1 });

      // Get study sessions up to this date
      const sessions = await StudySession.find({
        user: userId,
        date: { $lte: date },
      }).limit(20).sort({ date: -1 });

      let score = 0;
      if (quizResults.length > 0 || sessions.length > 0) {
        // Simple calculation based on recent performance
        const avgQuiz = quizResults.length > 0
          ? quizResults.reduce((sum, r) => sum + r.percentage, 0) / quizResults.length
          : 0;
        
        const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
        const hoursBonus = Math.min((totalMinutes / 60) / 20 * 30, 30);
        
        score = Math.round((avgQuiz * 0.7) + hoursBonus);
      }

      trendData.push({
        day: (days - i).toString(),
        score: Math.min(score, 100),
      });
    }

    return trendData;
  } catch (error) {
    console.error('Error getting trend data:', error);
    return [];
  }
};

/**
 * Phân tích chi tiết từng chủ đề
 */
const getTopicsAnalysis = async (userId, examId) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const quizResults = await QuizResult.find({
      user: userId,
      createdAt: { $gte: thirtyDaysAgo },
    }).populate('quiz', 'subject title');

    const sessions = await StudySession.find({
      user: userId,
      date: { $gte: thirtyDaysAgo },
    });

    // Aggregate by subject
    const topicData = {};

    quizResults.forEach((result) => {
      const subject = result.quiz?.subject || result.quiz?.title || 'Chủ đề khác';
      if (!topicData[subject]) {
        topicData[subject] = { quizCount: 0, totalPercentage: 0, studyTime: 0 };
      }
      topicData[subject].quizCount++;
      topicData[subject].totalPercentage += result.percentage;
    });

    sessions.forEach((session) => {
      const subject = session.subject || 'Chủ đề khác';
      if (!topicData[subject]) {
        topicData[subject] = { quizCount: 0, totalPercentage: 0, studyTime: 0 };
      }
      topicData[subject].studyTime += session.duration;
    });

    // Format topics
    const topics = Object.keys(topicData).map((name) => {
      const data = topicData[name];
      const avgScore = data.quizCount > 0 ? Math.round(data.totalPercentage / data.quizCount) : 0;
      const hours = Math.round((data.studyTime / 60) * 10) / 10;

      let status = 'Nguy hiểm';
      let color = 'bg-danger text-danger';
      
      if (avgScore >= 80) {
        status = 'Tốt';
        color = 'bg-success text-success';
      } else if (avgScore >= 60) {
        status = 'Cần ôn';
        color = 'bg-warning text-warning';
      }

      return {
        name,
        score: avgScore,
        time: `${hours}h`,
        status,
        color,
      };
    });

    return topics.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Error getting topics analysis:', error);
    return [];
  }
};

/**
 * Lấy metrics tổng quan
 */
const getOverallMetrics = async (userId, examId) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const quizResults = await QuizResult.find({
      user: userId,
      createdAt: { $gte: thirtyDaysAgo },
    });

    const sessions = await StudySession.find({
      user: userId,
      date: { $gte: thirtyDaysAgo },
    });

    // Quiz accuracy
    const quizAccuracy = quizResults.length > 0
      ? Math.round(quizResults.reduce((sum, r) => sum + r.percentage, 0) / quizResults.length)
      : 0;

    // Total hours
    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    // Topics mastered
    const uniqueSubjects = new Set();
    quizResults.forEach((r) => {
      if (r.quiz?.subject) uniqueSubjects.add(r.quiz.subject);
    });
    sessions.forEach((s) => {
      if (s.subject) uniqueSubjects.add(s.subject);
    });

    const exam = await Exam.findById(examId);
    const totalTopics = exam?.totalTopics || uniqueSubjects.size || 5;
    const topicsMastered = uniqueSubjects.size;

    return {
      quizAccuracy,
      totalHours,
      topicsMastered,
      totalTopics,
    };
  } catch (error) {
    console.error('Error getting overall metrics:', error);
    return {
      quizAccuracy: 0,
      totalHours: 0,
      topicsMastered: 0,
      totalTopics: 0,
    };
  }
};

module.exports = {
  calculateReadinessScore,
  getRadarChartData,
  getTrendData,
  getTopicsAnalysis,
  getOverallMetrics,
};
