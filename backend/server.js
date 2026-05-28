require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
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
const aiAssistantRoutes = require('./src/routes/aiAssistantRoutes');
const errorHandler = require('./src/middleware/errorHandler');

// Kết nối MongoDB
connectDB();

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
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
app.use('/api/ai-assistant', aiAssistantRoutes);

// Health check
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
});
