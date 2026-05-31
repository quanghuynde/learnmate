const CreditTransaction = require('../models/CreditTransaction');
const UsageLog = require('../models/UsageLog');

const getCreditHistory = async (req, res) => {
  try {
    const transactions = await CreditTransaction.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAIUsageLogs = async (req, res) => {
  try {
    const logs = await UsageLog.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCreditHistory,
  getAIUsageLogs
};
