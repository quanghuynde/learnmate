const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { uploadPostImage: uploadMiddleware } = require('../middleware/uploadMiddleware');
const { getPosts, createPost, uploadPostImage, toggleLike, addComment, deletePost } = require('../controllers/postController');

router.use(protect);

router.route('/').get(getPosts).post(createPost);
router.post('/upload-image', uploadMiddleware.single('image'), uploadPostImage);
router.put('/:id/like', toggleLike);
router.post('/:id/comments', addComment);
router.delete('/:id', deletePost);

module.exports = router;
