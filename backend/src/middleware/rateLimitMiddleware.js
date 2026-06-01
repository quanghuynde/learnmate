const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 requests per windowMs
  message: { message: 'Bạn đã thực hiện quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const hourlyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: { message: 'Bạn đã đạt giới hạn yêu cầu trong 1 giờ. Vui lòng thử lại sau.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, hourlyLimiter };
