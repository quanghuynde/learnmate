const Exam = require('../models/Exam');

// @desc    Lấy danh sách kỳ thi
// @route   GET /api/exams
const getExams = async (req, res) => {
  try {
    const exams = await Exam.find({ user: req.user.id }).sort({ examDate: 1 });
    res.json({ count: exams.length, exams });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Tạo kỳ thi mới
// @route   POST /api/exams
const createExam = async (req, res) => {
  try {
    const { name, subject, examDate, totalTopics } = req.body;
    const exam = await Exam.create({
      user: req.user.id,
      name,
      subject,
      examDate,
      totalTopics: totalTopics || 0,
    });
    res.status(201).json({ message: 'Tạo kỳ thi thành công', exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cập nhật kỳ thi
// @route   PUT /api/exams/:id
const updateExam = async (req, res) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!exam) {
      return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
    }
    res.json({ message: 'Cập nhật thành công', exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Xóa kỳ thi
// @route   DELETE /api/exams/:id
const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!exam) {
      return res.status(404).json({ message: 'Không tìm thấy kỳ thi' });
    }
    res.json({ message: 'Đã xóa kỳ thi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getExams, createExam, updateExam, deleteExam };
