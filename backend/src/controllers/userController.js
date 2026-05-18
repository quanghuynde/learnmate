const User = require('../models/User');

// @desc    Lấy profile user
// @route   GET /api/users/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cập nhật profile
// @route   PUT /api/users/profile
const updateProfile = async (req, res) => {
  try {
    const { name, studyGoal, subjects, avatar, preferences } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, studyGoal, subjects, avatar, preferences },
      { new: true, runValidators: true }
    );
    res.json({ message: 'Cập nhật thành công', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cập nhật XP và level
// @route   PUT /api/users/xp
const updateXP = async (req, res) => {
  try {
    const { xp } = req.body;
    const user = await User.findById(req.user.id);
    user.xp += xp;
    // Tính level: mỗi 500 XP lên 1 level
    user.level = Math.floor(user.xp / 500) + 1;
    await user.save();
    res.json({ message: 'Cập nhật XP thành công', xp: user.xp, level: user.level });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Lấy danh sách users (admin only)
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
