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
/**
 * Tính điểm sẵn sàng tổng hợp (0-100)
 */
const calculateReadinessScore = async (userId, examId, quizResults, sessions) => {
  try {
    const exam = await Exam.findById(examId);
    if (!exam) return 0;

    // 1. Quiz Accuracy (40 points)
    let quizScore = 0;
    if (quizResults.length > 0) {
      const avgAccuracy = quizResults.reduce((sum, r) => sum + r.percentage, 0) / quizResults.length;
      quizScore = (avgAccuracy / 100) * 40;
    }

    // 2. Study Hours (30 points)
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
const getRadarChartData = async (quizResults, sessions) => {
  try {
    // Aggregation by subject
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

    return radarData;
  } catch (error) {
    console.error('Error getting radar chart data:', error);
    return [];
  }
};

/**
 * Lấy xu hướng readiness theo ngày (30 ngày)
 */
const getTrendData = async (userId, examId, allQuizResults, allSessions, days = 30) => {
  try {
    const today = new Date();
    const trendData = [];
    
    // Process data day by day in memory
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      // Filter local results up to this day's end
      const dayQuizzes = allQuizResults.filter(r => new Date(r.createdAt) <= dayEnd);
      const daySessions = allSessions.filter(s => new Date(s.date) <= dayEnd);

      let score = 0;
      if (dayQuizzes.length > 0 || daySessions.length > 0) {
        // Simple calculation based on performance up to this date
        const recentQuizzes = dayQuizzes.slice(-10);
        const avgQuiz = recentQuizzes.length > 0
          ? recentQuizzes.reduce((sum, r) => sum + r.percentage, 0) / recentQuizzes.length
          : 0;
        
        const recentSessions = daySessions.slice(-20);
        const totalMinutes = recentSessions.reduce((sum, s) => sum + s.duration, 0);
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
const getTopicsAnalysis = async (quizResults, sessions) => {
  try {
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

      return { name, score: avgScore, time: `${hours}h`, status, color };
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
const getOverallMetrics = async (examId, quizResults, sessions) => {
  try {
    const quizAccuracy = quizResults.length > 0
      ? Math.round(quizResults.reduce((sum, r) => sum + r.percentage, 0) / quizResults.length)
      : 0;

    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    const uniqueSubjects = new Set();
    quizResults.forEach((r) => { if (r.quiz?.subject) uniqueSubjects.add(r.quiz.subject); });
    sessions.forEach((s) => { if (s.subject) uniqueSubjects.add(s.subject); });

    const exam = await Exam.findById(examId);
    const totalTopics = exam?.totalTopics || uniqueSubjects.size || 5;
    const topicsMastered = uniqueSubjects.size;

    return { quizAccuracy, totalHours, topicsMastered, totalTopics };
  } catch (error) {
    console.error('Error getting overall metrics:', error);
    return { quizAccuracy: 0, totalHours: 0, topicsMastered: 0, totalTopics: 0 };
  }
};

module.exports = {
  calculateReadinessScore,
  getRadarChartData,
  getTrendData,
  getTopicsAnalysis,
  getOverallMetrics,
};
