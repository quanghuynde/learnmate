const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const StudySession = require('../models/StudySession');
const User = require('../models/User');
const { createUserNotification } = require('../services/notificationService');
const { updateStreak } = require('../services/userService');

const getQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ user: req.user.id }).populate('document', 'name type').sort({ createdAt: -1 });
    res.json({ count: quizzes.length, quizzes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createQuiz = async (req, res) => {
  try {
    const { title, subject, document, format, totalQuestions, questions } = req.body;

    // Check quiz limit based on subscription tier
    let tier = req.user.subscriptionTier || 'Basic';
    if (tier !== 'Basic' && req.user.subscriptionExpiresAt && new Date(req.user.subscriptionExpiresAt) < new Date()) {
      tier = 'Basic';
    }

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const currentQuizCount = await Quiz.countDocuments({ 
      user: req.user.id,
      createdAt: { $gte: fourteenDaysAgo }
    });

    const limits = { 'Basic': 30, 'Pro': 60, 'Premium': Infinity };
    const userLimit = limits[tier] || 30;

    if (currentQuizCount >= userLimit) {
      return res.status(403).json({ 
        message: `Bạn đã đạt giới hạn tạo Quiz trong 14 ngày qua (${userLimit} bài) cho gói ${tier}. Lượt tạo mới sẽ được hồi lại sau khi các bài cũ quá 14 ngày.` 
      });
    }

    const quiz = await Quiz.create({ user: req.user.id, title, subject, document, format, totalQuestions, questions });

    // Await notification
    await createUserNotification(req.user.id, {
      title: 'Quiz mới đã được tạo',
      message: `Quiz "${title}" (${format}) đã sẵn sàng.`,
      type: 'quiz_created',
      emailSubject: 'LearnMate - Quiz mới',
      metadata: { 
        title, 
        format, 
        totalQuestions,
        quizId: quiz._id.toString() 
      },
    });

    res.status(201).json({ message: 'Tạo quiz thành công', quiz });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, user: req.user.id }).populate('document', 'name type');
    if (!quiz) return res.status(404).json({ message: 'Không tìm thấy quiz' });
    res.json({ quiz });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const submitQuiz = async (req, res) => {
  try {
    const { answers } = req.body;
    console.log('Submitting quiz result for ID:', req.params.id);
    console.log('Answers received:', JSON.stringify(answers));

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      console.log('Quiz not found for ID:', req.params.id);
      return res.status(404).json({ message: 'Không tìm thấy quiz' });
    }

    let score = 0;
    const processedAnswers = answers.map((a) => {
      const isCorrect = quiz.questions[a.questionIndex]?.correctIndex === a.selectedAnswer;
      if (isCorrect) score++;
      return { ...a, isCorrect };
    });

    const total = quiz.questions.length || 1;
    const percentage = Math.round((score / total) * 100);
    const xpEarned = score * 50;

    const savedResult = await QuizResult.create({ user: req.user.id, quiz: quiz._id, score, totalQuestions: total, percentage, xpEarned, answers: processedAnswers });
    console.log('Quiz result saved successfully:', savedResult._id);

    // Record study session automatically based on server time
    const hour = new Date().getHours();
    let timeOfDay = 'evening';
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';

    await StudySession.create({
      user: req.user.id,
      subject: quiz.title || quiz.subject || 'Quiz',
      duration: Math.max(5, total * 2),
      type: 'quiz',
      timeOfDay,
    });

    const user = await User.findById(req.user.id);
    user.xp += xpEarned;
    user.monthlyXP = (user.monthlyXP || 0) + xpEarned;
    user.level = Math.floor(user.xp / 500) + 1;
    await user.save();
    await updateStreak(user);

    // Await notification
    await createUserNotification(req.user.id, {
      title: 'Kết quả quiz mới',
      message: `Bạn đạt ${percentage}% cho quiz "${quiz.title}".`,
      type: 'quiz_result',
      emailSubject: 'LearnMate - Kết quả quiz',
      metadata: { 
        title: quiz.title,
        quizId: quiz._id.toString(), 
        percentage,
        score,
        totalQuestions: total,
        xpEarned
      },
      sendMail: true,
    });

    res.status(201).json({ message: 'Nộp bài thành công', result: { score, totalQuestions: total, percentage, xpEarned, answers: processedAnswers } });
  } catch (error) {
    console.error('Error in submitQuiz:', error);
    res.status(500).json({ message: error.message });
  }
};

const getQuizHistory = async (req, res) => {
  try {
    const results = await QuizResult.find({ user: req.user.id }).populate('quiz', 'title subject questions format').sort({ createdAt: -1 }).limit(20);
    res.json({ count: results.length, results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!quiz) {
      return res.status(404).json({ message: 'Không tìm thấy quiz hoặc bạn không có quyền xóa' });
    }
    
    // Also delete associated results
    await QuizResult.deleteMany({ quiz: req.params.id });
    
    res.json({ message: 'Đã xóa quiz thành công' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getQuizzes, createQuiz, getQuiz, submitQuiz, getQuizHistory, deleteQuiz };
