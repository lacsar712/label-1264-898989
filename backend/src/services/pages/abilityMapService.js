const { Op } = require('sequelize');

const { LearningDaily, WrongQuestion, UserResource, UserBehavior, Resource } = require('../../models');

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物'];

const DIMENSIONS = [
  { key: 'basicKnowledge', name: '基础知识', color: '#6366f1' },
  { key: 'applicationAbility', name: '应用能力', color: '#10b981' },
  { key: 'expansiveThinking', name: '拓展思维', color: '#f59e0b' },
  { key: 'learningEngagement', name: '学习投入', color: '#ef4444' },
];

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

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getSubjectFromKnowledgePoint(kp) {
  for (const s of SUBJECTS) {
    if (kp && kp.includes(s)) return s;
  }
  return '其他';
}

async function getAbilityMapData(userId) {
  const since30 = daysAgo(29);

  const [dailyRecords, wrongQuestions, userResources, behaviors] = await Promise.all([
    LearningDaily.findAll({
      where: { userId, date: { [Op.gte]: toDateOnly(since30) } },
    }),
    WrongQuestion.findAll({ where: { userId } }),
    UserResource.findAll({
      where: { userId, status: { [Op.in]: ['学习中', '已完成'] } },
      include: [{ model: Resource, as: 'resource', attributes: ['id', 'subject', 'difficulty', 'type'] }],
    }),
    UserBehavior.findAll({
      where: { userId, occurredAt: { [Op.gte]: since30 } },
    }),
  ]);

  const subjectMap = {};
  for (const subject of SUBJECTS) {
    subjectMap[subject] = {
      subject,
      dailyList: [],
      wrongList: [],
      resourceList: [],
      behaviorList: [],
    };
  }

  for (const d of dailyRecords) {
    const s = d.subject;
    if (!subjectMap[s]) subjectMap[s] = { subject: s, dailyList: [], wrongList: [], resourceList: [], behaviorList: [] };
    subjectMap[s].dailyList.push(d);
  }

  for (const w of wrongQuestions) {
    const s = getSubjectFromKnowledgePoint(w.knowledgePoint);
    if (!subjectMap[s]) subjectMap[s] = { subject: s, dailyList: [], wrongList: [], resourceList: [], behaviorList: [] };
    subjectMap[s].wrongList.push(w);
  }

  for (const ur of userResources) {
    const s = ur.resource?.subject;
    if (!s) continue;
    if (!subjectMap[s]) subjectMap[s] = { subject: s, dailyList: [], wrongList: [], resourceList: [], behaviorList: [] };
    subjectMap[s].resourceList.push(ur);
  }

  const resourceIdToSubject = {};
  for (const ur of userResources) {
    if (ur.resource?.subject) {
      resourceIdToSubject[ur.resourceId] = ur.resource.subject;
    }
  }

  for (const b of behaviors) {
    const s = resourceIdToSubject[b.resourceId];
    if (!s) continue;
    if (!subjectMap[s]) subjectMap[s] = { subject: s, dailyList: [], wrongList: [], resourceList: [], behaviorList: [] };
    subjectMap[s].behaviorList.push(b);
  }

  const subjects = [];
  const orderedSubjects = SUBJECTS.concat(
    Object.keys(subjectMap).filter((x) => !SUBJECTS.includes(x))
  );

  for (const subject of orderedSubjects) {
    const data = subjectMap[subject];
    if (!data) continue;

    const scores = calculateDimensionScores(data);
    subjects.push({
      subject,
      overallScore: Math.round(
        DIMENSIONS.reduce((sum, d) => sum + scores[d.key], 0) / DIMENSIONS.length
      ),
      dimensions: DIMENSIONS.map((d) => ({
        key: d.key,
        name: d.name,
        color: d.color,
        score: scores[d.key],
        factors: scores[`${d.key}Factors`],
      })),
    });
  }

  const overallRadar = DIMENSIONS.map((d) => {
    const avg = subjects.length
      ? subjects.reduce((sum, s) => sum + s.dimensions.find((dim) => dim.key === d.key)?.score || 0, 0) / subjects.length
      : 0;
    return { name: d.name, value: Math.round(avg), color: d.color, key: d.key };
  });

  const dimensionScoreTable = DIMENSIONS.map((d) => {
    const dim = overallRadar.find((r) => r.key === d.key);
    const avgScore = dim?.value || 0;

    let level = '待提升';
    if (avgScore >= 85) level = '优秀';
    else if (avgScore >= 70) level = '良好';
    else if (avgScore >= 55) level = '中等';

    const topSubject = [...subjects].sort(
      (a, b) =>
        (b.dimensions.find((dim) => dim.key === d.key)?.score || 0) -
        (a.dimensions.find((dim) => dim.key === d.key)?.score || 0)
    )[0];

    const weakSubject = [...subjects].sort(
      (a, b) =>
        (a.dimensions.find((dim) => dim.key === d.key)?.score || 0) -
        (b.dimensions.find((dim) => dim.key === d.key)?.score || 0)
    )[0];

    return {
      key: d.key,
      name: d.name,
      color: d.color,
      score: avgScore,
      level,
      weight: 0.25,
      topSubject: topSubject?.subject || '-',
      topSubjectScore: topSubject?.dimensions.find((dim) => dim.key === d.key)?.score || 0,
      weakSubject: weakSubject?.subject || '-',
      weakSubjectScore: weakSubject?.dimensions.find((dim) => dim.key === d.key)?.score || 0,
      suggestion: getSuggestion(d.key, avgScore),
    };
  });

  return {
    subjects,
    overallRadar,
    dimensionScoreTable,
    defaultSubject: subjects[0]?.subject || '数学',
  };
}

