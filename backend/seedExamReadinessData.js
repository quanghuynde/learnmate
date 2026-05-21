/**
 * Script để thêm dữ liệu test cho chức năng Độ sẵn sàng thi
 * Chạy: node seedExamReadinessData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Exam = require('./src/models/Exam');
const Quiz = require('./src/models/Quiz');
const QuizResult = require('./src/models/QuizResult');
const StudySession = require('./src/models/StudySession');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ Không tìm thấy MONGODB_URI trong file .env');
      process.exit(1);
    }
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB Atlas connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    // 1. Tìm user vana@gmail.com
    const user = await User.findOne({ email: 'vana@gmail.com' });
    if (!user) {
      console.error('❌ Không tìm thấy user vana@gmail.com');
      console.log('💡 Vui lòng đăng ký tài khoản này trước');
      return;
    }
    console.log(`✅ Tìm thấy user: ${user.name} (${user.email})`);

    // 2. Tạo kỳ thi
    console.log('\n📝 Tạo kỳ thi...');
    
    // Xóa kỳ thi cũ nếu có
    await Exam.deleteMany({ user: user._id });
    
    const examDate = new Date();
    examDate.setDate(examDate.getDate() + 30); // 30 ngày sau

    const exam = await Exam.create({
      user: user._id,
      name: 'Thi giữa kỳ Toán',
      subject: 'Toán cao cấp',
      examDate: examDate,
      totalTopics: 5,
      isActive: true,
    });
    console.log(`✅ Đã tạo kỳ thi: ${exam.name} - ${examDate.toLocaleDateString('vi-VN')}`);

    // 3. Tạo Quiz
    console.log('\n📚 Tạo Quiz...');
    
    // Xóa quiz cũ
    await Quiz.deleteMany({ user: user._id });

    const subjects = ['Toán', 'Lý', 'Hóa', 'Anh', 'Văn'];
    const quizzes = [];

    for (const subject of subjects) {
      const quiz = await Quiz.create({
        user: user._id,
        title: `Quiz ${subject}`,
        subject: subject,
        format: 'Trắc nghiệm',
        totalQuestions: 10,
        questions: Array(10).fill(null).map((_, i) => ({
          question: `Câu hỏi ${i + 1} về ${subject}`,
          options: ['A', 'B', 'C', 'D'],
          correctIndex: Math.floor(Math.random() * 4),
          explanation: `Giải thích câu ${i + 1}`,
        })),
      });
      quizzes.push(quiz);
    }
    console.log(`✅ Đã tạo ${quizzes.length} quiz`);

    // 4. Tạo Quiz Results (30 ngày qua)
    console.log('\n📊 Tạo Quiz Results...');
    
    // Xóa results cũ
    await QuizResult.deleteMany({ user: user._id });

    const quizResults = [];
    for (let day = 29; day >= 0; day--) {
      const date = new Date();
      date.setDate(date.getDate() - day);

      // Random 1-2 quiz mỗi ngày
      const numQuizzes = Math.random() > 0.5 ? 2 : 1;
      
      for (let i = 0; i < numQuizzes; i++) {
        const quiz = quizzes[Math.floor(Math.random() * quizzes.length)];
        const score = Math.floor(Math.random() * 4) + 6; // 6-10 điểm
        const percentage = (score / 10) * 100;
        const xpEarned = score * 50;

        const result = await QuizResult.create({
          user: user._id,
          quiz: quiz._id,
          score: score,
          totalQuestions: 10,
          percentage: percentage,
          xpEarned: xpEarned,
          answers: Array(10).fill(null).map((_, idx) => ({
            questionIndex: idx,
            selectedAnswer: Math.floor(Math.random() * 4),
            isCorrect: idx < score,
          })),
          createdAt: date,
        });
        quizResults.push(result);
      }
    }
    console.log(`✅ Đã tạo ${quizResults.length} quiz results`);

    // 5. Tạo Study Sessions (30 ngày qua)
    console.log('\n⏱️  Tạo Study Sessions...');
    
    // Xóa sessions cũ
    await StudySession.deleteMany({ user: user._id });

    const studySessions = [];
    const timeOfDayOptions = ['morning', 'afternoon', 'evening'];
    const typeOptions = ['reading', 'quiz', 'review', 'video'];

    for (let day = 29; day >= 0; day--) {
      const date = new Date();
      date.setDate(date.getDate() - day);

      // Random 2-4 sessions mỗi ngày
      const numSessions = Math.floor(Math.random() * 3) + 2;
      
      for (let i = 0; i < numSessions; i++) {
        const subject = subjects[Math.floor(Math.random() * subjects.length)];
        const duration = Math.floor(Math.random() * 60) + 30; // 30-90 phút
        const timeOfDay = timeOfDayOptions[Math.floor(Math.random() * timeOfDayOptions.length)];
        const type = typeOptions[Math.floor(Math.random() * typeOptions.length)];

        const session = await StudySession.create({
          user: user._id,
          subject: subject,
          duration: duration,
          type: type,
          date: date,
          timeOfDay: timeOfDay,
        });
        studySessions.push(session);
      }
    }
    console.log(`✅ Đã tạo ${studySessions.length} study sessions`);

    // 6. Cập nhật User XP và Level
    console.log('\n🎮 Cập nhật User XP...');
    const totalXP = quizResults.reduce((sum, r) => sum + r.xpEarned, 0);
    user.xp = totalXP;
    user.level = Math.floor(totalXP / 500) + 1;
    user.streak = 15; // 15 ngày streak
    await user.save();
    console.log(`✅ User XP: ${user.xp}, Level: ${user.level}, Streak: ${user.streak}`);

    // 7. Tổng kết
    console.log('\n' + '='.repeat(50));
    console.log('✅ HOÀN TẤT! Dữ liệu test đã được tạo:');
    console.log('='.repeat(50));
    console.log(`👤 User: ${user.name} (${user.email})`);
    console.log(`📝 Kỳ thi: ${exam.name}`);
    console.log(`📅 Ngày thi: ${examDate.toLocaleDateString('vi-VN')} (còn 30 ngày)`);
    console.log(`📚 Quiz: ${quizzes.length} quiz`);
    console.log(`📊 Quiz Results: ${quizResults.length} kết quả`);
    console.log(`⏱️  Study Sessions: ${studySessions.length} phiên học`);
    console.log(`🎮 XP: ${user.xp}, Level: ${user.level}, Streak: ${user.streak}`);
    console.log('='.repeat(50));
    console.log('\n💡 Bây giờ bạn có thể:');
    console.log('   1. Đăng nhập với vana@gmail.com');
    console.log('   2. Vào trang "Độ sẵn sàng thi"');
    console.log('   3. Xem phân tích chi tiết!\n');

  } catch (error) {
    console.error('❌ Lỗi khi seed data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Đã đóng kết nối MongoDB');
  }
};

// Chạy script
(async () => {
  await connectDB();
  await seedData();
})();
