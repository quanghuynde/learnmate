const User = require('../models/User');

function toRecommendedMinutes(xpGap, dailyGoal) {
  const base = Number.isFinite(dailyGoal) && dailyGoal > 0 ? dailyGoal * 10 : 30;
  const gapBoost = Math.ceil(Math.max(xpGap, 0) / 150) * 5;
  return Math.max(15, Math.min(base + gapBoost, 120));
}

async function buildLeaderboardDropTop3Payload(userId, fallbackData = {}) {
  const users = await User.find({ isActive: true })
    .select('_id xp name preferences')
    .sort({ xp: -1, createdAt: 1 })
    .limit(50)
    .lean();

  const myIndex = users.findIndex((u) => String(u._id) === String(userId));
  const currentRank = myIndex >= 0 ? myIndex + 1 : null;
  const me = myIndex >= 0 ? users[myIndex] : null;
  const top3 = users[2] || null;
  const xpGap = me && top3 ? Math.max((top3.xp || 0) - (me.xp || 0), 0) : null;
  const dailyGoal = me?.preferences?.dailyGoal;
  const minutes = toRecommendedMinutes(xpGap ?? 0, dailyGoal);

  const rankLabel = currentRank ? `#${currentRank}` : 'ngoài Top 3';
  const namePrefix = me?.name ? `${me.name}, ` : '';

  return {
    title: 'Bạn vừa rớt khỏi Top 3 cộng đồng',
    message:
      xpGap !== null
        ? `${namePrefix}bạn vừa bị văng khỏi Top 3 trên Bảng xếp hạng Cộng đồng và hiện đang ở hạng ${rankLabel}. Bạn còn cách Top 3 khoảng ${xpGap} XP, hãy học thêm khoảng ${minutes} phút để tăng cơ hội quay lại nhé.`
        : `${namePrefix}bạn vừa bị văng khỏi Top 3 trên Bảng xếp hạng Cộng đồng và hiện đang ở hạng ${rankLabel}. Hãy học thêm khoảng ${minutes} phút để giành lại vị trí nhé.`,
    metadata: {
      event: 'leaderboard_drop_top3',
      currentRank,
      previousRank: Number(fallbackData.previousRank) || null,
      xpGapToTop3: xpGap,
      recommendedMinutes: minutes,
    },
  };
}

async function buildSystemNotificationFromEvent(event, userId, data = {}) {
  switch (event) {
    case 'leaderboard_drop_top3':
      return buildLeaderboardDropTop3Payload(userId, data);
    default:
      return null;
  }
}

module.exports = { buildSystemNotificationFromEvent };
