const Post = require('../models/Post');

// @desc    Lấy danh sách bài viết (hỗ trợ tìm kiếm)
// @route   GET /api/posts
const getPosts = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    
    if (search) {
      query.content = { $regex: search, $options: 'i' };
    }

    const posts = await Post.find(query)
      .populate('author', 'name avatar')
      .populate('comments.user', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ count: posts.length, posts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload ảnh bài viết
// @route   POST /api/posts/upload-image
const uploadPostImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn ảnh' });
    }
    const imageUrl = `/uploads/posts/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Tạo bài viết mới
// @route   POST /api/posts
const createPost = async (req, res) => {
  try {
    const { content, image } = req.body;
    const post = await Post.create({ author: req.user.id, content, image });
    const populated = await post.populate('author', 'name avatar');
    res.status(201).json({ message: 'Đăng bài thành công', post: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Like / Unlike bài viết
// @route   PUT /api/posts/:id/like
const toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    const index = post.likes.indexOf(req.user.id);
    if (index === -1) {
      post.likes.push(req.user.id);
    } else {
      post.likes.splice(index, 1);
    }
    await post.save();

    res.json({ message: index === -1 ? 'Đã thích' : 'Đã bỏ thích', likesCount: post.likes.length, isLiked: index === -1 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Thêm bình luận
// @route   POST /api/posts/:id/comments
const addComment = async (req, res) => {
  try {
    const { content } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    post.comments.push({ user: req.user.id, content });
    await post.save();

    // Fetch again with population to ensure consistency
    const updatedPost = await Post.findById(req.params.id)
      .populate('comments.user', 'name avatar');
      
    res.status(201).json({ message: 'Bình luận thành công', comments: updatedPost.comments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Xóa bài viết (chỉ chủ bài viết)
// @route   DELETE /api/posts/:id
const deletePost = async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({ _id: req.params.id, author: req.user.id });
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy hoặc không có quyền xóa' });
    }
    res.json({ message: 'Đã xóa bài viết' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPosts, createPost, uploadPostImage, toggleLike, addComment, deletePost };
