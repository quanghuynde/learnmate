require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { startPaymentSync } = require('./src/services/syncService');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const documentRoutes = require('./src/routes/documentRoutes');
const studyPlanRoutes = require('./src/routes/studyPlanRoutes');
const quizRoutes = require('./src/routes/quizRoutes');
const postRoutes = require('./src/routes/postRoutes');
const examRoutes = require('./src/routes/examRoutes');
const progressRoutes = require('./src/routes/progressRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const ttsRoutes = require('./src/routes/ttsRoutes');
const gamificationRoutes = require('./src/routes/gamificationRoutes');
const aiRoutes = require('./src/routes/aiRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const aiAssistantRoutes = require('./src/routes/aiAssistantRoutes');
const workshopRoutes = require('./src/routes/workshopRoutes');
const errorHandler = require('./src/middleware/errorHandler');
const { startDailyReminderJob } = require('./src/services/dailyReminderService');
const { initCreditRenewalJob } = require('./src/services/creditRenewalService');
const { startWeeklyRankingRewardJob } = require('./src/services/rankingRewardService');

const { resumeProcessing } = require('./src/controllers/documentController');

// Kết nối MongoDB
connectDB().then(() => {
  resumeProcessing();
});
startDailyReminderJob();
initCreditRenewalJob();
startWeeklyRankingRewardJob();

const app = express();

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
        .split(',')
        .map(item => item.trim());
      
      const isAllowed = !origin || 
        allowedOrigins.includes(origin) ||
        /^https?:\/\/(localhost|localhost:\d+|(.*\.)?learnmate\.io\.vn)$/.test(origin);

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
// Allow Google Sign-In popup to communicate back (fixes COOP warning)
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

// Rate limiting can be added later with express-rate-limit
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/study-plans', studyPlanRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai-assistant', aiAssistantRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/workshops', workshopRoutes);

// Health check
app.get('/', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'LearnMate API is running 🚀' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'LearnMate API đang hoạt động ✅' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} không tồn tại` });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  console.log(`📡 Môi trường: ${process.env.NODE_ENV}`);
  console.log(`🔑 Google Client ID: ${process.env.GOOGLE_CLIENT_ID ? 'Đã nạp ✅' : 'Chưa có ❌'}`);
  console.log(`📧 SMTP User: ${process.env.SMTP_USER ? 'Đã nạp ✅' : 'Chưa có ❌'}`);
  
  // Start automated payment synchronization service
  startPaymentSync();
});
