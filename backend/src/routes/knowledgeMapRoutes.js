const express = require('express');
const router = express.Router();
const {
  getKnowledgeMaps,
  createKnowledgeMap,
  regenerateKnowledgeMap,
  updateKnowledgeMap,
} = require('../controllers/knowledgeMapController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.route('/').get(getKnowledgeMaps).post(createKnowledgeMap);
router.route('/:id').put(updateKnowledgeMap);
router.route('/:id/regenerate').post(regenerateKnowledgeMap);

module.exports = router;
