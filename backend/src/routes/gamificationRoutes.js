const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getGamificationOverview,
  getAchievements,
  getLeaderboard,
} = require('../controllers/gamificationController');

router.use(protect);

router.get('/overview', getGamificationOverview);
router.get('/achievements', getAchievements);
router.get('/leaderboard', getLeaderboard);

module.exports = router;
