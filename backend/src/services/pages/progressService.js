const { Op } = require('sequelize');

const { LearningDaily, WrongQuestion, LearningGoal } = require('../../models');

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物'];
const GOAL_TYPES = ['日', '周', '月'];

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

function defaultGoalByType(type) {
  if (type === '日') {
    return {
      type,
      targetMinutes: 90,
      targetResources: 4,
      startDate: toDateOnly(daysAgo(0)),
      endDate: toDateOnly(daysAgo(0)),
      currentMinutes: 0,
      currentResources: 0,
      adjustmentRecord: [],
    };
  }
  if (type === '周') {
    return {
      type,
      targetMinutes: 540,
      targetResources: 22,
      startDate: toDateOnly(daysAgo(6)),
      endDate: toDateOnly(daysAgo(0)),
      currentMinutes: 0,
      currentResources: 0,
      adjustmentRecord: [],
    };
  }
  return {
    type,
    targetMinutes: 2160,
    targetResources: 90,
    startDate: toDateOnly(daysAgo(29)),
    endDate: toDateOnly(daysAgo(0)),
    currentMinutes: 0,
    currentResources: 0,
    adjustmentRecord: [],
  };
}

async function getProgressData(userId) {
  const since30 = toDateOnly(daysAgo(29));

  const daily = await LearningDaily.findAll({
    where: { userId, date: { [Op.gte]: since30 } },
    order: [['date', 'DESC']],
  });

  const subjectStatMap = SUBJECTS.reduce((acc, subject) => {
    acc[subject] = { subject, minutes: 0, completed: 0 };
    return acc;
  }, {});
  for (const d of daily) {
    subjectStatMap[d.subject] = subjectStatMap[d.subject] || { subject: d.subject, minutes: 0, completed: 0 };
    subjectStatMap[d.subject].minutes += safeNumber(d.studyMinutes);
    subjectStatMap[d.subject].completed += safeNumber(d.completedCount);
  }

  const orderedSubjects = SUBJECTS.concat(Object.keys(subjectStatMap).filter((x) => !SUBJECTS.includes(x)));
  const subjectPie = orderedSubjects.map((subject) => ({
    name: subject,
    value: safeNumber(subjectStatMap[subject]?.minutes),
  }));

  const wrong = await WrongQuestion.findAll({ where: { userId }, order: [['updatedAt', 'DESC']] });

  const overviewTable = orderedSubjects.map((subject) => {
    const row = subjectStatMap[subject] || { minutes: 0, completed: 0 };
    const wrongCount = wrong.filter((w) => w.knowledgePoint.includes(subject)).length;
    const mastered = wrong.filter((w) => w.knowledgePoint.includes(subject) && w.mastery === '高').length;
    const masteryRate = wrongCount ? mastered / wrongCount : 0;
    return {
      subject,
      totalStudyMinutes: safeNumber(row.minutes),
      completedResources: safeNumber(row.completed),
      wrongCount,
      masteryRate,
    };
  });

  const dateRange30 = listRecentDates(30);
  const trendByDate = dateRange30.reduce((acc, date) => {
    acc[date] = { date, actualMinutes: 0, targetMinutes: 90 };
    return acc;
  }, {});
  for (const d of daily) {
    if (!trendByDate[d.date]) continue;
    trendByDate[d.date].actualMinutes += safeNumber(d.studyMinutes);
  }
  const progressTrend30d = dateRange30.map((date) => trendByDate[date]);

  const dailyTable = daily.slice(0, 30).map((d) => ({
    date: d.date,
    subject: d.subject,
    studyMinutes: d.studyMinutes,
    completedCount: d.completedCount,
    targetAchieveRate: safeNumber(d.targetAchieveRate),
    note: d.note,
  }));

  const wrongFunnel = [
    { name: '做错', value: wrong.length },
    { name: '订正', value: wrong.filter((w) => w.corrected).length },
    { name: '掌握', value: wrong.filter((w) => w.mastery === '高').length },
  ];

  const wrongTable = wrong.slice(0, 20).map((w) => ({
    wrongId: w.code,
    knowledgePoint: w.knowledgePoint,
    wrongCount: w.wrongCount,
    corrected: w.corrected ? '已订正' : '未订正',
    mastery: w.mastery,
    reviewedAt: w.reviewedAt,
  }));

  const goals = await LearningGoal.findAll({ where: { userId }, order: [['updatedAt', 'DESC']] });
  const goalMap = GOAL_TYPES.reduce((acc, type) => {
    acc[type] = defaultGoalByType(type);
    return acc;
  }, {});
  for (const g of goals) {
    goalMap[g.type] = {
      type: g.type,
      targetMinutes: safeNumber(g.targetMinutes),
      targetResources: safeNumber(g.targetResources),
      startDate: g.startDate,
      endDate: g.endDate,
      currentMinutes: safeNumber(g.currentMinutes),
      currentResources: safeNumber(g.currentResources),
      adjustmentRecord: g.adjustmentRecord || [],
    };
  }
  const orderedGoalTypes = GOAL_TYPES.concat(Object.keys(goalMap).filter((x) => !GOAL_TYPES.includes(x)));
  const goalRings = orderedGoalTypes.map((type) => ({
    type,
    percent: goalMap[type].targetMinutes ? Math.min(1, safeNumber(goalMap[type].currentMinutes) / safeNumber(goalMap[type].targetMinutes)) : 0,
  }));
  const goalTable = orderedGoalTypes.map((type) => ({
    type,
    targetMinutes: goalMap[type].targetMinutes,
    targetResources: goalMap[type].targetResources,
    startDate: goalMap[type].startDate,
    endDate: goalMap[type].endDate,
    currentMinutes: goalMap[type].currentMinutes,
    currentResources: goalMap[type].currentResources,
    adjustmentRecord: goalMap[type].adjustmentRecord,
  }));

  return {
    subjectPie,
    overviewTable,
    progressTrend30d,
    dailyTable,
    wrongFunnel,
    wrongTable,
    goalRings,
    goalTable,
  };
}

module.exports = { getProgressData };
