const { Op } = require('sequelize');
const {
  User,
  LearningDaily,
  FocusSession,
  Recommendation,
  WrongQuestion,
  AssignmentSubmission,
  LearningReport,
  SystemLog,
} = require('../models');
const logger = require('../utils/logger');

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物'];

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

function getPreviousPeriod(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const duration = end.getTime() - start.getTime();
  
  const prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const prevStart = new Date(prevEnd.getTime() - duration);
  
  return {
    start: formatDate(prevStart),
    end: formatDate(prevEnd),
  };
}

async function calculateLearningDurationTrend(userId, periodStart, periodEnd) {
  const dailyRecords = await LearningDaily.findAll({
    where: {
      userId,
      date: { [Op.between]: [periodStart, periodEnd] },
    },
    order: [['date', 'ASC']],
  });

  const dateMap = new Map();
  dailyRecords.forEach((record) => {
    const date = record.date;
    const current = dateMap.get(date) || 0;
    dateMap.set(date, current + safeNumber(record.studyMinutes));
  });

  const focusSessions = await FocusSession.findAll({
    where: {
      userId,
      startedAt: { [Op.between]: [new Date(periodStart), new Date(periodEnd + ' 23:59:59')] },
      status: '已完成',
    },
  });

  focusSessions.forEach((session) => {
    const date = formatDate(session.startedAt);
    const minutes = Math.round(safeNumber(session.actualFocusSeconds) / 60);
    const current = dateMap.get(date) || 0;
    dateMap.set(date, current + minutes);
  });

  const dates = [];
  const durations = [];
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDate(d);
    dates.push(dateStr);
    durations.push(dateMap.get(dateStr) || 0);
  }

  const totalMinutes = durations.reduce((sum, val) => sum + val, 0);
  const avgMinutes = durations.length > 0 ? Math.round(totalMinutes / durations.length) : 0;
  const maxMinutes = Math.max(...durations, 0);

  return {
    dates,
    durations,
    totalMinutes,
    avgMinutes,
    maxMinutes,
    totalHours: Number((totalMinutes / 60).toFixed(1)),
  };
}

async function calculateSubjectCompletion(userId, periodStart, periodEnd) {
  const records = await LearningDaily.findAll({
    where: {
      userId,
      date: { [Op.between]: [periodStart, periodEnd] },
    },
  });

  const subjectData = {};
  SUBJECTS.forEach((subject) => {
    subjectData[subject] = { total: 0, completed: 0, studyMinutes: 0 };
  });

  records.forEach((record) => {
    const subject = record.subject;
    if (subjectData[subject]) {
      subjectData[subject].total += 1;
      subjectData[subject].studyMinutes += safeNumber(record.studyMinutes);
      if (safeNumber(record.targetAchieveRate) >= 0.8) {
        subjectData[subject].completed += 1;
      }
    }
  });

  const submissions = await AssignmentSubmission.findAll({
    where: {
      userId,
      submittedAt: { [Op.between]: [new Date(periodStart), new Date(periodEnd + ' 23:59:59')] },
    },
    include: [{ association: 'assignment', attributes: ['subject'] }],
  });

  submissions.forEach((sub) => {
    const subject = sub.assignment?.subject;
    if (subject && subjectData[subject]) {
      subjectData[subject].total += 1;
      if (sub.status === '已提交') {
        subjectData[subject].completed += 1;
      }
    }
  });

  const result = SUBJECTS.map((subject) => {
    const data = subjectData[subject];
    const completionRate = data.total > 0 ? Number(((data.completed / data.total) * 100).toFixed(1)) : 0;
    return {
      subject,
      totalTasks: data.total,
      completedTasks: data.completed,
      completionRate,
      studyMinutes: data.studyMinutes,
      studyHours: Number((data.studyMinutes / 60).toFixed(1)),
    };
  });

  const overallTotal = result.reduce((sum, r) => sum + r.totalTasks, 0);
  const overallCompleted = result.reduce((sum, r) => sum + r.completedTasks, 0);
  const overallRate = overallTotal > 0 ? Number(((overallCompleted / overallTotal) * 100).toFixed(1)) : 0;

  return {
    subjects: result,
    overall: {
      totalTasks: overallTotal,
      completedTasks: overallCompleted,
      completionRate: overallRate,
    },
  };
}

