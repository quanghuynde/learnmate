const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  summarizeDocument, 
  chatWithDocument,
  generateQuiz, 
  generateDialogue, 
  generateKnowledgeMap,
  getKnowledgeMaps,
  getKnowledgeMapById,
  deleteKnowledgeMap
} = require('../controllers/aiController');

router.use(protect);

router.post('/summarize', summarizeDocument);
router.post('/chat-document', chatWithDocument);
router.post('/generate-quiz', generateQuiz);
router.post('/generate-dialogue', generateDialogue);

// Knowledge Map Routes
router.post('/generate-knowledge-map', generateKnowledgeMap);
router.get('/knowledge-maps', getKnowledgeMaps);
router.get('/knowledge-maps/:id', getKnowledgeMapById);
router.delete('/knowledge-maps/:id', deleteKnowledgeMap);

module.exports = router;
