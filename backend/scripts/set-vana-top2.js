require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const u = await User.findOne({ email: 'vana@gmail.com' });
  if (!u) throw new Error('User vana@gmail.com not found');

  u.xp = 4900;
  u.level = 10;
  u.streak = Math.max(u.streak || 0, 10);
  await u.save();

  await User.updateOne({ email: 'an.top1@example.com' }, { $set: { xp: 5200, level: 11, streak: 21, isActive: true } });
  await User.updateOne({ email: 'binh.top2@example.com' }, { $set: { xp: 4700, level: 10, streak: 16, isActive: true } });
  await User.updateOne({ email: 'chau.top3@example.com' }, { $set: { xp: 4600, level: 9, streak: 13, isActive: true } });
  await User.updateOne({ email: 'duy.top4@example.com' }, { $set: { xp: 3300, level: 7, streak: 8, isActive: true } });

  console.log('vana scenario set to TOP 2');
  await mongoose.disconnect();
}
run().catch(async (e) => { console.error(e.message); try { await mongoose.disconnect(); } catch (_) {} process.exit(1); });
