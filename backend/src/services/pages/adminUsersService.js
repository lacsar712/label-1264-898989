const { Op } = require('sequelize');

const { User, UserTag, LearningDaily, UserBehavior, Resource } = require('../../models');

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物'];
const DEFAULT_STAGES = ['小学', '初中', '高中'];
const DEFAULT_TAGS = ['代数', '几何', '阅读理解', '语法'];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateOnly(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function getAdminUsersData() {
  const users = await User.findAll({ order: [['createdAt', 'DESC']], limit: 30 });
  const allTags = await UserTag.findAll({ order: [['weight', 'DESC']] });

  const stageList = Array.from(new Set([...DEFAULT_STAGES, ...users.map((u) => u.stage).filter(Boolean)]));

  const heatmap = stageList.map((stage) => {
    const row = { stage };
    for (const s of SUBJECTS) row[s] = 0;
    for (const u of users.filter((x) => x.stage === stage)) {
      for (const s of u.subjectPreference || []) {
        if (row[s] !== undefined) row[s] += 1;
      }
    }
    return row;
  });

  const userList = await Promise.all(
    users.map(async (u) => {
      const tags = allTags.filter((t) => t.userId === u.id).slice(0, 3).map((t) => t.name);
      const last7 = await LearningDaily.findAll({ where: { userId: u.id, date: { [Op.gte]: toDateOnly(daysAgo(6)) } } });
      const minutes = last7.reduce((s, d) => s + d.studyMinutes, 0);
      const activity = minutes >= 480 ? '高' : minutes >= 240 ? '中' : '低';
      return {
        userId: u.id,
        name: u.name,
        stage: u.stage,
        learningStyle: u.learningStyle,
        subjectPreference: u.subjectPreference,
        coreTags: tags,
        createdAt: u.createdAt,
        activity,
        active: u.active,
      };
    })
  );

  const behaviors = await UserBehavior.findAll({
    order: [['occurredAt', 'DESC']],
    limit: 80,
  });

  const userMetaById = userList.reduce((acc, u) => {
    acc[u.userId] = { stage: u.stage || '未知', activity: u.activity || '低' };
    return acc;
  }, {});
  const groupedBehaviors = Object.values(
    behaviors.reduce((acc, b) => {
      const meta = userMetaById[b.userId] || { stage: '未知', activity: '低' };
      const groupName = `${meta.stage}·${meta.activity}`;
      acc[groupName] = acc[groupName] || { name: groupName, click: 0, learnMinutes: 0 };
      if (b.type === '点击') acc[groupName].click += 1;
      if (b.type === '学习') acc[groupName].learnMinutes += safeNumber(b.dwellSeconds) / 60;
      return acc;
    }, {})
  )
    .sort((a, b) => b.click - a.click || b.learnMinutes - a.learnMinutes)
    .slice(0, 10);

  let behaviorTop10 = groupedBehaviors.map((x) => ({
    name: x.name,
    click: x.click,
    learnMinutes: Number(x.learnMinutes.toFixed(1)),
  }));
  if (behaviorTop10.length < 10) {
    const missing = 10 - behaviorTop10.length;
    for (let i = 0; i < missing; i += 1) {
      behaviorTop10.push({
        name: `分组#${behaviorTop10.length + 1}`,
        click: 0,
        learnMinutes: 0,
      });
    }
  }

  const behaviorTable = await Promise.all(
    behaviors.slice(0, 40).map(async (b) => {
      const r = await Resource.findByPk(b.resourceId);
      return {
        userId: b.userId,
        type: b.type,
        resourceId: r?.code || `R-${b.resourceId}`,
        occurredAt: b.occurredAt,
        dwellSeconds: b.dwellSeconds,
      };
    })
  );

  const scatterStages = Array.from(new Set([...stageList, ...users.map((u) => u.stage).filter(Boolean)]));
  let scatterPoints = allTags.slice(0, 180).map((t) => ({
    stage: users.find((u) => u.id === t.userId)?.stage || '未知',
    tagName: t.name,
    weight: safeNumber(t.weight),
    userId: t.userId,
  }));
  if (scatterPoints.length === 0) {
    scatterPoints = [];
  }
  const pointKeys = new Set(scatterPoints.map((x) => `${x.stage}__${x.tagName}`));
  for (const stage of scatterStages) {
    for (const tagName of DEFAULT_TAGS) {
      const key = `${stage}__${tagName}`;
      if (pointKeys.has(key)) continue;
      scatterPoints.push({ stage, tagName, weight: 0, userId: 0 });
      pointKeys.add(key);
    }
  }
  const tagScatter = {
    stages: scatterStages,
    points: scatterPoints,
  };

  const tagManageTable = allTags.slice(0, 60).map((t) => {
    const u = users.find((x) => x.id === t.userId);
    return {
      tagId: t.id,
      userId: t.userId,
      tagName: t.name,
      audience: u ? `${u.stage} · ${u.name}` : `用户#${t.userId}`,
      relatedBehavior: t.category,
      weight: safeNumber(t.weight),
      updatedAt: t.updatedAt,
    };
  });

  return {
    heatmap,
    userList,
    behaviorTop10,
    behaviorTable,
    tagScatter,
    tagManageTable,
  };
}

module.exports = { getAdminUsersData };
