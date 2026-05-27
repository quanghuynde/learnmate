require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const u = await User.findOne({ email: 'vana@gmail.com' });
  if (!u) throw new Error('User vana@gmail.com not found');

  u.xp = 3450;
  u.level = 7;
  await u.save();

  await User.updateOne({ email: 'an.top1@example.com' }, { $set: { xp: 5200, level: 11, streak: 21, isActive: true } });
  await User.updateOne({ email: 'binh.top2@example.com' }, { $set: { xp: 5000, level: 10, streak: 16, isActive: true } });
  await User.updateOne({ email: 'chau.top3@example.com' }, { $set: { xp: 3900, level: 8, streak: 12, isActive: true } });
  await User.updateOne({ email: 'duy.top4@example.com' }, { $set: { xp: 3600, level: 7, streak: 9, isActive: true } });

  console.log('vana scenario set to DROP (around TOP 4)');
  await mongoose.disconnect();
}
run().catch(async (e) => { console.error(e.message); try { await mongoose.disconnect(); } catch (_) {} process.exit(1); });
