const User = require('../models/User');
const CreditTransaction = require('../models/CreditTransaction');
const UsageLog = require('../models/UsageLog');

const FEATURE_COSTS = {
  UPLOAD_DOCUMENT: 10,
  SUMMARIZE_DOCUMENT: 10,
  GENERATE_QUIZ: 5,
  GENERATE_EXAM: 15, // Added as a placeholder
  AI_CHAT: 1,
  AI_DIALOGUE: 5, // Matching current feature
};

/**
 * Check if user has enough credits
 */
async function hasEnoughCredits(userId, feature) {
  const cost = FEATURE_COSTS[feature] || 0;
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  return user.currentCredits >= cost;
}

/**
 * Deduct credits from user and log the transaction
 */
async function deductCredits(userId, feature, metadata = {}) {
  const cost = FEATURE_COSTS[feature] || 0;
  if (cost === 0) return true;

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  
  if (user.currentCredits < cost) {
    throw new Error('Không đủ Credit để thực hiện chức năng này');
  }

  // Deduct
  user.currentCredits -= cost;
  await user.save();

  // Log usage
  const log = await UsageLog.create({
    userId,
    feature,
    creditsUsed: cost,
    metadata,
    status: 'success'
  });

  // Log transaction
  await CreditTransaction.create({
    userId,
    amount: cost,
    type: 'deduct',
    description: `Sử dụng tính năng ${feature}`,
    feature,
    referenceId: log._id,
    referenceModel: 'UsageLog'
  });

  return true;
}

/**
 * Add credits to user
 */
async function addCredits(userId, amount, description, paymentId = null) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  user.currentCredits += amount;
  await user.save();

  await CreditTransaction.create({
    userId,
    amount,
    type: 'add',
    description,
    referenceId: paymentId,
    referenceModel: paymentId ? 'Payment' : undefined
  });

  return user.currentCredits;
}

/**
 * Alias for deductCredits to maintain compatibility
 */
async function validateAndDeduct(userId, amount, description) {
  // Map description to a feature if possible, or just use AI_CHAT as default/custom
  const feature = Object.keys(FEATURE_COSTS).find(k => k === description) || 'SUMMARIZE_DOCUMENT';
  return deductCredits(userId, feature, { description });
}

module.exports = {
  FEATURE_COSTS,
  hasEnoughCredits,
  deductCredits,
  addCredits,
  validateAndDeduct
};
