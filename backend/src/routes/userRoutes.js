const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, updateXP, getAllUsers } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/xp', protect, updateXP);
router.get('/', protect, adminOnly, getAllUsers);

module.exports = router;
