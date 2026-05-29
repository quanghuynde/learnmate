const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');

// @desc    Generate 2FA secret + QR code
// @route   POST /api/auth/2fa/setup
const setup2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+twoFactorSecret');
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA đã được bật. Hãy tắt trước khi thiết lập lại.' });
    }

    const secret = speakeasy.generateSecret({
      name: `LearnMate (${user.email})`,
      issuer: 'LearnMate',
      length: 20,
    });

    // Store secret temporarily (not enabled yet until verified)
    user.twoFactorSecret = secret.base32;
    await user.save();

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      message: 'Quét mã QR bằng ứng dụng xác thực (Google Authenticator, Authy)',
      qrCodeUrl,
      secret: secret.base32,
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify OTP and enable 2FA
// @route   POST /api/auth/2fa/verify-setup
const verifySetup2FA = async (req, res) => {
  try {
    const { otpCode } = req.body;
    if (!otpCode) return res.status(400).json({ message: 'Vui lòng nhập mã OTP' });

    const user = await User.findById(req.user.id).select('+twoFactorSecret');
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    if (!user.twoFactorSecret) return res.status(400).json({ message: 'Chưa thiết lập 2FA. Vui lòng quét mã QR trước.' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: otpCode,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ message: 'Mã OTP không chính xác. Vui lòng thử lại.' });
    }

    user.twoFactorEnabled = true;
    await user.save();

    res.json({ message: 'Xác thực 2 bước đã được bật thành công! 🎉' });
  } catch (error) {
    console.error('2FA verify-setup error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Disable 2FA
// @route   POST /api/auth/2fa/disable  
const disable2FA = async (req, res) => {
  try {
    const { otpCode } = req.body;
    if (!otpCode) return res.status(400).json({ message: 'Vui lòng nhập mã OTP để xác nhận tắt 2FA' });

    const user = await User.findById(req.user.id).select('+twoFactorSecret');
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    if (!user.twoFactorEnabled) return res.status(400).json({ message: '2FA chưa được bật' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: otpCode,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ message: 'Mã OTP không chính xác' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    res.json({ message: 'Xác thực 2 bước đã được tắt.' });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { setup2FA, verifySetup2FA, disable2FA };