async function calculateRecommendationHitRate(userId, periodStart, periodEnd) {
  const recommendations = await Recommendation.findAll({
    where: {
      userId,
      createdAt: { [Op.between]: [new Date(periodStart), new Date(periodEnd + ' 23:59:59')] },
    },
  });

  const total = recommendations.length;
  const clicked = recommendations.filter((r) => r.clickedAt !== null).length;
  const hitRate = total > 0 ? Number(((clicked / total) * 100).toFixed(1)) : 0;

  const avgMatchScore = total > 0
    ? Number((recommendations.reduce((sum, r) => sum + safeNumber(r.matchScore), 0) / total).toFixed(3))
    : 0;

  const subjectStats = {};
  SUBJECTS.forEach((s) => { subjectStats[s] = { total: 0, clicked: 0 }; });

  const recsWithResource = await Recommendation.findAll({
    where: {
      userId,
      createdAt: { [Op.between]: [new Date(periodStart), new Date(periodEnd + ' 23:59:59')] },
    },
    include: [{ association: 'resource', attributes: ['subject'] }],
  });

  recsWithResource.forEach((rec) => {
    const subject = rec.resource?.subject;
    if (subject && subjectStats[subject]) {
      subjectStats[subject].total += 1;
      if (rec.clickedAt) {
        subjectStats[subject].clicked += 1;
      }
    }
  });

  const subjectBreakdown = SUBJECTS.map((subject) => {
    const stats = subjectStats[subject];
    return {
      subject,
      total: stats.total,
      clicked: stats.clicked,
      hitRate: stats.total > 0 ? Number(((stats.clicked / stats.total) * 100).toFixed(1)) : 0,
    };
  });

  return {
    totalRecommendations: total,
    clickedCount: clicked,
    hitRate,
    avgMatchScore,
    subjectBreakdown,
  };
}