function calculateDimensionScores(data) {
  const { dailyList, wrongList, resourceList, behaviorList } = data;

  const result = {};

  const totalStudyMinutes = dailyList.reduce((sum, d) => sum + safeNumber(d.studyMinutes), 0);
  const studyDays = new Set(dailyList.map((d) => d.date)).size;
  const avgDailyMinutes = studyDays ? totalStudyMinutes / studyDays : 0;
  const avgTargetRate = dailyList.length
    ? dailyList.reduce((sum, d) => sum + safeNumber(d.targetAchieveRate), 0) / dailyList.length
    : 0;
  const totalCompletedResources = dailyList.reduce((sum, d) => sum + safeNumber(d.completedCount), 0);
  const avgMatchScore = dailyList.length
    ? dailyList.reduce((sum, d) => sum + safeNumber(d.avgMatchScore), 0) / dailyList.length
    : 0;

  const totalWrong = wrongList.length;
  const correctedCount = wrongList.filter((w) => w.corrected).length;
  const highMasteryCount = wrongList.filter((w) => w.mastery === '高').length;
  const avgWrongCount = totalWrong
    ? wrongList.reduce((sum, w) => sum + safeNumber(w.wrongCount), 0) / totalWrong
    : 0;

  const completedResources = resourceList.filter((r) => r.status === '已完成');
  const inProgressResources = resourceList.filter((r) => r.status === '学习中');
  const hardResources = resourceList.filter((r) => r.resource?.difficulty === '挑战');
  const expandResources = resourceList.filter((r) => r.resource?.type === '题库' || r.resource?.type === '课件');

  const studyBehaviors = behaviorList.filter((b) => b.type === '学习');
  const totalDwellSeconds = behaviorList.reduce((sum, b) => sum + safeNumber(b.dwellSeconds), 0);
  const clickCount = behaviorList.filter((b) => b.type === '点击').length;
  const favoriteCount = behaviorList.filter((b) => b.type === '收藏').length;

  const basicKnowledgeScore = calculateBasicKnowledge({
    totalStudyMinutes,
    avgMatchScore,
    totalCompletedResources,
    highMasteryCount,
    correctedCount,
    totalWrong,
  });

  const applicationAbilityScore = calculateApplicationAbility({
    completedResources: completedResources.length,
    inProgressResources: inProgressResources.length,
    avgTargetRate,
    correctedCount,
    totalWrong,
    avgWrongCount,
  });

  const expansiveThinkingScore = calculateExpansiveThinking({
    hardResources: hardResources.length,
    expandResources: expandResources.length,
    totalCompletedResources,
    highMasteryCount,
    totalWrong,
    studyDays,
  });

  const learningEngagementScore = calculateLearningEngagement({
    totalStudyMinutes,
    studyDays,
    avgDailyMinutes,
    studyBehaviors: studyBehaviors.length,
    totalDwellSeconds,
    clickCount,
    favoriteCount,
    totalCompletedResources,
  });

  result.basicKnowledge = clampScore(basicKnowledgeScore.score);
  result.basicKnowledgeFactors = basicKnowledgeScore.factors;

  result.applicationAbility = clampScore(applicationAbilityScore.score);
  result.applicationAbilityFactors = applicationAbilityScore.factors;

  result.expansiveThinking = clampScore(expansiveThinkingScore.score);
  result.expansiveThinkingFactors = expansiveThinkingScore.factors;

  result.learningEngagement = clampScore(learningEngagementScore.score);
  result.learningEngagementFactors = learningEngagementScore.factors;

  return result;
}

