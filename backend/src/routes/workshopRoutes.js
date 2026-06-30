const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getWorkshops,
  createWorkshop,
  getWorkshopById,
  registerWorkshop,
  cancelRegistration,
  rateWorkshop,
  deleteWorkshop,
} = require('../controllers/workshopController');

// Public: list & detail (still requires auth for personalization)
router.use(protect);

router.route('/').get(getWorkshops).post(createWorkshop);
router.route('/:id').get(getWorkshopById).delete(deleteWorkshop);
router.route('/:id/register').post(registerWorkshop).delete(cancelRegistration);
router.post('/:id/rate', rateWorkshop);

module.exports = router;
