const { Op } = require('sequelize');

const { Resource, ResourceTag, UserResource, FavoriteFolder } = require('../../models');

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物'];
const RESOURCE_TYPES = ['课程', '课件', '题库', '视频'];
const DEFAULT_CLOUD_TAGS = ['代数', '几何', '阅读理解', '写作', '语法', '力学', '电学', '函数'];

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

async function ensureDefaultFolder(userId) {
  const [folder] = await FavoriteFolder.findOrCreate({
    where: { userId, isDefault: true },
    defaults: {
      userId,
      name: '默认收藏夹',
      isDefault: true,
      parentId: null,
      sortOrder: 0,
    },
  });
  return folder;
}

async function getResourcesData(userId) {
  const resources = await Resource.findAll({ where: { deleted: false }, order: [['updatedAt', 'DESC']], limit: 60 });
  const tags = await ResourceTag.findAll();

  const categoryMap = SUBJECTS.reduce((acc, subject) => {
    acc[subject] = { subject, 课程: 0, 课件: 0, 题库: 0, 视频: 0 };
    return acc;
  }, {});
  for (const r of resources) {
    categoryMap[r.subject] = categoryMap[r.subject] || { subject: r.subject, 课程: 0, 课件: 0, 题库: 0, 视频: 0 };
    if (RESOURCE_TYPES.includes(r.type)) categoryMap[r.subject][r.type] += 1;
  }
  const resourceCategoryStacked = Object.values(categoryMap);

  const searchTable = resources.slice(0, 20).map((r) => ({
    id: r.id,
    resourceId: r.code,
    name: r.name,
    subject: r.subject,
    type: r.type,
    difficulty: r.difficulty,
    heat: r.heat,
    rating: Number(r.rating),
    estimatedHours: Number(r.estimatedHours),
    updatedAt: r.updatedAt,
  }));

  const resourceTagMap = tags.reduce((acc, t) => {
    acc[t.resourceId] = acc[t.resourceId] || [];
    acc[t.resourceId].push(t.name);
    return acc;
  }, {});

  searchTable.forEach((r) => {
    r.tags = resourceTagMap[r.id] || [];
  });

  const tagCount = tags.reduce((acc, t) => {
    acc[t.name] = acc[t.name] || { name: t.name, count: 0, weightSum: 0 };
    acc[t.name].count += 1;
    acc[t.name].weightSum += safeNumber(t.weight);
    return acc;
  }, {});

  let tagWordCloud = Object.values(tagCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)
    .map((t) => ({ name: t.name, value: t.count }));
  if (tagWordCloud.length === 0) {
    tagWordCloud = DEFAULT_CLOUD_TAGS.map((name, idx) => ({ name, value: DEFAULT_CLOUD_TAGS.length - idx }));
  }

  let tagPie = Object.values(tagCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((t) => ({ name: t.name, value: t.count }));
  if (tagPie.length === 0) {
    tagPie = tagWordCloud.slice(0, 6).map((t) => ({ name: t.name, value: safeNumber(t.value) }));
  }

  let tagRelationTable = Object.values(
    tags.reduce((acc, t) => {
      const k = `${t.name}__${t.stage}`;
      acc[k] = acc[k] || { name: t.name, stage: t.stage, resourceCount: 0, weightSum: 0 };
      acc[k].resourceCount += 1;
      acc[k].weightSum += safeNumber(t.weight);
      return acc;
    }, {})
  )
    .sort((a, b) => b.resourceCount - a.resourceCount)
    .slice(0, 20)
    .map((x) => ({
      tagName: x.name,
      resourceCount: x.resourceCount,
      stage: x.stage,
      recommendWeight: x.resourceCount ? x.weightSum / x.resourceCount : 0,
    }));
  if (tagRelationTable.length === 0) {
    tagRelationTable = tagPie.map((x) => ({
      tagName: x.name,
      resourceCount: safeNumber(x.value),
      stage: '初中',
      recommendWeight: 0,
    }));
  }

  const defaultFolder = await ensureDefaultFolder(userId);

  const nullFolders = await UserResource.findAll({
    where: { userId, status: { [Op.in]: ['收藏', '待学'] }, folderId: null },
  });
  if (nullFolders.length > 0) {
    await UserResource.update({ folderId: defaultFolder.id }, { where: { id: { [Op.in]: nullFolders.map((x) => x.id) } } });
  }

  const favoriteFolders = await FavoriteFolder.findAll({
    where: { userId },
    order: [['sortOrder', 'ASC'], ['id', 'ASC']],
  });

  const userResources = await UserResource.findAll({
    where: { userId, status: { [Op.in]: ['收藏', '待学'] } },
    include: [{ model: Resource, as: 'resource', where: { deleted: false }, required: false }],
    order: [['updatedAt', 'DESC']],
  });

  const favoriteTable = userResources
    .filter((ur) => ur.resource)
    .map((ur) => ({
      id: ur.id,
      name: ur.resource?.name,
      favoritedAt: ur.favoritedAt,
      progressPercent: ur.progressPercent,
      status: ur.status,
      folderId: ur.folderId || defaultFolder.id,
    }));

  const favoriteGroups = favoriteFolders.map((folder) => {
    const items = favoriteTable.filter((x) => Number(x.folderId) === Number(folder.id));
    return {
      id: folder.id,
      name: folder.name,
      isDefault: folder.isDefault,
      parentId: folder.parentId,
      sortOrder: folder.sortOrder,
      resourceCount: items.length,
      items,
    };
  });

  const favoriteCompletionTrend7d = [];
  for (const date of listRecentDates(7)) {
    const dayRows = await UserResource.findAll({
      where: {
        userId,
        updatedAt: { [Op.gte]: new Date(`${date}T00:00:00.000Z`), [Op.lte]: new Date(`${date}T23:59:59.999Z`) },
      },
    });
    const base = dayRows.length || 1;
    const completed = dayRows.filter((x) => x.status === '已完成').length;
    favoriteCompletionTrend7d.push({ date, completionRate: completed / base });
  }

  return {
    resourceCategoryStacked,
    searchTable,
    tagWordCloud,
    tagPie,
    tagRelationTable,
    favoriteCompletionTrend7d,
    favoriteTable,
    favoriteFolders: favoriteFolders.map((f) => ({
      id: f.id,
      name: f.name,
      isDefault: f.isDefault,
      parentId: f.parentId,
      sortOrder: f.sortOrder,
    })),
    favoriteGroups,
  };
}

async function getResourcesByCodes(codes) {
  if (!codes || codes.length === 0) return [];
  if (codes.length > 4) codes = codes.slice(0, 4);

  const resources = await Resource.findAll({
    where: { code: codes, deleted: false, status: '上架' },
    order: [['updatedAt', 'DESC']],
  });

  const resourceIds = resources.map((r) => r.id);
  const tags = await ResourceTag.findAll({
    where: { resourceId: resourceIds },
  });

  const resourceTagMap = tags.reduce((acc, t) => {
    acc[t.resourceId] = acc[t.resourceId] || [];
    acc[t.resourceId].push(t.name);
    return acc;
  }, {});

  const codeOrderMap = codes.reduce((acc, code, idx) => {
    acc[code] = idx;
    return acc;
  }, {});

  const result = resources
    .map((r) => ({
      id: r.id,
      resourceId: r.code,
      name: r.name,
      subject: r.subject,
      type: r.type,
      difficulty: r.difficulty,
      heat: r.heat,
      rating: Number(r.rating),
      estimatedHours: Number(r.estimatedHours),
      tags: resourceTagMap[r.id] || [],
      updatedAt: r.updatedAt,
    }))
    .sort((a, b) => codeOrderMap[a.resourceId] - codeOrderMap[b.resourceId]);

  return result;
}

module.exports = { getResourcesData, getResourcesByCodes };
