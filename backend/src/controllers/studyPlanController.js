const StudyPlan = require('../models/StudyPlan');
const { createUserNotification } = require('../services/notificationService');

const getStudyPlans = async (req, res) => {
  try {
    const { date } = req.query;
    const filter = { user: req.user.id };

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    const plans = await StudyPlan.find(filter).sort({ date: 1 });
    res.json({ count: plans.length, studyPlans: plans });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createStudyPlan = async (req, res) => {
  try {
    const { subject, examDate, intensity, weakTopics, weeklyGoals, tasks, date } = req.body;
    const plan = await StudyPlan.create({
      user: req.user.id,
      subject,
      examDate,
      intensity,
      weakTopics,
      weeklyGoals,
      tasks,
      date,
    });

    await createUserNotification(req.user.id, {
      title: 'Tạo kế hoạch học thành công',
      message: `Kế hoạch môn ${subject || 'chưa đặt tên'} đã được tạo.`,
      type: 'study_plan',
      emailSubject: 'LearnMate - Kế hoạch học mới',
      emailText: `Bạn vừa tạo kế hoạch học mới cho môn: ${subject || 'chưa đặt tên'}.`,
      metadata: { studyPlanId: plan._id.toString() },
    });

    res.status(201).json({ message: 'Tạo kế hoạch thành công', studyPlan: plan });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateStudyPlan = async (req, res) => {
  try {
    const plan = await StudyPlan.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, req.body, { new: true, runValidators: true });
    if (!plan) return res.status(404).json({ message: 'Không tìm thấy kế hoạch' });
    res.json({ message: 'Cập nhật thành công', studyPlan: plan });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const plan = await StudyPlan.findOne({ _id: req.params.id, user: req.user.id });
    if (!plan) return res.status(404).json({ message: 'Không tìm thấy kế hoạch' });

    const task = plan.tasks.id(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Không tìm thấy nhiệm vụ' });

    task.status = status;
    await plan.save();
    res.json({ message: 'Cập nhật nhiệm vụ thành công', studyPlan: plan });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteStudyPlan = async (req, res) => {
  try {
    const plan = await StudyPlan.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!plan) return res.status(404).json({ message: 'Không tìm thấy kế hoạch' });
    res.json({ message: 'Đã xóa kế hoạch' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getStudyPlans, createStudyPlan, updateStudyPlan, updateTaskStatus, deleteStudyPlan };