function calculateBasicKnowledge(params) {
  const { totalStudyMinutes, avgMatchScore, totalCompletedResources, highMasteryCount, correctedCount, totalWrong } = params;

  const factors = [];

  const studyMinutesScore = Math.min(100, (totalStudyMinutes / 600) * 40);
  factors.push({
    name: '学习时长积累',
    value: studyMinutesScore,
    weight: 0.3,
    contribution: studyMinutesScore * 0.3,
    isPositive: true,
    detail: `累计学习 ${totalStudyMinutes} 分钟`,
  });

  const matchScoreScore = safeNumber(avgMatchScore) * 100 * 0.25;
  factors.push({
    name: '资源匹配度',
    value: Math.round(safeNumber(avgMatchScore) * 100),
    weight: 0.25,
    contribution: matchScoreScore,
    isPositive: safeNumber(avgMatchScore) >= 0.6,
    detail: `平均匹配度 ${(safeNumber(avgMatchScore) * 100).toFixed(0)}%`,
  });

  const completionScore = Math.min(100, (totalCompletedResources / 15) * 100) * 0.2;
  factors.push({
    name: '资源完成量',
    value: totalCompletedResources,
    weight: 0.2,
    contribution: completionScore,
    isPositive: totalCompletedResources >= 8,
    detail: `完成 ${totalCompletedResources} 个学习资源`,
  });

  const masteryRate = totalWrong ? highMasteryCount / totalWrong : 0.7;
  const masteryScore = masteryRate * 100 * 0.15;
  factors.push({
    name: '错题掌握率',
    value: Math.round(masteryRate * 100),
    weight: 0.15,
    contribution: masteryScore,
    isPositive: masteryRate >= 0.6,
    detail: `错题掌握率 ${(masteryRate * 100).toFixed(0)}% (${highMasteryCount}/${totalWrong || 0})`,
  });

  const correctionRate = totalWrong ? correctedCount / totalWrong : 1;
  const correctionScore = correctionRate * 100 * 0.1;
  factors.push({
    name: '订正完成率',
    value: Math.round(correctionRate * 100),
    weight: 0.1,
    contribution: correctionScore,
    isPositive: correctionRate >= 0.7,
    detail: `已订正 ${correctedCount}/${totalWrong || 0} 道错题`,
  });

  const totalScore = factors.reduce((sum, f) => sum + f.contribution, 0);
  return { score: totalScore, factors };
}

