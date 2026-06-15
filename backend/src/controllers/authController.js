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
      return res.status(400).json({ message: 'Email đã được sử dụng' });
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
      return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
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
      message: 'Đăng nhập thành công',
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
      return res.status(500).json({ message: 'Server chưa cấu hình GOOGLE_CLIENT_ID' });
    }

    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Thiếu credential từ Google' });
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
      message: 'Đăng nhập Google thành công',
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ message: `Lỗi xác thực Google: ${error.message}` });
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
      return res.status(404).json({ message: 'Không tìm thấy người dùng với email này' });
    }

    // Tao OTP 6 so ngau nhien
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Luu OTP (bam hash) va thoi gian het han
    user.resetPasswordToken = crypto.createHash('sha256').update(otp).digest('hex');
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // Het han trong 10 phut

    await user.save();

    try {
      await sendEmail({
        email: user.email,
        subject: 'Mã xác thực đăng nhập LearnMate',
        message: `Mã xác thực của bạn là: ${otp}. Mã này sẽ hết hạn trong 10 phút.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px;">
            <h2 style="color: #1565c0; text-align: center;">Mã xác thực LearnMate</h2>
            <p>Chào bạn,</p>
            <p>Bạn nhận được email này vì bạn đã yêu cầu khôi phục mật khẩu hoặc đăng nhập nhanh bằng mã xác thực cho tài khoản LearnMate.</p>
            <div style="background: #f0f7ff; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 12px; color: #1565c0;">${otp}</span>
            </div>
            <p style="font-size: 14px; color: #666;">Mã xác thực này sẽ hết hạn trong <b>10 phút</b>.</p>
            <p style="font-size: 14px; color: #666;">Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email này.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">Đây là email tự động, vui lòng không trả lời.</p>
          </div>
        `,
      });

      res.json({ message: 'Mã xác thực đã được gửi tới email của bạn' });
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

const verifyForgotOTP = async (req, res) => {
  try {
    const { email, otpCode } = req.body;
    if (!email || !otpCode) {
      return res.status(400).json({ message: 'Vui lòng nhập Email và mã OTP' });
    }

    const hashedToken = crypto.createHash('sha256').update(otpCode).digest('hex');

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Mã OTP không chính xác hoặc đã hết hạn' });
    }

    // Clear reset tokens
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Generate login token
    const token = generateToken(user._id);
    await updateStreak(user);

    res.json({
      message: 'Xác thực thành công và đã đăng nhập',
      token,
      user: serializeUser(user),
    });
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
      return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Mật khẩu đã được cập nhật thành công' });
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

module.exports = { register, login, googleLogin, getMe, forgotPassword, resetPassword, verify2FALogin, verifyForgotOTP };


