const Notification = require('../models/Notification');
const User = require('../models/User');
const sendEmail = require('./emailService');
const { templates } = require('./emailTemplates');

async function createUserNotification(userId, payload) {
  const notification = await Notification.create({
    user: userId,
    title: payload.title,
    message: payload.message,
    type: payload.type || 'system',
    metadata: payload.metadata || {},
  });

  if (payload.sendMail !== false) {
    const user = await User.findById(userId).select('email name');
    if (user?.email) {
      try {
        let html = payload.html;
        
        // If template exists for this type, use it
        if (!html && payload.type && templates[payload.type]) {
          try {
            html = templates[payload.type]({
              ...payload.metadata,
              title: payload.title,
              message: payload.message,
              name: user.name
            });
          } catch (templateErr) {
            console.error('Template rendering failed:', templateErr.message);
          }
        }

        await sendEmail({
          email: user.email,
          subject: payload.emailSubject || payload.title,
          message: payload.emailText || payload.message,
          html: html
        });
      } catch (mailError) {
        console.error('Failed to send email notification:', mailError.message);
        // Do not throw the error, we still want the in-app notification to succeed
      }
    }
  }

  return notification;
}

module.exports = { createUserNotification };
