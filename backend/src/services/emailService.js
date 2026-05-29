const crypto = require('crypto');
const nodemailer = require('nodemailer');

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || '').trim();

  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP_USER hoặc SMTP_PASS chưa được cấu hình');
  }

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return cachedTransporter;
}

function buildMessageId(domain) {
  const id = crypto.randomBytes(12).toString('hex');
  return `<${id}@${domain}>`;
}

const sendEmail = async (options) => {
  const transporter = getTransporter();

  const from = process.env.MAIL_FROM || 'LearnMate <no-reply@learnmate.com>';
  const replyTo = process.env.MAIL_REPLY_TO || from;
  const messageIdDomain = process.env.MAIL_MESSAGE_ID_DOMAIN || 'learnmate.local';

  const to = options.email;
  const subject = options.subject || 'LearnMate Notification';
  const text = options.message || '';
  const html =
    options.html ||
    `<div style="font-family:Arial,sans-serif;color:#111;line-height:1.5"><p>${text.replace(/\n/g, '<br/>')}</p></div>`;

  const mailOptions = {
    from,
    to,
    replyTo,
    subject,
    text,
    html,
    messageId: buildMessageId(messageIdDomain),
    date: new Date(),
    headers: {
      'X-Entity-Ref-ID': crypto.randomBytes(8).toString('hex'),
      'List-Unsubscribe': process.env.MAIL_LIST_UNSUBSCRIBE || '<mailto:unsubscribe@learnmate.local>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'X-Auto-Response-Suppress': 'OOF, AutoReply',
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    if (error?.responseCode === 535 || /BadCredentials|Username and Password not accepted|Application-specific password required/i.test(error?.message || '')) {
      throw new Error(
        'Đăng nhập SMTP thất bại. Với Gmail, hãy dùng App Password 16 ký tự và bật 2-Step Verification cho tài khoản gửi.'
      );
    }
    throw error;
  }
};

module.exports = sendEmail;