async function calculateWrongQuestionDistribution(userId, periodStart, periodEnd) {
  const wrongQuestions = await WrongQuestion.findAll({
    where: {
      userId,
      createdAt: { [Op.between]: [new Date(periodStart), new Date(periodEnd + ' 23:59:59')] },
    },
  });

  const total = wrongQuestions.length;
  const corrected = wrongQuestions.filter((q) => q.corrected).length;
  const correctionRate = total > 0 ? Number(((corrected / total) * 100).toFixed(1)) : 0;

  const masteryDistribution = { '低': 0, '中': 0, '高': 0 };
  const subjectDistribution = {};
  const knowledgePointStats = {};

  SUBJECTS.forEach((s) => { subjectDistribution[s] = 0; });

  wrongQuestions.forEach((q) => {
    masteryDistribution[q.mastery] = (masteryDistribution[q.mastery] || 0) + 1;
    
    const subject = q.code?.split('-')?.[0];
    if (subject && subjectDistribution[subject] !== undefined) {
      subjectDistribution[subject] += 1;
    }

    const kp = q.knowledgePoint;
    if (kp) {
      knowledgePointStats[kp] = (knowledgePointStats[kp] || 0) + q.wrongCount;
    }
  });

  const topKnowledgePoints = Object.entries(knowledgePointStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const subjectBreakdown = SUBJECTS.map((subject) => ({
    subject,
    count: subjectDistribution[subject] || 0,
  }));

  const masteryBreakdown = Object.entries(masteryDistribution).map(([level, count]) => ({
    level,
    count,
    percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
  }));

  return {
    totalWrongQuestions: total,
    correctedCount: corrected,
    correctionRate,
    subjectBreakdown,
    masteryBreakdown,
    topKnowledgePoints,
  };
}

async function calculatePeriodComparison(userId, currentStart, currentEnd) {
  const prevPeriod = getPreviousPeriod(currentStart, currentEnd);

  const [currentDuration, prevDuration] = await Promise.all([
    calculateLearningDurationTrend(userId, currentStart, currentEnd),
    calculateLearningDurationTrend(userId, prevPeriod.start, prevPeriod.end),
  ]);

  const [currentCompletion, prevCompletion] = await Promise.all([
    calculateSubjectCompletion(userId, currentStart, currentEnd),
    calculateSubjectCompletion(userId, prevPeriod.start, prevPeriod.end),
  ]);

  const [currentHitRate, prevHitRate] = await Promise.all([
    calculateRecommendationHitRate(userId, currentStart, currentEnd),
    calculateRecommendationHitRate(userId, prevPeriod.start, prevPeriod.end),
  ]);

  const [currentWrong, prevWrong] = await Promise.all([
    calculateWrongQuestionDistribution(userId, currentStart, currentEnd),
    calculateWrongQuestionDistribution(userId, prevPeriod.start, prevPeriod.end),
  ]);

  const durationChange = prevDuration.totalMinutes > 0
    ? Number((((currentDuration.totalMinutes - prevDuration.totalMinutes) / prevDuration.totalMinutes) * 100).toFixed(1))
    : currentDuration.totalMinutes > 0 ? 100 : 0;

  const completionChange = prevCompletion.overall.completionRate > 0
    ? Number((currentCompletion.overall.completionRate - prevCompletion.overall.completionRate).toFixed(1))
    : currentCompletion.overall.completionRate > 0 ? currentCompletion.overall.completionRate : 0;

  const hitRateChange = prevHitRate.hitRate > 0
    ? Number((currentHitRate.hitRate - prevHitRate.hitRate).toFixed(1))
    : currentHitRate.hitRate > 0 ? currentHitRate.hitRate : 0;

  const wrongCountChange = prevWrong.totalWrongQuestions > 0
    ? Number((((currentWrong.totalWrongQuestions - prevWrong.totalWrongQuestions) / prevWrong.totalWrongQuestions) * 100).toFixed(1))
    : currentWrong.totalWrongQuestions > 0 ? 100 : 0;

  const highlights = [];
  const improvements = [];
  const concerns = [];

  if (durationChange >= 10) {
    highlights.push(`学习时长较上一周期提升 ${durationChange}%，学习积极性显著提高`);
  } else if (durationChange <= -10) {
    concerns.push(`学习时长较上一周期下降 ${Math.abs(durationChange)}%，需关注学习状态`);
  }

  if (completionChange >= 5) {
    improvements.push(`任务完成率提升 ${completionChange} 个百分点，学习执行力增强`);
  } else if (completionChange <= -5) {
    concerns.push(`任务完成率下降 ${Math.abs(completionChange)} 个百分点，需加强任务管理`);
  }

  if (hitRateChange >= 5) {
    improvements.push(`推荐命中率提升 ${hitRateChange} 个百分点，推荐匹配度提高`);
  }

  if (wrongCountChange <= -10) {
    improvements.push(`错题数量减少 ${Math.abs(wrongCountChange)}%，知识掌握程度提升`);
  } else if (wrongCountChange >= 10 && currentWrong.totalWrongQuestions > 5) {
    concerns.push(`错题数量增加 ${wrongCountChange}%，需加强薄弱知识点练习`);
  }

  const subjectComparisons = SUBJECTS.map((subject) => {
    const curr = currentCompletion.subjects.find((s) => s.subject === subject);
    const prev = prevCompletion.subjects.find((s) => s.subject === subject);
    const currRate = curr?.completionRate || 0;
    const prevRate = prev?.completionRate || 0;
    return {
      subject,
      currentRate: currRate,
      previousRate: prevRate,
      change: Number((currRate - prevRate).toFixed(1)),
    };
  });

  return {
    previousPeriod: prevPeriod,
    currentPeriod: { start: currentStart, end: currentEnd },
    metrics: {
      totalMinutes: {
        current: currentDuration.totalMinutes,
        previous: prevDuration.totalMinutes,
        change: durationChange,
        unit: '分钟',
      },
      completionRate: {
        current: currentCompletion.overall.completionRate,
        previous: prevCompletion.overall.completionRate,
        change: completionChange,
        unit: '%',
      },
      hitRate: {
        current: currentHitRate.hitRate,
        previous: prevHitRate.hitRate,
        change: hitRateChange,
        unit: '%',
      },
      wrongQuestions: {
        current: currentWrong.totalWrongQuestions,
        previous: prevWrong.totalWrongQuestions,
        change: wrongCountChange,
        unit: '道',
      },
    },
    subjectComparisons,
    highlights,
    improvements,
    concerns,
  };
}

function generateSummary(duration, completion, hitRate, wrongQuestions, comparison) {
  const overallLevel = completion.overall.completionRate >= 80 ? '优秀'
    : completion.overall.completionRate >= 60 ? '良好'
    : completion.overall.completionRate >= 40 ? '一般'
    : '需努力';

  const bestSubject = [...completion.subjects]
    .filter((s) => s.totalTasks > 0)
    .sort((a, b) => b.completionRate - a.completionRate)[0];

  const weakSubject = [...completion.subjects]
    .filter((s) => s.totalTasks > 0)
    .sort((a, b) => a.completionRate - b.completionRate)[0];

  return {
    overallLevel,
    totalStudyHours: duration.totalHours,
    avgDailyMinutes: duration.avgMinutes,
    completionRate: completion.overall.completionRate,
    hitRate: hitRate.hitRate,
    totalWrongQuestions: wrongQuestions.totalWrongQuestions,
    correctionRate: wrongQuestions.correctionRate,
    bestSubject: bestSubject?.subject || '-',
    bestSubjectRate: bestSubject?.completionRate || 0,
    weakSubject: weakSubject?.subject || '-',
    weakSubjectRate: weakSubject?.completionRate || 0,
    highlights: comparison.highlights,
    improvements: comparison.improvements,
    concerns: comparison.concerns,
  };
}

async function updateProgress(reportId, progress, message) {
  try {
    await LearningReport.update(
      { progress, progressMessage: message },
      { where: { id: reportId } }
    );
  } catch (err) {
    logger.error(`Failed to update report progress: ${err.message}`);
  }
}

async function generateReport(reportId) {
  const report = await LearningReport.findByPk(reportId);
  if (!report) {
    logger.error(`Report ${reportId} not found`);
    return;
  }

  try {
    const userId = report.userId;
    const periodStart = report.periodStart;
    const periodEnd = report.periodEnd;

    await updateProgress(reportId, 10, '正在收集学习时长数据...');
    const durationTrend = await calculateLearningDurationTrend(userId, periodStart, periodEnd);

    await updateProgress(reportId, 30, '正在分析各科完成情况...');
    const subjectCompletion = await calculateSubjectCompletion(userId, periodStart, periodEnd);

    await updateProgress(reportId, 50, '正在计算推荐命中率...');
    const recommendationHitRate = await calculateRecommendationHitRate(userId, periodStart, periodEnd);

    await updateProgress(reportId, 70, '正在分析错题分布...');
    const wrongQuestionDistribution = await calculateWrongQuestionDistribution(userId, periodStart, periodEnd);

    await updateProgress(reportId, 85, '正在进行周期对比分析...');
    const periodComparison = await calculatePeriodComparison(userId, periodStart, periodEnd);

    await updateProgress(reportId, 95, '正在生成报告总结...');
    const summary = generateSummary(
      durationTrend,
      subjectCompletion,
      recommendationHitRate,
      wrongQuestionDistribution,
      periodComparison
    );

    await updateProgress(reportId, 100, '报告生成完成');

    await report.update({
      status: '已完成',
      progress: 100,
      progressMessage: '报告生成完成',
      generatedAt: new Date(),
      summary,
      learningDurationTrend: durationTrend,
      subjectCompletion,
      recommendationHitRate,
      wrongQuestionDistribution,
      periodComparison,
    });

    await SystemLog.create({
      actorUserId: report.generatedBy,
      type: '报告操作',
      content: `生成学情报告#${report.id} - ${report.title}`,
      status: '成功',
    });

    logger.info(`Report ${reportId} generated successfully`);
  } catch (err) {
    logger.error(`Report generation failed: ${err.message}`, err);
    await report.update({
      status: '失败',
      progress: 0,
      progressMessage: '报告生成失败',
      errorMessage: err.message,
    });
  }
}

async function createReport(userId, periodStart, periodEnd, periodType, generatedBy) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  const start = formatDate(periodStart);
  const end = formatDate(periodEnd);
  const title = `${user.name} - ${start} 至 ${end} 学情报告`;

  const report = await LearningReport.create({
    userId,
    periodStart: start,
    periodEnd: end,
    periodType,
    title,
    status: '生成中',
    progress: 0,
    progressMessage: '报告生成中...',
    generatedBy,
  });

  setImmediate(() => generateReport(report.id));

  return report;
}

