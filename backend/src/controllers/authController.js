const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const crypto = require('crypto');
const sendEmail = require('../services/emailService');

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
  avatar: user.avatar,
  studyGoal: user.studyGoal,
  subjects: user.subjects,
  preferences: user.preferences,
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

    const token = generateToken(user._id);

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

    const token = generateToken(user._id);
    res.json({
      message: 'Dang nhap Google thanh cong',
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

    const message = `Ban dang yeu cau dat lai mat khau. Vui long nhap vao duong dan duoi day de tiep tuc:\n\n${resetUrl}\n\nNeu ban khong yeu cau dieu nay, vui long bo qua email nay.`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Dat lai mat khau LearnMate',
        message,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #3b82f6;">Dat lai mat khau LearnMate</h2>
            <p>Ban nhan duoc email nay vi ban (hoac ai do) da yeu cau dat lai mat khau cho tai khoan LearnMate.</p>
            <p>Vui long nhan vao nut duoi day de tiep tuc:</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Dat lai mat khau</a>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">Duong dan nay se het han trong 10 phut.</p>
          </div>
        `,
      });

      res.json({ message: 'Email khoi phuc da duoc gui' });
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

module.exports = { register, login, googleLogin, getMe, forgotPassword, resetPassword };