function calculateApplicationAbility(params) {
  const { completedResources, inProgressResources, avgTargetRate, correctedCount, totalWrong, avgWrongCount } = params;

  const factors = [];

  const completionCountScore = Math.min(100, (completedResources / 10) * 100) * 0.25;
  factors.push({
    name: '已完成资源数',
    value: completedResources,
    weight: 0.25,
    contribution: completionCountScore,
    isPositive: completedResources >= 6,
    detail: `已完成 ${completedResources} 个资源`,
  });

  const inProgressScore = Math.min(100, (inProgressResources / 5) * 100) * 0.15;
  factors.push({
    name: '在学资源数',
    value: inProgressResources,
    weight: 0.15,
    contribution: inProgressScore,
    isPositive: inProgressResources >= 3,
    detail: `正在学习 ${inProgressResources} 个资源`,
  });

  const targetRateScore = safeNumber(avgTargetRate) * 100 * 0.3;
  factors.push({
    name: '目标达成率',
    value: Math.round(safeNumber(avgTargetRate) * 100),
    weight: 0.3,
    contribution: targetRateScore,
    isPositive: safeNumber(avgTargetRate) >= 0.7,
    detail: `平均目标达成率 ${(safeNumber(avgTargetRate) * 100).toFixed(0)}%`,
  });

  const correctionEffect = totalWrong ? correctedCount / totalWrong : 1;
  const correctionEffectScore = correctionEffect * 100 * 0.2;
  factors.push({
    name: '错题订正效果',
    value: Math.round(correctionEffect * 100),
    weight: 0.2,
    contribution: correctionEffectScore,
    isPositive: correctionEffect >= 0.6,
    detail: `订正比例 ${(correctionEffect * 100).toFixed(0)}%`,
  });

  const repeatWrongScore = Math.max(0, 100 - (safeNumber(avgWrongCount) - 1) * 30) * 0.1;
  factors.push({
    name: '错题重复率',
    value: safeNumber(avgWrongCount).toFixed(1),
    weight: 0.1,
    contribution: repeatWrongScore,
    isPositive: safeNumber(avgWrongCount) <= 1.5,
    detail: `平均每道题做错 ${safeNumber(avgWrongCount).toFixed(1)} 次`,
  });

  const totalScore = factors.reduce((sum, f) => sum + f.contribution, 0);
  return { score: totalScore, factors };
}

function calculateExpansiveThinking(params) {
  const { hardResources, expandResources, totalCompletedResources, highMasteryCount, totalWrong, studyDays } = params;

  const factors = [];

  const hardResourceRate = totalCompletedResources ? hardResources / totalCompletedResources : 0;
  const hardScore = Math.min(100, hardResourceRate * 200) * 0.3;
  factors.push({
    name: '高难度资源占比',
    value: Math.round(hardResourceRate * 100),
    weight: 0.3,
    contribution: hardScore,
    isPositive: hardResourceRate >= 0.3,
    detail: `困难资源 ${hardResources} 个，占比 ${(hardResourceRate * 100).toFixed(0)}%`,
  });

  const expandScore = Math.min(100, expandResources * 20) * 0.25;
  factors.push({
    name: '拓展资源学习',
    value: expandResources,
    weight: 0.25,
    contribution: expandScore,
    isPositive: expandResources >= 3,
    detail: `学习拓展/竞赛类资源 ${expandResources} 个`,
  });

  const masteryDepth = totalWrong ? highMasteryCount / totalWrong : 0.8;
  const masteryDepthScore = masteryDepth * 100 * 0.2;
  factors.push({
    name: '知识深度掌握',
    value: Math.round(masteryDepth * 100),
    weight: 0.2,
    contribution: masteryDepthScore,
    isPositive: masteryDepth >= 0.6,
    detail: `高掌握程度错题占比 ${(masteryDepth * 100).toFixed(0)}%`,
  });

  const consistencyScore = Math.min(100, (studyDays / 20) * 100) * 0.15;
  factors.push({
    name: '学习持续性',
    value: studyDays,
    weight: 0.15,
    contribution: consistencyScore,
    isPositive: studyDays >= 15,
    detail: `近30天学习 ${studyDays} 天`,
  });

  const challengeScore = Math.min(100, (hardResources + expandResources) * 15) * 0.1;
  factors.push({
    name: '自我挑战度',
    value: hardResources + expandResources,
    weight: 0.1,
    contribution: challengeScore,
    isPositive: hardResources + expandResources >= 5,
    detail: `挑战性资源共 ${hardResources + expandResources} 个`,
  });

  const totalScore = factors.reduce((sum, f) => sum + f.contribution, 0);
  return { score: totalScore, factors };
}