async function getReportProgress(reportId, userId, isAdmin) {
  const where = { id: reportId };
  if (!isAdmin) {
    where.userId = userId;
  }

  const report = await LearningReport.findOne({ where });
  if (!report) {
    throw new Error('报告不存在');
  }

  return {
    id: report.id,
    status: report.status,
    progress: report.progress,
    progressMessage: report.progressMessage,
    errorMessage: report.errorMessage,
  };
}

async function getReportDetail(reportId, userId, isAdmin) {
  const where = { id: reportId };
  if (!isAdmin) {
    where.userId = userId;
    where.archived = true;
  }

  const report = await LearningReport.findOne({
    where,
    include: [
      { association: 'user', attributes: ['id', 'name', 'stage', 'subjectPreference'] },
      { association: 'generator', attributes: ['id', 'name'] },
    ],
  });

  if (!report) {
    throw new Error('报告不存在或未归档');
  }

  return {
    id: report.id,
    userId: report.userId,
    userName: report.user?.name,
    userStage: report.user?.stage,
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    periodType: report.periodType,
    title: report.title,
    status: report.status,
    archived: report.archived,
    generatedAt: report.generatedAt,
    generatedByName: report.generator?.name,
    summary: report.summary,
    learningDurationTrend: report.learningDurationTrend,
    subjectCompletion: report.subjectCompletion,
    recommendationHitRate: report.recommendationHitRate,
    wrongQuestionDistribution: report.wrongQuestionDistribution,
    periodComparison: report.periodComparison,
    htmlContent: report.htmlContent,
  };
}

