/**
 * Script để XÓA dữ liệu test cho chức năng Độ sẵn sàng thi
 * Chạy: node cleanExamReadinessData.js
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

const cleanData = async () => {
  try {
    // 1. Tìm user vana@gmail.com
    const user = await User.findOne({ email: 'vana@gmail.com' });
    if (!user) {
      console.error('❌ Không tìm thấy user vana@gmail.com');
      return;
    }
    console.log(`✅ Tìm thấy user: ${user.name} (${user.email})`);

    console.log('\n🗑️  Đang xóa dữ liệu test...\n');

    // 2. Xóa Exams
    const deletedExams = await Exam.deleteMany({ user: user._id });
    console.log(`✅ Đã xóa ${deletedExams.deletedCount} kỳ thi`);

    // 3. Xóa Quizzes
    const deletedQuizzes = await Quiz.deleteMany({ user: user._id });
    console.log(`✅ Đã xóa ${deletedQuizzes.deletedCount} quiz`);

    // 4. Xóa Quiz Results
    const deletedResults = await QuizResult.deleteMany({ user: user._id });
    console.log(`✅ Đã xóa ${deletedResults.deletedCount} quiz results`);

    // 5. Xóa Study Sessions
    const deletedSessions = await StudySession.deleteMany({ user: user._id });
    console.log(`✅ Đã xóa ${deletedSessions.deletedCount} study sessions`);

    // 6. Reset User stats (optional)
    user.xp = 0;
    user.level = 1;
    user.streak = 0;
    await user.save();
    console.log(`✅ Đã reset XP, Level, Streak về 0`);

    // 7. Tổng kết
    console.log('\n' + '='.repeat(50));
    console.log('✅ HOÀN TẤT! Đã xóa tất cả dữ liệu test');
    console.log('='.repeat(50));
    console.log(`👤 User: ${user.name} (${user.email})`);
    console.log(`🗑️  Đã xóa:`);
    console.log(`   - ${deletedExams.deletedCount} kỳ thi`);
    console.log(`   - ${deletedQuizzes.deletedCount} quiz`);
    console.log(`   - ${deletedResults.deletedCount} quiz results`);
    console.log(`   - ${deletedSessions.deletedCount} study sessions`);
    console.log(`   - Reset XP, Level, Streak`);
    console.log('='.repeat(50));
    console.log('\n💡 Tài khoản đã sạch sẽ như ban đầu!\n');

  } catch (error) {
    console.error('❌ Lỗi khi xóa data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Đã đóng kết nối MongoDB');
  }
};

// Chạy script
(async () => {
  await connectDB();
  await cleanData();
})();
