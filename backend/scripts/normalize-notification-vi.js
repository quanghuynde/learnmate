require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Notification = require('../src/models/Notification');

async function normalizeUserNotifications(email) {
  const user = await User.findOne({ email });
  if (!user) {
    console.log(`Skip ${email}: user not found`);
    return;
  }

  await Notification.updateMany(
    {
      user: user._id,
      $or: [
        { 'metadata.event': 'leaderboard_drop_top3' },
        { title: { $regex: 'Ban vua (roi|rot) khoi Top 3', $options: 'i' } },
        { message: { $regex: 'Ban vua bi vang khoi Top 3', $options: 'i' } },
      ],
    },
    {
      $set: {
        title: 'Bạn vừa rớt khỏi Top 3 cộng đồng',
        message:
          'Bạn vừa bị văng khỏi Top 3 trên Bảng xếp hạng Cộng đồng! Hãy học thêm 30 phút để giành lại vị trí nhé.',
      },
    }
  );

  await Notification.updateMany(
    {
      user: user._id,
      $or: [
        { title: { $regex: 'Nhac nho hoc tap hom nay', $options: 'i' } },
        { message: { $regex: 'Ban con thieu 25 phut', $options: 'i' } },
      ],
    },
    {
      $set: {
        title: 'Nhắc nhở học tập hôm nay',
        message: 'Bạn còn thiếu 25 phút để đạt mục tiêu học tập hằng ngày.',
      },
    }
  );

  const count = await Notification.countDocuments({ user: user._id });
  console.log(`${email}: normalized notifications, total=${count}`);
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await normalizeUserNotifications('vana@gmail.com');
  await mongoose.disconnect();
  console.log('Done');
})().catch(async (e) => {
  console.error(e.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