async function getAdminReportList(page = 1, pageSize = 20, filters = {}) {
  const where = {};
  if (filters.userId) where.userId = filters.userId;
  if (filters.status) where.status = filters.status;
  if (filters.periodStart) {
    where.periodStart = { [Op.gte]: filters.periodStart };
  }
  if (filters.periodEnd) {
    where.periodEnd = { [Op.lte]: filters.periodEnd };
  }

  const { count, rows } = await LearningReport.findAndCountAll({
    where,
    include: [
      { association: 'user', attributes: ['id', 'name', 'stage'] },
      { association: 'generator', attributes: ['id', 'name'] },
    ],
    order: [['createdAt', 'DESC']],
    offset: (page - 1) * pageSize,
    limit: pageSize,
  });

  return {
    total: count,
    page,
    pageSize,
    list: rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user?.name,
      userStage: r.user?.stage,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      periodType: r.periodType,
      title: r.title,
      status: r.status,
      archived: r.archived,
      progress: r.progress,
      generatedAt: r.generatedAt,
      generatedByName: r.generator?.name,
      overallLevel: r.summary?.overallLevel,
      completionRate: r.summary?.completionRate,
    })),
  };
}

async function getStudentReportList(userId, page = 1, pageSize = 20) {
  const { count, rows } = await LearningReport.findAndCountAll({
    where: { userId, archived: true, status: '已完成' },
    include: [
      { association: 'generator', attributes: ['id', 'name'] },
    ],
    order: [['generatedAt', 'DESC']],
    offset: (page - 1) * pageSize,
    limit: pageSize,
  });

  return {
    total: count,
    page,
    pageSize,
    list: rows.map((r) => ({
      id: r.id,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      periodType: r.periodType,
      title: r.title,
      generatedAt: r.generatedAt,
      generatedByName: r.generator?.name,
      overallLevel: r.summary?.overallLevel,
      completionRate: r.summary?.completionRate,
    })),
  };
}

async function archiveReport(reportId) {
  const report = await LearningReport.findByPk(reportId);
  if (!report) {
    throw new Error('报告不存在');
  }
  if (report.status !== '已完成') {
    throw new Error('报告尚未完成，无法归档');
  }

  await report.update({ archived: true });

  await SystemLog.create({
    actorUserId: null,
    type: '报告操作',
    content: `归档学情报告#${report.id} - ${report.title}`,
    status: '成功',
  });

  return report;
}

async function deleteReport(reportId) {
  const report = await LearningReport.findByPk(reportId);
  if (!report) {
    throw new Error('报告不存在');
  }

  await report.destroy();

  await SystemLog.create({
    actorUserId: null,
    type: '报告操作',
    content: `删除学情报告#${report.id} - ${report.title}`,
    status: '成功',
  });

  return true;
}

module.exports = {
  createReport,
  getReportProgress,
  getReportDetail,
  getAdminReportList,
  getStudentReportList,
  archiveReport,
  deleteReport,
  generateReport,
};
