require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const User = require('../src/models/User');
const Exam = require('../src/models/Exam');
const StudySession = require('../src/models/StudySession');
const QuizResult = require('../src/models/QuizResult');
const Notification = require('../src/models/Notification');

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function upsertRival(email, name, xp, streak, level) {
  const existing = await User.findOne({ email });
  if (existing) {
    existing.name = name;
    existing.xp = xp;
    existing.streak = streak;
    existing.level = level;
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  return User.create({
    name,
    email,
    password: 'LearnMate@123',
    xp,
    streak,
    level,
    role: 'student',
    isActive: true,
  });
}

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('Missing MONGODB_URI in backend/.env');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const target = await User.findOne({ email: 'vana@gmail.com' });
  if (!target) {
    throw new Error('User vana@gmail.com not found');
  }

  target.xp = 3450;
  target.level = 7;
  target.streak = 9;
  target.studyGoal = target.studyGoal || 'Dat 8.0+ trong ky thi sap toi';
  target.subjects = Array.from(new Set([...(target.subjects || []), 'Co so du lieu', 'Toan roi rac', 'Lap trinh web']));
  await target.save();

  await upsertRival('an.top1@example.com', 'An Nguyen', 5200, 21, 11);
  await upsertRival('binh.top2@example.com', 'Binh Tran', 4700, 16, 10);
  await upsertRival('chau.top3@example.com', 'Chau Le', 3900, 12, 8);
  await upsertRival('duy.top4@example.com', 'Duy Pham', 3300, 8, 7);

  await Exam.deleteMany({ user: target._id });
  await Exam.insertMany([
    {
      user: target._id,
      name: 'Thi cuoi ky CSDL',
      subject: 'Co so du lieu',
      examDate: new Date('2026-06-18T09:00:00.000Z'),
      readinessScore: 74,
      topicsMastered: 9,
      totalTopics: 14,
      isActive: true,
    },
    {
      user: target._id,
      name: 'Thi giua ky Toan roi rac',
      subject: 'Toan roi rac',
      examDate: new Date('2026-06-12T02:00:00.000Z'),
      readinessScore: 68,
      topicsMastered: 7,
      totalTopics: 12,
      isActive: false,
    },
  ]);

  await StudySession.deleteMany({ user: target._id });
  const sessions = [];
  for (let i = 1; i <= 18; i += 1) {
    sessions.push({
      user: target._id,
      subject: i % 2 === 0 ? 'Co so du lieu' : 'Toan roi rac',
      duration: 45 + (i % 4) * 15,
      type: i % 3 === 0 ? 'quiz' : i % 3 === 1 ? 'reading' : 'review',
      date: daysAgo(i),
      timeOfDay: i % 3 === 0 ? 'evening' : i % 3 === 1 ? 'morning' : 'afternoon',
    });
  }
  await StudySession.insertMany(sessions);

  await QuizResult.deleteMany({ user: target._id });
  await QuizResult.insertMany([
    { user: target._id, score: 18, totalQuestions: 20, percentage: 90, xpEarned: 120, createdAt: daysAgo(2), updatedAt: daysAgo(2) },
    { user: target._id, score: 15, totalQuestions: 20, percentage: 75, xpEarned: 90, createdAt: daysAgo(5), updatedAt: daysAgo(5) },
    { user: target._id, score: 16, totalQuestions: 20, percentage: 80, xpEarned: 100, createdAt: daysAgo(9), updatedAt: daysAgo(9) },
    { user: target._id, score: 14, totalQuestions: 20, percentage: 70, xpEarned: 80, createdAt: daysAgo(13), updatedAt: daysAgo(13) },
  ]);

  await Notification.deleteMany({ user: target._id, type: 'system', 'metadata.seedTag': 'vana_test_seed' });
  await Notification.insertMany([
    {
      user: target._id,
      title: 'Bạn vừa rớt khỏi Top 3 cộng đồng',
      message: 'Bạn vừa bị văng khỏi Top 3 trên Bảng xếp hạng Cộng đồng! Hãy học thêm 30 phút để giành lại vị trí nhé.',
      type: 'system',
      isRead: false,
      metadata: { seedTag: 'vana_test_seed', event: 'leaderboard_drop_top3' },
    },
    {
      user: target._id,
      title: 'Nhắc nhở học tập hôm nay',
      message: 'Bạn còn thiếu 25 phút để đạt mục tiêu học tập hằng ngày.',
      type: 'system',
      isRead: false,
      metadata: { seedTag: 'vana_test_seed' },
    },
  ]);

  const higher = await User.countDocuments({ isActive: true, xp: { $gt: target.xp } });
  const rank = higher + 1;

  console.log('Seed completed for vana@gmail.com');
  console.log(`Current rank estimate: #${rank}`);
  console.log('Added: exams, study sessions, quiz results, notifications, and leaderboard rivals.');

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('Seed failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
