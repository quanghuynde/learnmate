const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const sendEmail = require('../services/emailService');
const { updateStreak } = require('../services/userService');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  xp: user.xp,
  level: user.level,
  streak: user.streak,
  bestStreak: user.bestStreak || 0,
  avatar: user.avatar,
  studyGoal: user.studyGoal,
  subjects: user.subjects,
  preferences: user.preferences,
  twoFactorEnabled: user.twoFactorEnabled,
});

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email da duoc su dung' });
    }

    const user = await User.create({ name, email, password, authProvider: 'local' });
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Dang ky thanh cong',
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Vui long nhap email va mat khau' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Email hoac mat khau khong dung' });
    }

    if (user.twoFactorEnabled) {
      const tempToken = jwt.sign({ id: user._id, isTemp: true }, process.env.JWT_SECRET, {
        expiresIn: '5m',
      });
      return res.json({
        message: 'Yêu cầu xác thực 2 bước',
        requires2FA: true,
        tempToken,
      });
    }

    const token = generateToken(user._id);
    await updateStreak(user);

    res.json({
      message: 'Dang nhap thanh cong',
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const googleLogin = async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: 'Server chua cau hinh GOOGLE_CLIENT_ID' });
    }

    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Thieu credential tu Google' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.email) {
      return res.status(400).json({ message: 'Khong lay duoc email tu Google' });
    }

    let user = await User.findOne({ email: payload.email.toLowerCase() });
    if (!user) {
      user = await User.create({
        name: payload.name || payload.email.split('@')[0],
        email: payload.email.toLowerCase(),
        avatar: payload.picture || '',
        authProvider: 'google',
        googleId: payload.sub || '',
      });
    } else if (user.authProvider !== 'google') {
      user.authProvider = 'google';
      user.googleId = payload.sub || user.googleId;
      if (!user.avatar && payload.picture) user.avatar = payload.picture;
      await user.save();
    }

    if (user.twoFactorEnabled) {
      const tempToken = jwt.sign({ id: user._id, isTemp: true }, process.env.JWT_SECRET, {
        expiresIn: '5m',
      });
      return res.json({
        message: 'Yêu cầu xác thực 2 bước (Google Login)',
        requires2FA: true,
        tempToken,
      });
    }

    const token = generateToken(user._id);
    await updateStreak(user);

    res.json({
      message: 'Dang nhap Google thanh cong',
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ message: `Lá»—i xÃ¡c thá»±c Google: ${error.message}` });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) await updateStreak(user);
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'Khong tim thay nguoi dung voi email nay' });
    }

    // Tao reset token ngau nhien
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // Het han trong 10 phut

    await user.save();

    // URL khach hang
    const resetUrl = `${process.env.CORS_ORIGIN}/reset-password/${resetToken}`;

    const message = `Bạn đang yêu cầu đặt lại mật khẩu. Vui lòng mở đường dẫn dưới đây để tiếp tục:\n\n${resetUrl}\n\nNếu bạn không yêu cầu thao tác này, hãy bỏ qua email này.`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Đặt lại mật khẩu LearnMate',
        message,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #3b82f6;">Đặt lại mật khẩu LearnMate</h2>
            <p>Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản LearnMate.</p>
            <p>Vui lòng nhấn vào nút dưới đây để tiếp tục:</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Đặt lại mật khẩu</a>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">Đường dẫn này sẽ hết hạn trong 10 phút.</p>
          </div>
        `,
      });

      res.json({ message: 'Email khôi phục đã được gửi' });
    } catch (err) {
      console.error('Email Error:', err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return res.status(500).json({ message: `Lỗi gửi mail: ${err.message}` });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Token khong hop le hoac da het han' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Mat khau da duoc cap nhat thanh cong' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verify2FALogin = async (req, res) => {
  try {
    const { tempToken, otpCode } = req.body;
    if (!tempToken || !otpCode) {
      return res.status(400).json({ message: 'Thiếu tempToken hoặc mã OTP' });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Token tạm thời không hợp lệ hoặc đã hết hạn' });
    }

    if (!decoded.isTemp) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    const user = await User.findById(decoded.id).select('+twoFactorSecret');
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ message: 'Người dùng chưa bật 2FA hoặc không tìm thấy' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: otpCode,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ message: 'Mã OTP không chính xác' });
    }

    const token = generateToken(user._id);
    await updateStreak(user);

    res.json({
      message: 'Xác thực thành công',
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, googleLogin, getMe, forgotPassword, resetPassword, verify2FALogin };


