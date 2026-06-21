const { Op } = require('sequelize');

const { Resource, UserResource, WrongQuestion, ResourceCategory } = require('../../models');

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物'];
const RESOURCE_TYPES = ['课程', '课件', '题库', '视频'];
const RESOURCE_STATUSES = ['上架', '审核中', '下架'];

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

async function getAdminResourcesData() {
  const resources = await Resource.findAll({ where: { deleted: false }, order: [['updatedAt', 'DESC']], limit: 80 });
  const allResources = await Resource.findAll({ where: { deleted: false }, attributes: ['subject', 'type'] });
  const categoryConfigs = await ResourceCategory.findAll({ where: { active: true }, order: [['sortOrder', 'ASC'], ['id', 'ASC']] });
  const statusMap = RESOURCE_STATUSES.reduce((acc, status) => {
    acc[status] = { name: status, value: 0 };
    return acc;
  }, {});
  for (const r of resources) {
    statusMap[r.status] = statusMap[r.status] || { name: r.status, value: 0 };
    statusMap[r.status].value += 1;
  }
  const statusDonut = Object.values(statusMap);

  const resourceTable = resources.slice(0, 30).map((r) => ({
    resourceId: r.code,
    name: r.name,
    subject: r.subject,
    type: r.type,
    difficulty: r.difficulty,
    status: r.status,
    uploadedAt: r.uploadedAt,
  }));

  const effectTrend = [];
  for (let i = 29; i >= 0; i -= 1) {
    const date = toDateOnly(daysAgo(i));
    const day = new Date(`${date}T00:00:00.000Z`);
    const next = new Date(`${date}T23:59:59.999Z`);
    const completed = await UserResource.count({ where: { status: '已完成', completedAt: { [Op.gte]: day, [Op.lte]: next } } });
    const base = (await UserResource.count({ where: { updatedAt: { [Op.gte]: day, [Op.lte]: next } } })) || 1;
    effectTrend.push({ date, completionRate: completed / base });
  }

  const effectTable = await Promise.all(
    resources.slice(0, 20).map(async (r) => {
      const ur = await UserResource.findAll({ where: { resourceId: r.id } });
      const learners = ur.length;
      const completed = ur.filter((x) => x.status === '已完成').length;
      const completionRate = learners ? completed / learners : 0;
      const goodRate = Math.min(1, 0.65 + completionRate * 0.3);
      const wrongRel = await WrongQuestion.count({ where: { knowledgePoint: { [Op.like]: `%${r.subject}%` } } });
      return {
        resourceId: r.code,
        name: r.name,
        learners,
        completionRate,
        goodRate,
        wrongRel,
        suggestion: completionRate >= 0.7 ? '保持资源质量，持续迭代' : '补充讲解与练习巩固环节',
      };
    })
  );

  const countMap = allResources.reduce((acc, r) => {
    const key = `${r.subject}__${r.type}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const baseCategoryMap = {};
  let fallbackSort = 1;
  for (const subject of SUBJECTS) {
    for (const type of RESOURCE_TYPES) {
      const categoryCode = `CAT-${subject}-${type}`;
      const key = `${subject}__${type}`;
      if (baseCategoryMap[key]) continue;
      baseCategoryMap[key] = {
        categoryId: categoryCode,
        categoryName: subject,
        parentCategory: type,
        subject,
        type,
        sortOrder: fallbackSort,
      };
      fallbackSort += 1;
    }
  }

  for (const cfg of categoryConfigs) {
    const key = `${cfg.subject}__${cfg.type}`;
    baseCategoryMap[key] = {
      categoryId: cfg.categoryCode,
      categoryName: cfg.categoryName,
      parentCategory: cfg.parentCategory,
      subject: cfg.subject,
      type: cfg.type,
      sortOrder: cfg.sortOrder,
    };
  }

  for (const r of allResources) {
    const key = `${r.subject}__${r.type}`;
    if (baseCategoryMap[key]) continue;
    baseCategoryMap[key] = {
      categoryId: `CAT-${r.subject}-${r.type}`,
      categoryName: r.subject,
      parentCategory: r.type,
      subject: r.subject,
      type: r.type,
      sortOrder: 9999,
    };
  }

  const categoryTable = Object.values(baseCategoryMap)
    .map((x) => ({
      categoryId: x.categoryId,
      categoryName: x.categoryName,
      parentCategory: x.parentCategory,
      resourceCount: countMap[`${x.subject}__${x.type}`] || 0,
      sortOrder: x.sortOrder,
      subject: x.subject,
      type: x.type,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || b.resourceCount - a.resourceCount);

  const subjectNodeMap = {};
  for (const row of categoryTable) {
    const subjectId = `subject-${row.categoryName}`;
    subjectNodeMap[subjectId] = subjectNodeMap[subjectId] || { id: subjectId, label: row.categoryName, children: [] };
    subjectNodeMap[subjectId].children.push({
      id: `category-${row.categoryId}`,
      label: `${row.parentCategory}（${row.resourceCount}）`,
    });
  }
  const categoryTree = [
    {
      id: 'root-categories',
      label: '资源分类',
      children: Object.values(subjectNodeMap),
    },
  ];

  return {
    statusDonut,
    resourceTable,
    effectTrend,
    effectTable,
    categoryTree,
    categoryTable,
  };
}

module.exports = { getAdminResourcesData };
