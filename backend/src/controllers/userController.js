const User = require('../models/User');

// @desc    Lay profile user
// @route   GET /api/users/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cap nhat profile
// @route   PUT /api/users/profile
const updateProfile = async (req, res) => {
  try {
    const { name, studyGoal, subjects, avatar, preferences } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'Khong tim thay user' });
    }

    if (typeof name !== 'undefined') user.name = name;
    if (typeof studyGoal !== 'undefined') user.studyGoal = studyGoal;
    if (typeof subjects !== 'undefined') user.subjects = subjects;
    if (typeof avatar !== 'undefined') user.avatar = avatar;

    if (preferences && typeof preferences === 'object') {
      const currentPreferences = user.preferences?.toObject ? user.preferences.toObject() : user.preferences || {};
      user.preferences = {
        ...currentPreferences,
        ...preferences,
      };
    }

    await user.save();
    res.json({ message: 'Cap nhat thanh cong', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cap nhat XP va level
// @route   PUT /api/users/xp
const updateXP = async (req, res) => {
  try {
    const { xp } = req.body;
    const user = await User.findById(req.user.id);
    user.xp += xp;
    // Tinh level: moi 500 XP len 1 level
    user.level = Math.floor(user.xp / 500) + 1;
    await user.save();
    res.json({ message: 'Cap nhat XP thanh cong', xp: user.xp, level: user.level });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Lay danh sach users (admin only)
// @route   GET /api/users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ count: users.length, users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getProfile, updateProfile, updateXP, getAllUsers };
