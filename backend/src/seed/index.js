require('dotenv').config();

const bcrypt = require('bcryptjs');

const {
  sequelize,
  User,
  UserTag,
  Resource,
  ResourceCategory,
  ResourceTag,
  RecommendationRule,
  RecommendationBatch,
  Recommendation,
  UserResource,
  FavoriteFolder,
  LearningDaily,
  LearningGoal,
  WrongQuestion,
  SystemParam,
  SystemLog,
  UserBehavior,
} = require('../models');
const { logger } = require('../utils/logger');
const { waitForDb } = require('../utils/waitForDb');

function createRng(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

function dateOnly(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function sample(rng, arr, n) {
  const pool = arr.slice();
  const out = [];
  for (let i = 0; i < n && pool.length; i += 1) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

async function main() {
  await waitForDb({ retries: 60, delayMs: 2000 });
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    await sequelize.sync({ force: true });
  } finally {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  const rng = createRng(1264);

  const adminPass = await bcrypt.hash('123456', 10);
  const studentPass = await bcrypt.hash('123456', 10);

  const [admin, student] = await Promise.all([
    User.create({
      username: 'admin',
      passwordHash: adminPass,
      role: 'admin',
      name: '系统管理员',
      stage: '管理员',
      learningStyle: '结构型',
      subjectPreference: [],
      active: true,
    }),
    User.create({
      username: 'student',
      passwordHash: studentPass,
      role: 'student',
      name: '李同学',
      stage: '初中',
      learningStyle: '视觉型',
      subjectPreference: ['数学', '英语', '物理'],
      active: true,
    }),
  ]);

  const extraUsers = await User.bulkCreate(
    [
      { username: 'u001', passwordHash: studentPass, role: 'student', name: '王同学', stage: '小学', learningStyle: '听觉型', subjectPreference: ['语文', '数学'], active: true },
      { username: 'u002', passwordHash: studentPass, role: 'student', name: '赵同学', stage: '小学', learningStyle: '动觉型', subjectPreference: ['数学', '英语'], active: true },
      { username: 'u003', passwordHash: studentPass, role: 'student', name: '钱同学', stage: '初中', learningStyle: '视觉型', subjectPreference: ['数学', '物理'], active: true },
      { username: 'u004', passwordHash: studentPass, role: 'student', name: '孙同学', stage: '初中', learningStyle: '结构型', subjectPreference: ['英语', '化学'], active: true },
      { username: 'u005', passwordHash: studentPass, role: 'student', name: '周同学', stage: '高中', learningStyle: '视觉型', subjectPreference: ['物理', '化学', '数学'], active: true },
      { username: 'u006', passwordHash: studentPass, role: 'student', name: '吴同学', stage: '高中', learningStyle: '听觉型', subjectPreference: ['生物', '英语'], active: true },
    ],
    { validate: true }
  );

  await UserTag.bulkCreate(
    [
      { userId: student.id, name: '初中', category: '学习阶段', weight: 0.85 },
      { userId: student.id, name: '数学偏好', category: '学科偏好', weight: 0.9 },
      { userId: student.id, name: '英语偏好', category: '学科偏好', weight: 0.72 },
      { userId: student.id, name: '物理偏好', category: '学科偏好', weight: 0.64 },
      { userId: student.id, name: '视觉型', category: '学习风格', weight: 0.88 },
      { userId: student.id, name: '阶段测评：良好', category: '能力标签', weight: 0.78 },
      { userId: student.id, name: '错题复盘积极', category: '行为标签', weight: 0.66 },
      { userId: student.id, name: '坚持度中等', category: '行为标签', weight: 0.55 },
    ],
    { validate: true }
  );

  const subjects = ['语文', '数学', '英语', '物理', '化学', '生物'];
  const types = ['课程', '课件', '题库', '视频'];
  const difficulties = ['基础', '提高', '挑战'];
  const statuses = ['上架', '上架', '上架', '审核中', '下架'];

  const resourceRows = [];
  for (let i = 1; i <= 48; i += 1) {
    const subject = pick(rng, subjects);
    const type = pick(rng, types);
    const difficulty = pick(rng, difficulties);
    const baseHours = type === '课程' ? 3 : type === '题库' ? 2 : type === '视频' ? 1.5 : 1;
    const diffMultiplier = difficulty === '基础' ? 0.7 : difficulty === '提高' ? 1 : 1.5;
    resourceRows.push({
      code: `RES-${String(i).padStart(4, '0')}`,
      name: `${subject}${type} · ${difficulty}提升第${i}讲`,
      subject,
      type,
      difficulty,
      heat: Math.floor(rng() * 980 + 20),
      rating: clamp(Number((rng() * 2.5 + 2.5).toFixed(2)), 2.5, 5),
      estimatedHours: clamp(Number((baseHours * diffMultiplier * (0.8 + rng() * 0.4)).toFixed(1)), 0.5, 12),
      status: pick(rng, statuses),
      deleted: false,
      uploadedAt: daysAgo(Math.floor(rng() * 40)),
    });
  }
  const resources = await Resource.bulkCreate(resourceRows, { validate: true });

  const categoryRows = [];
  for (let i = 0; i < subjects.length; i += 1) {
    for (let j = 0; j < types.length; j += 1) {
      const subject = subjects[i];
      const type = types[j];
      categoryRows.push({
        categoryCode: `CAT-${subject}-${type}`,
        categoryName: subject,
        parentCategory: type,
        subject,
        type,
        sortOrder: i * 10 + j + 1,
        active: true,
      });
    }
  }
  await ResourceCategory.bulkCreate(categoryRows, { validate: true });

  const tagPool = ['代数', '几何', '阅读理解', '写作', '语法', '力学', '电学', '化学反应', '细胞', '遗传', '函数', '概率', '听力', '词汇'];
  const stagePool = ['小学', '初中', '高中'];
  const resourceTagRows = [];
  for (const r of resources) {
    const tags = sample(rng, tagPool, 3);
    for (const t of tags) {
      resourceTagRows.push({
        resourceId: r.id,
        name: t,
        stage: pick(rng, stagePool),
        weight: clamp(rng() * 0.9 + 0.1, 0.1, 1),
      });
    }
  }
  await ResourceTag.bulkCreate(resourceTagRows, { validate: true });

  await RecommendationRule.bulkCreate(
    [
      {
        ruleCode: 'RULE-001',
        name: '基础策略：标签+行为综合',
        matchDimensions: ['行为匹配', '标签匹配', '热度'],
        weightRatio: [
          { name: '行为匹配', value: 0.4 },
          { name: '标签匹配', value: 0.45 },
          { name: '热度', value: 0.15 },
        ],
        enabled: true,
      },
      {
        ruleCode: 'RULE-002',
        name: '强化策略：薄弱知识点优先',
        matchDimensions: ['错题关联', '标签匹配', '热度'],
        weightRatio: [
          { name: '错题关联', value: 0.5 },
          { name: '标签匹配', value: 0.35 },
          { name: '热度', value: 0.15 },
        ],
        enabled: true,
      },
      {
        ruleCode: 'RULE-003',
        name: '探索策略：多样性提升',
        matchDimensions: ['多样性', '标签匹配', '热度'],
        weightRatio: [
          { name: '多样性', value: 0.35 },
          { name: '标签匹配', value: 0.45 },
          { name: '热度', value: 0.2 },
        ],
        enabled: false,
      },
    ],
    { validate: true }
  );

  await SystemParam.bulkCreate(
    [
      { paramCode: 'MAX_RECOMMEND', name: '最大推荐数', value: '20', defaultValue: '20', updatedBy: 'system' },
      { paramCode: 'UPDATE_FREQ', name: '数据更新频率(分钟)', value: '30', defaultValue: '30', updatedBy: 'system' },
    ],
    { validate: true }
  );

  await SystemLog.bulkCreate(
    [
      { actorUserId: admin.id, type: '登录', content: '管理员登录成功', ip: '127.0.0.1', status: '成功' },
      { actorUserId: admin.id, type: '配置修改', content: '初始化系统参数', ip: '127.0.0.1', status: '成功' },
      { actorUserId: admin.id, type: '资源操作', content: '初始化资源库数据', ip: '127.0.0.1', status: '成功' },
    ],
    { validate: true }
  );

  const dailyRows = [];
  for (let i = 29; i >= 0; i -= 1) {
    const baseMinutes = 40 + Math.floor(rng() * 80);
    const subjectA = pick(rng, subjects);
    const subjectB = pick(rng, subjects);
    const subjectsToday = [subjectA, subjectB];
    for (const s of subjectsToday) {
      const minutes = clamp(Math.floor(baseMinutes * (0.4 + rng() * 0.7)), 15, 150);
      const completed = clamp(Math.floor(rng() * 6), 0, 8);
      const match = clamp(rng() * 0.35 + 0.55, 0, 1);
      const achieve = clamp(minutes / 90, 0, 1);
      dailyRows.push({
        userId: student.id,
        date: dateOnly(daysAgo(i)),
        subject: s,
        studyMinutes: minutes,
        completedCount: completed,
        avgMatchScore: match,
        targetAchieveRate: achieve,
        note: rng() > 0.7 ? '状态不错，继续保持' : '',
      });
    }
  }
  await LearningDaily.bulkCreate(dailyRows, { validate: true });

  const goals = await LearningGoal.bulkCreate(
    [
      {
        userId: student.id,
        type: '日',
        targetMinutes: 90,
        targetResources: 4,
        startDate: dateOnly(daysAgo(0)),
        endDate: dateOnly(daysAgo(0)),
        currentMinutes: 65,
        currentResources: 3,
        adjustmentRecord: [{ at: new Date(), note: '调整为更可持续的目标' }],
      },
      {
        userId: student.id,
        type: '周',
        targetMinutes: 540,
        targetResources: 22,
        startDate: dateOnly(daysAgo(6)),
        endDate: dateOnly(daysAgo(0)),
        currentMinutes: 410,
        currentResources: 17,
        adjustmentRecord: [],
      },
      {
        userId: student.id,
        type: '月',
        targetMinutes: 2160,
        targetResources: 90,
        startDate: dateOnly(daysAgo(29)),
        endDate: dateOnly(daysAgo(0)),
        currentMinutes: 1650,
        currentResources: 74,
        adjustmentRecord: [{ at: new Date(), note: '月中增加了英语训练比重' }],
      },
    ],
    { validate: true }
  );

  const wrongRows = [];
  for (let i = 1; i <= 18; i += 1) {
    const subject = pick(rng, ['数学', '英语', '物理']);
    const corrected = rng() > 0.35;
    const mastery = corrected ? (rng() > 0.6 ? '高' : '中') : '低';
    wrongRows.push({
      userId: student.id,
      code: `WR-${String(i).padStart(4, '0')}`,
      knowledgePoint: `${subject} · ${pick(rng, tagPool)}`,
      wrongCount: clamp(Math.floor(rng() * 4) + 1, 1, 6),
      corrected,
      mastery,
      reviewedAt: corrected ? daysAgo(Math.floor(rng() * 12)) : null,
    });
  }
  await WrongQuestion.bulkCreate(wrongRows, { validate: true });

  const recentResources = resources.filter((r) => r.status === '上架');
  const batches = [];
  for (let i = 13; i >= 0; i -= 1) {
    batches.push(
      await RecommendationBatch.create({
        userId: student.id,
        batchCode: `BATCH-${dateOnly(daysAgo(i))}`,
        resourceCount: 0,
        clickCount: 0,
        completeCount: 0,
        completionRate: 0,
        reviewNote: rng() > 0.7 ? '下次可提高题库占比' : '',
        createdAt: daysAgo(i),
        updatedAt: daysAgo(i),
      })
    );
  }

  const userResourceRows = [];
  const behaviorRows = [];
  for (const b of batches) {
    const n = 6 + Math.floor(rng() * 6);
    const picks = sample(rng, recentResources, n);
    let clicks = 0;
    let completes = 0;
    for (const r of picks) {
      const matchScore = clamp(rng() * 0.35 + 0.6, 0.4, 0.98);
      const clicked = rng() > 0.35;
      const completed = clicked && rng() > 0.55;

      await Recommendation.create({
        userId: student.id,
        batchId: b.id,
        resourceId: r.id,
        adaptedTags: sample(rng, tagPool, 2),
        matchScore,
        clickedAt: clicked ? new Date(b.createdAt.getTime() + Math.floor(rng() * 3) * 3600 * 1000) : null,
        createdAt: b.createdAt,
        updatedAt: b.createdAt,
      });

      if (clicked) clicks += 1;
      if (completed) completes += 1;

      if (clicked) {
        behaviorRows.push({
          userId: student.id,
          type: '点击',
          resourceId: r.id,
          occurredAt: new Date(b.createdAt.getTime() + Math.floor(rng() * 6) * 3600 * 1000),
          dwellSeconds: clamp(Math.floor(rng() * 120) + 15, 10, 300),
        });
      }
      if (completed) {
        behaviorRows.push({
          userId: student.id,
          type: '学习',
          resourceId: r.id,
          occurredAt: new Date(b.createdAt.getTime() + Math.floor(rng() * 10) * 3600 * 1000),
          dwellSeconds: clamp(Math.floor(rng() * 900) + 120, 60, 2400),
        });
      }

      if (completed || rng() > 0.7) {
        userResourceRows.push({
          userId: student.id,
          resourceId: r.id,
          status: completed ? '已完成' : '收藏',
          progressPercent: completed ? 100 : clamp(Math.floor(rng() * 60), 0, 90),
          favoritedAt: rng() > 0.5 ? b.createdAt : null,
          startedAt: clicked ? b.createdAt : null,
          completedAt: completed ? new Date(b.createdAt.getTime() + 2 * 3600 * 1000) : null,
          createdAt: b.createdAt,
          updatedAt: b.createdAt,
        });
      }
    }
    const completionRate = picks.length ? completes / picks.length : 0;
    await b.update({
      resourceCount: picks.length,
      clickCount: clicks,
      completeCount: completes,
      completionRate,
    });
  }

  await UserResource.bulkCreate(userResourceRows, { validate: true, ignoreDuplicates: true });
  await UserBehavior.bulkCreate(behaviorRows, { validate: true });

  const allUserIds = [admin.id, student.id, ...extraUsers.map((u) => u.id)];
  for (const uid of allUserIds) {
    const defaultFolder = await FavoriteFolder.create({
      userId: uid,
      name: '默认收藏夹',
      isDefault: true,
      parentId: null,
      sortOrder: 0,
    });
    if (uid === student.id) {
      const midFolder = await FavoriteFolder.create({
        userId: uid,
        name: '期末复习',
        isDefault: false,
        parentId: null,
        sortOrder: 1,
      });
      await FavoriteFolder.create({
        userId: uid,
        name: '日常积累',
        isDefault: false,
        parentId: null,
        sortOrder: 2,
      });
      const studentUrs = await UserResource.findAll({ where: { userId: uid, status: { [require('sequelize').Op.in]: ['收藏', '待学'] } }, limit: 20 });
      const half = Math.ceil(studentUrs.length / 2);
      for (let i = 0; i < studentUrs.length; i += 1) {
        await studentUrs[i].update({ folderId: i < half ? midFolder.id : defaultFolder.id });
      }
    } else {
      await UserResource.update({ folderId: defaultFolder.id }, { where: { userId: uid } });
    }
  }

  await SystemLog.create({
    actorUserId: admin.id,
    type: '配置修改',
    content: `推荐规则已初始化（${goals.length}个学习目标，${batches.length}批推荐）`,
    ip: '127.0.0.1',
    status: '成功',
  });

  logger.info('seed_done', {
    users: 2 + extraUsers.length,
    resources: resources.length,
    tags: resourceTagRows.length,
    batches: batches.length,
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('seed_failed', { message: err?.message, stack: err?.stack });
    process.exit(1);
  });
