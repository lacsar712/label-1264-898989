const { RecommendationRule, RecommendationBatch, SystemParam, SystemLog } = require('../../models');

const DEFAULT_RULE = {
  ruleCode: 'RULE-BASE',
  name: '基础策略（初始）',
  weightRatio: [
    { name: '行为匹配', value: 0.4 },
    { name: '标签匹配', value: 0.45 },
    { name: '热度', value: 0.15 },
  ],
  updatedAt: new Date(),
};
const DEFAULT_LOG_TYPES = ['登录', '配置修改', '资源操作'];

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function getAdminSystemData() {
  const rules = await RecommendationRule.findAll({ order: [['updatedAt', 'DESC']] });
  const params = await SystemParam.findAll({ order: [['updatedAt', 'DESC']] });
  const logs = await SystemLog.findAll({ order: [['createdAt', 'DESC']], limit: 60 });

  const activeRule = rules.find((r) => r.enabled) || rules[0] || DEFAULT_RULE;
  const weightTable = (activeRule?.weightRatio || []).map((x) => ({
    name: x.name,
    baseWeight: safeNumber(x.value),
    factor: 1.0,
    effectiveAt: activeRule?.updatedAt || new Date(),
  }));

  const batches = await RecommendationBatch.findAll({ order: [['createdAt', 'ASC']], limit: 14 });
  const half = Math.floor(batches.length / 2) || 1;
  const before = batches.slice(0, half);
  const after = batches.slice(half);
  const avg = (arr) => (arr.length ? arr.reduce((s, b) => s + safeNumber(b.completionRate), 0) / arr.length : 0);
  const ruleSimLine = activeRule
    ? [
        {
          name: activeRule.name,
          points: [
            { x: '调整前', y: avg(before) },
            { x: '调整后', y: avg(after) },
          ],
        },
      ]
    : [];

  const maxRecommend = params.find((p) => p.paramCode === 'MAX_RECOMMEND')?.value || '20';
  const updateFreq = params.find((p) => p.paramCode === 'UPDATE_FREQ')?.value || '30';

  const logTypeMap = DEFAULT_LOG_TYPES.reduce((acc, type) => {
    acc[type] = { name: type, value: 0 };
    return acc;
  }, {});
  for (const l of logs) {
    logTypeMap[l.type] = logTypeMap[l.type] || { name: l.type, value: 0 };
    logTypeMap[l.type].value += 1;
  }
  const logTypeDist = Object.values(logTypeMap);

  const logTable = logs.map((l) => ({
    logId: l.id,
    actor: l.actorUserId || '-',
    type: l.type,
    content: l.content,
    occurredAt: l.createdAt,
    ip: l.ip,
    status: l.status,
  }));

  return {
    activeRule: activeRule
      ? {
          ruleId: activeRule.ruleCode,
          name: activeRule.name,
          weightRatio: activeRule.weightRatio,
          updatedAt: activeRule.updatedAt,
        }
      : null,
    ruleSimLine,
    weightTable,
    gauge: {
      maxRecommend: Number(maxRecommend),
      updateFreq: Number(updateFreq),
    },
    paramTable: params.map((p) => ({
      paramId: p.paramCode,
      name: p.name,
      value: p.value,
      defaultValue: p.defaultValue,
      updatedBy: p.updatedBy,
      updatedAt: p.updatedAt,
    })),
    logTypeDist,
    logTable,
  };
}

module.exports = { getAdminSystemData };
