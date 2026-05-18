const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const User = require('../models/User');
const { createUserNotification } = require('../services/notificationService');

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
    const quiz = await Quiz.create({ user: req.user.id, title, subject, document, format, totalQuestions, questions });

    await createUserNotification(req.user.id, {
      title: 'Quiz mới đã được tạo',
      message: `Quiz "${title}" (${format}) đã sẵn sàng.`,
      type: 'quiz',
      emailSubject: 'LearnMate - Quiz mới',
      emailText: `Bạn vừa tạo quiz mới: ${title} (${format}).`,
      metadata: { quizId: quiz._id.toString() },
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
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Không tìm thấy quiz' });

    let score = 0;
    const processedAnswers = answers.map((a) => {
      const isCorrect = quiz.questions[a.questionIndex]?.correctIndex === a.selectedAnswer;
      if (isCorrect) score++;
      return { ...a, isCorrect };
    });

    const total = quiz.questions.length || 1;
    const percentage = Math.round((score / total) * 100);
    const xpEarned = score * 50;

    await QuizResult.create({ user: req.user.id, quiz: quiz._id, score, totalQuestions: total, percentage, xpEarned, answers: processedAnswers });

    const user = await User.findById(req.user.id);
    user.xp += xpEarned;
    user.level = Math.floor(user.xp / 500) + 1;
    await user.save();

    await createUserNotification(req.user.id, {
      title: 'Kết quả quiz mới',
      message: `Bạn đạt ${percentage}% cho quiz "${quiz.title}".`,
      type: 'quiz',
      emailSubject: 'LearnMate - Kết quả quiz',
      emailText: `Kết quả quiz ${quiz.title}: ${percentage}% (${score}/${total}).`,
      metadata: { quizId: quiz._id.toString(), percentage },
      sendMail: true,
    });

    res.status(201).json({ message: 'Nộp bài thành công', result: { score, totalQuestions: total, percentage, xpEarned, answers: processedAnswers } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getQuizHistory = async (req, res) => {
  try {
    const results = await QuizResult.find({ user: req.user.id }).populate('quiz', 'title subject').sort({ createdAt: -1 }).limit(20);
    res.json({ count: results.length, results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getQuizzes, createQuiz, getQuiz, submitQuiz, getQuizHistory };
