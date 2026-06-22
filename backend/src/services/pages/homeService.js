const { Op } = require('sequelize');

const { User, UserTag, RecommendationBatch, Recommendation, Resource, LearningDaily, FocusSession } = require('../../models');
const {
  toDateOnly,
  daysAgo,
  safeNumber,
  listRecentDates,
  aggregateDateSeries,
  sumField,
  avgField,
} = require('../../utils/chartDataHelper');

const PROFILE_CATEGORY_ORDER = ['学习阶段', '学科偏好', '学习风格', '能力标签', '行为标签'];

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

  const since7 = daysAgo(6);
  const batches = await RecommendationBatch.findAll({
    where: { userId, createdAt: { [Op.gte]: since7 } },
    order: [['createdAt', 'ASC']],
  });

  const recommendTrend7d = aggregateDateSeries({
    records: batches,
    days: 7,
    getDateKey: (rec) => toDateOnly(rec.createdAt),
    bucketFactory: (date) => ({ date, clickCount: 0, completionRateSum: 0, n: 0 }),
    reducer: (bucket, rec) => {
      bucket.clickCount += safeNumber(rec.clickCount);
      bucket.completionRateSum += safeNumber(rec.completionRate);
      bucket.n += 1;
    },
    finalize: (date, bucket) => ({
      date,
      clickCount: bucket.clickCount,
      completionRate: bucket.n ? bucket.completionRateSum / bucket.n : 0,
    }),
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

  const totals = {
    studyMinutes: sumField(daily7, 'studyMinutes'),
    completedCount: sumField(daily7, 'completedCount'),
    avgMatchScoreSum: daily7.reduce((s, d) => s + safeNumber(d.avgMatchScore), 0),
    avgMatchScoreN: daily7.length,
  };

  const weeklySummaryTable = aggregateDateSeries({
    records: daily7,
    days: 7,
    getDateKey: (rec) => rec.date,
    bucketFactory: (date) => ({ date, studyMinutes: 0, completedCount: 0, avgMatchScoreSum: 0, n: 0 }),
    reducer: (bucket, rec) => {
      bucket.studyMinutes += safeNumber(rec.studyMinutes);
      bucket.completedCount += safeNumber(rec.completedCount);
      bucket.avgMatchScoreSum += safeNumber(rec.avgMatchScore);
      bucket.n += 1;
    },
    finalize: (date, bucket) => ({
      date,
      studyMinutes: bucket.studyMinutes,
      completedCount: bucket.completedCount,
      avgMatchScore: bucket.n ? bucket.avgMatchScoreSum / bucket.n : 0,
    }),
  });

  const focusSessions7 = await FocusSession.findAll({
    where: { userId, status: '已完成', startedAt: { [Op.gte]: since7 } },
  });

  const pomodoroCount7 = focusSessions7.length;
  const focusSeconds7 = sumField(focusSessions7, 'actualFocusSeconds');

  const pomodoroDaily = aggregateDateSeries({
    records: focusSessions7,
    days: 7,
    getDateKey: (rec) => toDateOnly(rec.startedAt),
    bucketFactory: (date) => ({ date, count: 0, minutes: 0 }),
    reducer: (bucket, rec) => {
      bucket.count += 1;
      bucket.minutes += Math.round(safeNumber(rec.actualFocusSeconds) / 60);
    },
    finalize: (date, bucket) => ({
      date,
      count: bucket.count,
      focusMinutes: bucket.minutes,
    }),
  });

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
