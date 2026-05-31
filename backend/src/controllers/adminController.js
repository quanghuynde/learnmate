const User = require('../models/User');
const Payment = require('../models/Payment');
const UsageLog = require('../models/UsageLog');

const getAdminStats = async (req, res) => {
  try {
    const usersCount = await User.countDocuments();
    const payments = await Payment.find({ status: 'completed' });
    const revenue = payments.reduce((acc, p) => acc + p.amount, 0);
    const creditsSold = payments.reduce((acc, p) => acc + (p.amount > 0 ? 1000 : 0), 0); // Placeholder logic
    const usageCount = await UsageLog.countDocuments({ status: 'success' });

    const recentPayments = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name email');

    res.json({
      usersCount,
      revenue,
      creditsSold,
      usageCount,
      recentPayments: recentPayments.map(p => ({
        user: p.userId?.name || 'Unknown',
        amount: p.amount,
        status: p.status
      })),
      chartData: [45, 52, 38, 65, 48, 72, 51, 68, 80, 55, 42, 60]
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAdminStats
};
