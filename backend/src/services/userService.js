/**
 * Helper to check if two dates are the same day
 */
const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  return d1.toDateString() === d2.toDateString();
};

/**
 * Helper to check if d2 is the day before d1
 */
const isYesterday = (d1, d2) => {
  if (!d1 || !d2) return false;
  const yesterday = new Date(d1);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toDateString() === d2.toDateString();
};

/**
 * Updates the user's streak based on their last activity.
 * @param {Object} user - The user document to update.
 */
const updateStreak = async (user) => {
  const now = new Date();
  const lastActivity = user.lastActivity;

  if (!lastActivity) {
    // First time activity
    user.streak = 1;
  } else if (isYesterday(now, lastActivity)) {
    // Continued streak from yesterday
    user.streak += 1;
  } else if (!isSameDay(now, lastActivity)) {
    // Missed a day or more, but not today (which would do nothing)
    user.streak = 1;
  }
  
  // Update lastActivity to current time
  user.lastActivity = now;

  // Update bestStreak if current streak is higher
  if (user.streak > (user.bestStreak || 0)) {
    user.bestStreak = user.streak;
  }

  await user.save();
};

module.exports = {
  updateStreak,
};
