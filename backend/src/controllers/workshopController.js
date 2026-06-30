const Workshop = require('../models/Workshop');
const User = require('../models/User');
const CreditTransaction = require('../models/CreditTransaction');

// Helper: award/deduct credits
const adjustCredits = async (userId, amount, type, description) => {
  await User.findByIdAndUpdate(userId, { $inc: { currentCredits: type === 'add' ? amount : -amount } });
  await CreditTransaction.create({ userId, amount, type, description, feature: 'workshop' });
};

// @desc  Lấy danh sách workshop
// @route GET /api/workshops
const getWorkshops = async (req, res) => {
  try {
    const { topic, status, limit = 20, page = 1 } = req.query;
    const filter = {};
    if (topic) filter.topic = { $regex: topic, $options: 'i' };

    // Filter by status using scheduledAt
    const now = new Date();
    if (status === 'upcoming') filter.scheduledAt = { $gt: now };
    else if (status === 'ended') filter.scheduledAt = { $lt: now };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const workshops = await Workshop.find(filter)
      .populate('host', 'name avatar')
      .populate('attendees', 'name avatar')
      .sort({ scheduledAt: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Workshop.countDocuments(filter);
    res.json({ workshops, total, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Tạo workshop mới
// @route POST /api/workshops
const createWorkshop = async (req, res) => {
  try {
    const { title, description, topic, scheduledAt, durationMinutes, meetingLink, platform, maxAttendees, creditCost } = req.body;

    const workshop = await Workshop.create({
      host: req.user.id,
      title,
      description,
      topic,
      scheduledAt,
      durationMinutes: durationMinutes || 60,
      meetingLink,
      platform: platform || 'other',
      maxAttendees: maxAttendees || 0,
      creditCost: creditCost || 0,
    });

    // Thưởng 20 credits cho host khi tạo workshop
    await adjustCredits(req.user.id, 20, 'add', `Tạo workshop: "${title}"`);

    const populated = await Workshop.findById(workshop._id).populate('host', 'name avatar');
    res.status(201).json({ message: 'Tạo workshop thành công! +20 Credits', workshop: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Lấy chi tiết 1 workshop
// @route GET /api/workshops/:id
const getWorkshopById = async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id)
      .populate('host', 'name avatar')
      .populate('attendees', 'name avatar')
      .populate('ratings.user', 'name avatar');
    if (!workshop) return res.status(404).json({ message: 'Không tìm thấy workshop' });
    res.json({ workshop });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Đăng ký tham dự workshop
// @route POST /api/workshops/:id/register
const registerWorkshop = async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ message: 'Không tìm thấy workshop' });

    // Không tự đăng ký workshop của mình
    if (workshop.host.toString() === req.user.id)
      return res.status(400).json({ message: 'Bạn là host của workshop này' });

    // Kiểm tra đã đăng ký chưa
    if (workshop.attendees.map(String).includes(req.user.id))
      return res.status(400).json({ message: 'Bạn đã đăng ký workshop này rồi' });

    // Kiểm tra đã kết thúc chưa
    const now = new Date();
    if (workshop.scheduledAt < now)
      return res.status(400).json({ message: 'Workshop đã kết thúc, không thể đăng ký' });

    // Kiểm tra số chỗ
    if (workshop.maxAttendees > 0 && workshop.attendees.length >= workshop.maxAttendees)
      return res.status(400).json({ message: 'Workshop đã đủ số lượng người tham dự' });

    // Trừ credits nếu cần
    if (workshop.creditCost > 0) {
      const user = await User.findById(req.user.id);
      if (user.currentCredits < workshop.creditCost)
        return res.status(400).json({ message: `Không đủ Credits (cần ${workshop.creditCost} CR)` });
      await adjustCredits(req.user.id, workshop.creditCost, 'deduct', `Đăng ký workshop: "${workshop.title}"`);
    }

    workshop.attendees.push(req.user.id);
    await workshop.save();

    res.json({ message: 'Đăng ký tham dự thành công!', attendeesCount: workshop.attendees.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Huỷ đăng ký workshop
// @route DELETE /api/workshops/:id/register
const cancelRegistration = async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ message: 'Không tìm thấy workshop' });

    const idx = workshop.attendees.map(String).indexOf(req.user.id);
    if (idx === -1) return res.status(400).json({ message: 'Bạn chưa đăng ký workshop này' });

    const now = new Date();
    const isUpcoming = workshop.scheduledAt > now;

    workshop.attendees.splice(idx, 1);
    await workshop.save();

    // Hoàn credits nếu workshop chưa diễn ra
    if (isUpcoming && workshop.creditCost > 0) {
      await adjustCredits(req.user.id, workshop.creditCost, 'add', `Hoàn credits huỷ workshop: "${workshop.title}"`);
    }

    res.json({ message: isUpcoming && workshop.creditCost > 0 ? `Đã huỷ và hoàn ${workshop.creditCost} Credits` : 'Đã huỷ đăng ký' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Đánh giá workshop
// @route POST /api/workshops/:id/rate
const rateWorkshop = async (req, res) => {
  try {
    const { score, comment } = req.body;
    if (!score || score < 1 || score > 5) return res.status(400).json({ message: 'Score phải từ 1 đến 5' });

    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ message: 'Không tìm thấy workshop' });

    // Kiểm tra đã diễn ra chưa
    const now = new Date();
    if (workshop.scheduledAt > now) return res.status(400).json({ message: 'Workshop chưa diễn ra, không thể đánh giá' });

    // Phải là attendee hoặc host
    const isParticipant =
      workshop.attendees.map(String).includes(req.user.id) ||
      workshop.host.toString() === req.user.id;
    if (!isParticipant) return res.status(403).json({ message: 'Bạn không tham dự workshop này' });

    // Chỉ đánh giá 1 lần
    const existing = workshop.ratings.find((r) => r.user.toString() === req.user.id);
    if (existing) return res.status(400).json({ message: 'Bạn đã đánh giá workshop này rồi' });

    workshop.ratings.push({ user: req.user.id, score, comment: comment || '' });
    await workshop.save();

    const avg = workshop.ratings.reduce((s, r) => s + r.score, 0) / workshop.ratings.length;
    res.json({ message: 'Đánh giá thành công!', averageRating: Math.round(avg * 10) / 10 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Xoá workshop
// @route DELETE /api/workshops/:id
const deleteWorkshop = async (req, res) => {
  try {
    const workshop = await Workshop.findOne({ _id: req.params.id, host: req.user.id });
    if (!workshop) return res.status(404).json({ message: 'Không tìm thấy hoặc không có quyền xoá' });

    const now = new Date();
    if (workshop.scheduledAt <= now) return res.status(400).json({ message: 'Không thể xoá workshop đã diễn ra' });

    // Hoàn credits cho attendees
    for (const attendeeId of workshop.attendees) {
      if (workshop.creditCost > 0) {
        await adjustCredits(attendeeId, workshop.creditCost, 'add', `Hoàn credits do workshop bị huỷ: "${workshop.title}"`);
      }
    }

    await workshop.deleteOne();
    res.json({ message: 'Đã xoá workshop' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getWorkshops, createWorkshop, getWorkshopById, registerWorkshop, cancelRegistration, rateWorkshop, deleteWorkshop };
