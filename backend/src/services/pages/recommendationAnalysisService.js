const { Op } = require('sequelize');

const { LearningDaily, WrongQuestion, RecommendationRule, RecommendationBatch } = require('../../models');

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

async function getRecommendationAnalysisData(userId) {
  const wrong = await WrongQuestion.findAll({ where: { userId } });
  const daily30 = await LearningDaily.findAll({
    where: { userId, date: { [Op.gte]: toDateOnly(daysAgo(29)) } },
  });

  const masteryHigh = wrong.filter((w) => w.mastery === '高').length;
  const masteryTotal = wrong.length || 1;
  const knowledgeScore = Math.round((masteryHigh / masteryTotal) * 100);

  const avgMinutes = daily30.length ? daily30.reduce((s, d) => s + d.studyMinutes, 0) / daily30.length : 0;
  const timeScore = Math.min(100, Math.round((avgMinutes / 120) * 100));

  const avgCompleted = daily30.length ? daily30.reduce((s, d) => s + d.completedCount, 0) / daily30.length : 0;
  const speedScore = Math.min(100, Math.round((avgCompleted / 6) * 100));

  const radar = [
    { name: '知识点掌握', value: knowledgeScore },
    { name: '解题速度', value: speedScore },
    { name: '学习时长', value: timeScore },
  ];

  const dimensionTable = [
    {
      name: '知识点掌握',
      score: knowledgeScore,
      weight: 0.4,
      suggestion: knowledgeScore >= 80 ? '保持巩固高频知识点' : '优先补齐薄弱知识点并做针对练习',
    },
    {
      name: '解题速度',
      score: speedScore,
      weight: 0.3,
      suggestion: speedScore >= 80 ? '适当挑战综合题提升上限' : '通过限时练习提升速度与准确率',
    },
    {
      name: '学习时长',
      score: timeScore,
      weight: 0.3,
      suggestion: timeScore >= 80 ? '维持稳定节奏，避免疲劳' : '拆分为短时段学习以提高坚持度',
    },
  ];

  const rules = await RecommendationRule.findAll({ order: [['updatedAt', 'DESC']] });
  let ruleTable = rules.map((r) => ({
    ruleId: r.ruleCode,
    name: r.name,
    matchDimensions: r.matchDimensions,
    weightRatio: r.weightRatio,
    enabled: r.enabled,
  }));
  if (ruleTable.length === 0) {
    ruleTable = [
      {
        ruleId: 'RULE-BASE',
        name: '基础策略（初始）',
        matchDimensions: ['行为匹配', '标签匹配', '热度'],
        weightRatio: [
          { name: '行为匹配', value: 0.4 },
          { name: '标签匹配', value: 0.45 },
          { name: '热度', value: 0.15 },
        ],
        enabled: true,
      },
    ];
  }

  const batches = await RecommendationBatch.findAll({
    where: { userId },
    order: [['createdAt', 'ASC']],
    limit: 14,
  });

  const baseBatchLabels = listRecentDates(14).map((d) => `BATCH-${d}`);
  const effectTrendMap = baseBatchLabels.reduce((acc, label) => {
    acc[label] = { batch: label, clickCount: 0, completionRateSum: 0, n: 0 };
    return acc;
  }, {});
  const extraLabels = [];

  for (const b of batches) {
    const batchLabel = b.batchCode || `BATCH-${toDateOnly(b.createdAt)}`;
    if (!effectTrendMap[batchLabel]) {
      effectTrendMap[batchLabel] = { batch: batchLabel, clickCount: 0, completionRateSum: 0, n: 0 };
      extraLabels.push(batchLabel);
    }
    effectTrendMap[batchLabel].clickCount += safeNumber(b.clickCount);
    effectTrendMap[batchLabel].completionRateSum += safeNumber(b.completionRate);
    effectTrendMap[batchLabel].n += 1;
  }

  const trendOrder = baseBatchLabels.concat(extraLabels);
  const effectTrend = trendOrder.map((batch) => {
    const row = effectTrendMap[batch];
    const completionRate = row.n ? row.completionRateSum / row.n : 0;
    return {
      batch,
      clickCount: row.clickCount,
      completionRate,
      retentionRate: completionRate > 0 ? Math.min(1, completionRate * 0.9 + 0.05) : 0,
    };
  });

  let effectTable = batches
    .slice()
    .reverse()
    .slice(0, 10)
    .map((b) => ({
      batch: b.batchCode,
      resourceCount: b.resourceCount,
      clickCount: b.clickCount,
      completeCount: b.completeCount,
      completionRate: safeNumber(b.completionRate),
      reviewNote: b.reviewNote,
    }));
  if (effectTable.length === 0) {
    effectTable = effectTrend
      .slice()
      .reverse()
      .slice(0, 10)
      .map((x) => ({
        batch: x.batch,
        resourceCount: 0,
        clickCount: x.clickCount,
        completeCount: 0,
        completionRate: x.completionRate,
        reviewNote: '初始数据',
      }));
  }

  const strategySankey = {
    nodes: [
      { name: '行为采集' },
      { name: '标签建模' },
      { name: '资源匹配' },
      { name: '排序' },
      { name: '推荐输出' },
    ],
    links: [
      { source: '行为采集', target: '标签建模', value: 8 },
      { source: '标签建模', target: '资源匹配', value: 7 },
      { source: '资源匹配', target: '排序', value: 6 },
      { source: '排序', target: '推荐输出', value: 6 },
    ],
  };
  const strategyFlow = {
    nodes: [
      { id: 'collect', name: '行为采集', x: 8, y: 50, desc: '点击/学习/收藏行为' },
      { id: 'tag', name: '标签建模', x: 28, y: 50, desc: '用户画像与标签权重' },
      { id: 'match', name: '资源匹配', x: 48, y: 50, desc: '知识点与资源关联' },
      { id: 'rank', name: '排序', x: 68, y: 50, desc: '规则加权与重排' },
      { id: 'output', name: '推荐输出', x: 88, y: 50, desc: '结果分发与回流' },
    ],
    edges: [
      { source: 'collect', target: 'tag' },
      { source: 'tag', target: 'match' },
      { source: 'match', target: 'rank' },
      { source: 'rank', target: 'output' },
    ],
  };

  return {
    radar,
    dimensionTable,
    strategyFlow,
    strategySankey,
    ruleTable,
    effectTrend,
    effectTable,
  };
}

module.exports = { getRecommendationAnalysisData };
