const { Op } = require('sequelize');

const { User, UserTag, RecommendationBatch, Recommendation, Resource, LearningDaily, FocusSession } = require('../../models');

const PROFILE_CATEGORY_ORDER = ['学习阶段', '学科偏好', '学习风格', '能力标签', '行为标签'];

function toDateOnly(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function listRecentDates(days) {
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) out.push(toDateOnly(daysAgo(i)));
  return out;
}

async function getHomeData(userId) {
  const user = await User.findByPk(userId);
  const tags = await UserTag.findAll({ where: { userId }, order: [['updatedAt', 'DESC']] });

  const profileCategoryMap = PROFILE_CATEGORY_ORDER.reduce((acc, category) => {
    acc[category] = { name: category, value: 0 };
    return acc;
  }, {});
  for (const t of tags) {
    const category = t.category || '其他';
    profileCategoryMap[category] = profileCategoryMap[category] || { name: category, value: 0 };
    profileCategoryMap[category].value += safeNumber(t.weight);
  }
  const profileDonut = Object.values(profileCategoryMap);

  const profileTableRaw = tags.slice(0, 12).map((t) => ({
    name: t.name,
    weight: safeNumber(t.weight),
    updatedAt: t.updatedAt,
  }));
  const profileTable =
    profileTableRaw.length > 0
      ? profileTableRaw
      : profileDonut.map((x) => ({
          name: `${x.name}（初始）`,
          weight: safeNumber(x.value),
          updatedAt: user?.updatedAt || new Date(),
        }));

  const dateRange7 = listRecentDates(7);
  const since7 = daysAgo(6);
  const batches = await RecommendationBatch.findAll({
    where: { userId, createdAt: { [Op.gte]: since7 } },
    order: [['createdAt', 'ASC']],
  });

  const trendByDate = dateRange7.reduce((acc, date) => {
    acc[date] = { date, clickCount: 0, completionRateSum: 0, n: 0 };
    return acc;
  }, {});
  for (const b of batches) {
    const date = toDateOnly(b.createdAt);
    const bucket = trendByDate[date];
    if (!bucket) continue;
    bucket.clickCount += safeNumber(b.clickCount);
    bucket.completionRateSum += safeNumber(b.completionRate);
    bucket.n += 1;
  }
  const recommendTrend7d = dateRange7.map((date) => {
    const bucket = trendByDate[date];
    return {
      date,
      clickCount: bucket.clickCount,
      completionRate: bucket.n ? bucket.completionRateSum / bucket.n : 0,
    };
  });

  const recommendations = await Recommendation.findAll({
    where: { userId },
    include: [{ model: Resource, as: 'resource' }],
    order: [['createdAt', 'DESC']],
    limit: 10,
  });

  const recommendTable = recommendations.map((r) => ({
    recommendationId: r.id,
    resourceId: r.resource?.code,
    name: r.resource?.name,
    type: r.resource?.type,
    adaptedTags: r.adaptedTags || [],
    matchScore: safeNumber(r.matchScore),
  }));

  const daily7 = await LearningDaily.findAll({
    where: { userId, date: { [Op.gte]: toDateOnly(since7) } },
  });

  const totals = daily7.reduce(
    (acc, d) => {
      acc.studyMinutes += d.studyMinutes;
      acc.completedCount += d.completedCount;
      acc.avgMatchScoreSum += safeNumber(d.avgMatchScore);
      acc.avgMatchScoreN += 1;
      return acc;
    },
    { studyMinutes: 0, completedCount: 0, avgMatchScoreSum: 0, avgMatchScoreN: 0 }
  );

  const summaryByDate = dateRange7.reduce((acc, date) => {
    acc[date] = { date, studyMinutes: 0, completedCount: 0, avgMatchScoreSum: 0, n: 0 };
    return acc;
  }, {});
  for (const d of daily7) {
    const k = d.date;
    if (!summaryByDate[k]) continue;
    summaryByDate[k].studyMinutes += safeNumber(d.studyMinutes);
    summaryByDate[k].completedCount += safeNumber(d.completedCount);
    summaryByDate[k].avgMatchScoreSum += safeNumber(d.avgMatchScore);
    summaryByDate[k].n += 1;
  }
  const weeklySummaryTable = dateRange7.map((date) => ({
    date,
    studyMinutes: summaryByDate[date].studyMinutes,
    completedCount: summaryByDate[date].completedCount,
    avgMatchScore: summaryByDate[date].n ? summaryByDate[date].avgMatchScoreSum / summaryByDate[date].n : 0,
  }));

  const focusSessions7 = await FocusSession.findAll({
    where: { userId, status: '已完成', startedAt: { [Op.gte]: since7 } },
  });

  let pomodoroCount7 = 0;
  let focusSeconds7 = 0;
  const pomodoroByDate = dateRange7.reduce((acc, date) => {
    acc[date] = { date, count: 0, minutes: 0 };
    return acc;
  }, {});

  for (const s of focusSessions7) {
    const date = toDateOnly(s.startedAt);
    if (!pomodoroByDate[date]) continue;
    pomodoroByDate[date].count += 1;
    pomodoroByDate[date].minutes += Math.round(safeNumber(s.actualFocusSeconds) / 60);
    pomodoroCount7 += 1;
    focusSeconds7 += safeNumber(s.actualFocusSeconds);
  }

  const pomodoroDaily = dateRange7.map((date) => ({
    date,
    count: pomodoroByDate[date].count,
    focusMinutes: pomodoroByDate[date].minutes,
  }));

  return {
    user: {
      name: user?.name || '未命名用户',
      stage: user?.stage || '未知学段',
      learningStyle: user?.learningStyle || '',
      subjectPreference: user?.subjectPreference || [],
    },
    profileDonut,
    profileTable,
    recommendTrend7d,
    recommendTable,
    quickStats: {
      totalStudyMinutes7d: totals.studyMinutes,
      completedResources7d: totals.completedCount,
      avgRecommendMatch7d: totals.avgMatchScoreN ? totals.avgMatchScoreSum / totals.avgMatchScoreN : 0,
      pomodoroCount7d: pomodoroCount7,
      focusMinutes7d: Math.round(focusSeconds7 / 60),
    },
    weeklySummaryTable,
    pomodoroDaily,
  };
}

module.exports = { getHomeData };
