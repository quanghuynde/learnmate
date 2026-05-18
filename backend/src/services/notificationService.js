const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');
const User = require('../models/User');

const hasMailConfig =
  Boolean(process.env.SMTP_HOST) &&
  Boolean(process.env.SMTP_PORT) &&
  Boolean(process.env.SMTP_USER) &&
  Boolean(process.env.SMTP_PASS) &&
  Boolean(process.env.MAIL_FROM);

const transporter = hasMailConfig
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

async function createUserNotification(userId, payload) {
  const notification = await Notification.create({
    user: userId,
    title: payload.title,
    message: payload.message,
    type: payload.type || 'system',
    metadata: payload.metadata || {},
  });

  if (transporter && payload.sendMail !== false) {
    const user = await User.findById(userId).select('email name');
    if (user?.email) {
      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: user.email,
        subject: payload.emailSubject || payload.title,
        text: payload.emailText || `${payload.title}\n\n${payload.message}`,
      });
    }
  }

  return notification;
}

module.exports = { createUserNotification };