function calculateLearningEngagement(params) {
  const { totalStudyMinutes, studyDays, avgDailyMinutes, studyBehaviors, totalDwellSeconds, clickCount, favoriteCount, totalCompletedResources } = params;

  const factors = [];

  const timeScore = Math.min(100, (totalStudyMinutes / 900) * 100) * 0.25;
  factors.push({
    name: '累计学习时长',
    value: totalStudyMinutes,
    weight: 0.25,
    contribution: timeScore,
    isPositive: totalStudyMinutes >= 600,
    detail: `累计学习 ${totalStudyMinutes} 分钟 (${Math.round(totalStudyMinutes / 60)} 小时)`,
  });

  const dayScore = Math.min(100, (studyDays / 25) * 100) * 0.2;
  factors.push({
    name: '学习天数',
    value: studyDays,
    weight: 0.2,
    contribution: dayScore,
    isPositive: studyDays >= 18,
    detail: `近30天学习 ${studyDays} 天`,
  });

  const avgDailyScore = Math.min(100, (avgDailyMinutes / 60) * 100) * 0.2;
  factors.push({
    name: '日均学习时长',
    value: Math.round(avgDailyMinutes),
    weight: 0.2,
    contribution: avgDailyScore,
    isPositive: avgDailyMinutes >= 40,
    detail: `日均学习 ${Math.round(avgDailyMinutes)} 分钟`,
  });

  const dwellMinutes = Math.round(totalDwellSeconds / 60);
  const dwellScore = Math.min(100, (dwellMinutes / 500) * 100) * 0.15;
  factors.push({
    name: '有效停留时长',
    value: dwellMinutes,
    weight: 0.15,
    contribution: dwellScore,
    isPositive: dwellMinutes >= 300,
    detail: `资源页面有效停留 ${dwellMinutes} 分钟`,
  });

  const interactScore = Math.min(100, ((clickCount + favoriteCount) / 50) * 100) * 0.1;
  factors.push({
    name: '互动活跃度',
    value: clickCount + favoriteCount,
    weight: 0.1,
    contribution: interactScore,
    isPositive: clickCount + favoriteCount >= 30,
    detail: `点击 ${clickCount} 次，收藏 ${favoriteCount} 次`,
  });

  const completionEfficiency = totalCompletedResources && studyDays
    ? totalCompletedResources / studyDays
    : 0;
  const efficiencyScore = Math.min(100, completionEfficiency * 40) * 0.1;
  factors.push({
    name: '学习效率',
    value: completionEfficiency.toFixed(2),
    weight: 0.1,
    contribution: efficiencyScore,
    isPositive: completionEfficiency >= 1.5,
    detail: `日均完成 ${completionEfficiency.toFixed(2)} 个资源`,
  });

  const totalScore = factors.reduce((sum, f) => sum + f.contribution, 0);
  return { score: totalScore, factors };
}

function getSuggestion(dimensionKey, score) {
  const suggestions = {
    basicKnowledge: {
      high: '基础知识扎实，建议挑战更高难度内容以实现突破。',
      mid: '基础尚可，建议系统梳理知识框架，弥补薄弱环节。',
      low: '基础知识需要加强，建议从基础概念和定义开始系统性复习。',
    },
    applicationAbility: {
      high: '应用能力出色，建议尝试综合性项目和跨学科实践。',
      mid: '应用能力中等，建议多做练习和案例分析，提升知识迁移能力。',
      low: '应用能力待提升，建议多做习题，注重知识点的实际运用。',
    },
    expansiveThinking: {
      high: '拓展思维活跃，建议参加竞赛或深入研究感兴趣的方向。',
      mid: '有一定拓展能力，建议多接触不同类型的学习资源拓宽视野。',
      low: '拓展思维需要培养，建议尝试一些拓展类资源和开放性问题。',
    },
    learningEngagement: {
      high: '学习投入度很高，继续保持，注意劳逸结合避免 burnout。',
      mid: '学习投入尚可，建议建立更规律的学习习惯，提升专注度。',
      low: '学习投入需要加强，建议设定明确目标，使用番茄钟等工具辅助。',
    },
  };

  const level = score >= 75 ? 'high' : score >= 55 ? 'mid' : 'low';
  return suggestions[dimensionKey]?.[level] || '继续努力，稳步提升。';
}

module.exports = { getAbilityMapData };
