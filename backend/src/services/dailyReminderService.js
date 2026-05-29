const cron = require('node-cron');
const User = require('../models/User');
const sendEmail = require('./emailService');
const { createUserNotification } = require('./notificationService');

const TZ = process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh';
const SCAN_CRON = process.env.DAILY_REMINDER_SCAN_CRON || '* * * * *';

function getCurrentTimeHHmm() {
  const now = new Date();
  const localTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
  return localTime;
}

function getCurrentDateKey() {
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function getDateKeyFromDate(date) {
  if (!date) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

async function sendDailyReminderEmails() {
  const currentHHmm = getCurrentTimeHHmm();
  const todayKey = getCurrentDateKey();

  const users = await User.find({
    email: { $exists: true, $ne: '' },
    'preferences.dailyReminderEnabled': true,
    'preferences.emailNotifications': { $ne: false },
    'preferences.dailyReminderTime': currentHHmm,
  }).select('_id name email preferences lastDailyReminderSentAt');

  for (const user of users) {
    const sentDateKey = getDateKeyFromDate(user.lastDailyReminderSentAt);
    if (sentDateKey === todayKey) continue;

    const remindTime = user.preferences?.dailyReminderTime || currentHHmm;
    const subject = `LearnMate - Nhắc học lúc ${remindTime}`;
    const message = `Chào ${user.name || 'bạn'}, đã đến giờ học (${remindTime}). Mở LearnMate và bắt đầu phiên học nhé.`;

    try {
      await sendEmail({
        email: user.email,
        subject,
        message,
        html: `<p>Chào <b>${user.name || 'bạn'}</b>,</p><p>Đã đến giờ học <b>${remindTime}</b>. Mở LearnMate và bắt đầu phiên học nhé.</p>`,
      });

      await createUserNotification(user._id, {
        title: `Nhắc học ${remindTime}`,
        message: 'Đến giờ học rồi, vào LearnMate và tiếp tục mục tiêu hôm nay nhé.',
        type: 'system',
        sendMail: false,
      });

      user.lastDailyReminderSentAt = new Date();
      await user.save();
    } catch (error) {
      console.error(`Daily reminder failed for ${user.email}:`, error.message);
    }
  }
}

function startDailyReminderJob() {
  if (process.env.DAILY_REMINDER_ENABLED === 'false') return;

  cron.schedule(
    SCAN_CRON,
    async () => {
      await sendDailyReminderEmails();
    },
    { timezone: TZ }
  );

  console.log(`Daily reminder job scheduled: "${SCAN_CRON}" (${TZ})`);
}

module.exports = { startDailyReminderJob };

