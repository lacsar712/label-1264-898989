const {
  Recommendation,
  RecommendationRule,
  SystemParam,
  User,
  UserResource,
  UserTag,
  Resource,
  ResourceCategory,
  SystemLog,
  UserBehavior,
  FavoriteFolder,
  Assignment,
  AssignmentSubmission,
} =
  require('../models');

const { getResourcesByCodes } = require('../services/pages/resourcesService');

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

async function listFolders(req, res) {
  const userId = req.user.id;
  await ensureDefaultFolder(userId);
  const folders = await FavoriteFolder.findAll({
    where: { userId },
    order: [['sortOrder', 'ASC'], ['id', 'ASC']],
  });
  const withCounts = await Promise.all(
    folders.map(async (f) => {
      const count = await UserResource.count({ where: { userId, folderId: f.id, status: { [require('sequelize').Op.in]: ['收藏', '待学'] } } });
      return { ...f.toJSON(), resourceCount: count };
    })
  );
  return res.json({ ok: true, data: withCounts });
}

async function createFolder(req, res) {
  const userId = req.user.id;
  const { name, parentId } = req.body;
  if (parentId !== undefined && parentId !== null) {
    const parent = await FavoriteFolder.findOne({ where: { id: parentId, userId } });
    if (!parent) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '父收藏夹不存在' } });
  }
  const maxOrder = await FavoriteFolder.max('sortOrder', { where: { userId, parentId: parentId || null } });
  const folder = await FavoriteFolder.create({
    userId,
    name: String(name).trim().slice(0, 64),
    isDefault: false,
    parentId: parentId || null,
    sortOrder: Number.isFinite(maxOrder) ? maxOrder + 1 : 0,
  });
  return res.json({ ok: true, data: folder });
}

async function renameFolder(req, res) {
  const userId = req.user.id;
  const { folderId } = req.params;
  const { name } = req.body;
  const folder = await FavoriteFolder.findOne({ where: { id: folderId, userId } });
  if (!folder) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '收藏夹不存在' } });
  if (folder.isDefault) return res.status(400).json({ ok: false, error: { code: 'INVALID_OPERATION', message: '默认收藏夹不可重命名' } });
  await folder.update({ name: String(name).trim().slice(0, 64) });
  return res.json({ ok: true });
}

async function sortFolders(req, res) {
  const userId = req.user.id;
  const { orders } = req.body;
  if (!Array.isArray(orders)) return res.status(400).json({ ok: false, error: { code: 'INVALID_PARAM', message: 'orders 必须是数组' } });
  for (const item of orders) {
    const folder = await FavoriteFolder.findOne({ where: { id: item.id, userId } });
    if (folder) await folder.update({ sortOrder: Number(item.sortOrder) || 0, parentId: item.parentId !== undefined ? item.parentId || null : folder.parentId });
  }
  return res.json({ ok: true });
}

async function deleteFolder(req, res) {
  const userId = req.user.id;
  const { folderId } = req.params;
  const folder = await FavoriteFolder.findOne({ where: { id: folderId, userId } });
  if (!folder) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '收藏夹不存在' } });
  if (folder.isDefault) return res.status(400).json({ ok: false, error: { code: 'INVALID_OPERATION', message: '默认收藏夹不可删除' } });
  const defaultFolder = await ensureDefaultFolder(userId);
  if (Number(defaultFolder.id) === Number(folderId)) {
    return res.status(400).json({ ok: false, error: { code: 'INVALID_OPERATION', message: '默认收藏夹不可删除' } });
  }
  await UserResource.update({ folderId: defaultFolder.id }, { where: { userId, folderId: folder.id } });
  await FavoriteFolder.update({ parentId: defaultFolder.parentId }, { where: { userId, parentId: folder.id } });
  await folder.destroy();
  return res.json({ ok: true });
}

async function ensureCategoryByCode(categoryId) {
  let category = await ResourceCategory.findOne({ where: { categoryCode: categoryId } });
  if (category) return category;
  if (!String(categoryId || '').startsWith('CAT-')) return null;
  const raw = String(categoryId).slice(4);
  const sep = raw.lastIndexOf('-');
  if (sep <= 0) return null;
  const subject = raw.slice(0, sep);
  const type = raw.slice(sep + 1);
  if (!['课程', '课件', '题库', '视频'].includes(type)) return null;
  const [created] = await ResourceCategory.findOrCreate({
    where: { categoryCode: categoryId },
    defaults: {
      categoryCode: categoryId,
      categoryName: subject,
      parentCategory: type,
      subject,
      type,
      sortOrder: 999,
      active: true,
    },
  });
  category = created;
  return category;
}

async function favorite(req, res) {
  const userId = req.user.id;
  const { recommendationId } = req.params;
  const { folderId } = req.body || {};

  const rec = await Recommendation.findOne({ where: { id: recommendationId, userId } });
  if (!rec) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '推荐不存在' } });

  const defaultFolder = await ensureDefaultFolder(userId);
  let targetFolderId = defaultFolder.id;
  if (folderId !== undefined && folderId !== null) {
    const folder = await FavoriteFolder.findOne({ where: { id: folderId, userId } });
    if (!folder) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '收藏夹不存在' } });
    targetFolderId = folder.id;
  }

  const [ur] = await UserResource.findOrCreate({
    where: { userId, resourceId: rec.resourceId },
    defaults: { status: '收藏', progressPercent: 0, favoritedAt: new Date(), folderId: targetFolderId },
  });

  await ur.update({ status: '收藏', favoritedAt: ur.favoritedAt || new Date(), folderId: targetFolderId });
  await UserBehavior.create({
    userId,
    type: '收藏',
    resourceId: rec.resourceId,
    occurredAt: new Date(),
    dwellSeconds: 5,
  });

  return res.json({ ok: true });
}

async function moveResourceToFolder(req, res) {
  const userId = req.user.id;
  const { userResourceId } = req.params;
  const { folderId } = req.body;
  const ur = await UserResource.findOne({ where: { id: userResourceId, userId } });
  if (!ur) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '记录不存在' } });
  if (folderId !== undefined && folderId !== null) {
    const folder = await FavoriteFolder.findOne({ where: { id: folderId, userId } });
    if (!folder) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '收藏夹不存在' } });
  }
  await ur.update({ folderId: folderId || null });
  return res.json({ ok: true });
}

async function learn(req, res) {
  const userId = req.user.id;
  const { recommendationId } = req.params;

  const rec = await Recommendation.findOne({ where: { id: recommendationId, userId } });
  if (!rec) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '推荐不存在' } });

  const [ur] = await UserResource.findOrCreate({
    where: { userId, resourceId: rec.resourceId },
    defaults: { status: '学习中', progressPercent: 10, startedAt: new Date() },
  });

  await ur.update({ status: '学习中', startedAt: ur.startedAt || new Date(), progressPercent: Math.max(ur.progressPercent, 10) });
  await rec.update({ clickedAt: rec.clickedAt || new Date() });

  await UserBehavior.create({
    userId,
    type: '学习',
    resourceId: rec.resourceId,
    occurredAt: new Date(),
    dwellSeconds: 180,
  });

  return res.json({ ok: true });
}

async function unfavorite(req, res) {
  const userId = req.user.id;
  const { userResourceId } = req.params;
  const ur = await UserResource.findOne({ where: { id: userResourceId, userId } });
  if (!ur) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '记录不存在' } });
  await ur.destroy();
  return res.json({ ok: true });
}

async function moveToQueue(req, res) {
  const userId = req.user.id;
  const { userResourceId } = req.params;
  const ur = await UserResource.findOne({ where: { id: userResourceId, userId } });
  if (!ur) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '记录不存在' } });
  await ur.update({ status: '待学' });
  return res.json({ ok: true });
}

async function adminUpdateUserStatus(req, res) {
  const { userId } = req.params;
  const { active } = req.body;
  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '用户不存在' } });
  await user.update({ active: Boolean(active) });

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '用户操作',
    content: `设置用户#${user.id} active=${Boolean(active)}`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true });
}

async function adminTakeDownResource(req, res) {
  const { resourceId } = req.params;
  const resource = await Resource.findOne({ where: { code: resourceId } });
  if (!resource) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '资源不存在' } });
  await resource.update({ status: '下架' });

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '资源操作',
    content: `下架资源 ${resource.code}`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true });
}

async function adminUpdateUserProfile(req, res) {
  const { userId } = req.params;
  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '用户不存在' } });

  const patch = {};
  if (typeof req.body.name === 'string') patch.name = req.body.name;
  if (typeof req.body.stage === 'string') patch.stage = req.body.stage;
  if (typeof req.body.learningStyle === 'string') patch.learningStyle = req.body.learningStyle;
  if (Array.isArray(req.body.subjectPreference)) patch.subjectPreference = req.body.subjectPreference;

  await user.update(patch);
  await SystemLog.create({
    actorUserId: req.user.id,
    type: '用户操作',
    content: `编辑用户#${user.id} 基础信息`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true });
}

async function adminCreateUserTag(req, res) {
  const { userId, name, category, weight } = req.body;
  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '用户不存在' } });

  const tag = await UserTag.create({ userId, name, category, weight });
  await SystemLog.create({
    actorUserId: req.user.id,
    type: '标签操作',
    content: `新增用户标签#${tag.id} (${tag.name})`,
    ip: req.ip || '',
    status: '成功',
  });
  return res.json({ ok: true, data: { id: tag.id } });
}

async function adminUpdateUserTag(req, res) {
  const { tagId } = req.params;
  const tag = await UserTag.findByPk(tagId);
  if (!tag) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '标签不存在' } });

  const patch = {};
  if (typeof req.body.name === 'string') patch.name = req.body.name;
  if (typeof req.body.category === 'string') patch.category = req.body.category;
  if (typeof req.body.weight === 'number') patch.weight = req.body.weight;
  await tag.update(patch);

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '标签操作',
    content: `编辑用户标签#${tag.id} (${tag.name})`,
    ip: req.ip || '',
    status: '成功',
  });
  return res.json({ ok: true });
}

async function adminDeleteUserTag(req, res) {
  const { tagId } = req.params;
  const tag = await UserTag.findByPk(tagId);
  if (!tag) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '标签不存在' } });
  await tag.destroy();

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '标签操作',
    content: `删除用户标签#${tag.id} (${tag.name})`,
    ip: req.ip || '',
    status: '成功',
  });
  return res.json({ ok: true });
}

async function adminUpdateResource(req, res) {
  const { resourceId } = req.params;
  const resource = await Resource.findOne({ where: { code: resourceId } });
  if (!resource) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '资源不存在' } });

  const patch = {};
  for (const k of ['name', 'subject', 'type', 'difficulty', 'status']) {
    if (typeof req.body[k] === 'string') patch[k] = req.body[k];
  }
  if (typeof req.body.heat === 'number') patch.heat = req.body.heat;

  await resource.update(patch);
  await SystemLog.create({
    actorUserId: req.user.id,
    type: '资源操作',
    content: `编辑资源 ${resource.code}`,
    ip: req.ip || '',
    status: '成功',
  });
  return res.json({ ok: true });
}

async function adminReviewResource(req, res) {
  const { resourceId } = req.params;
  const { status } = req.body;
  const resource = await Resource.findOne({ where: { code: resourceId } });
  if (!resource) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '资源不存在' } });
  await resource.update({ status });

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '资源操作',
    content: `审核资源 ${resource.code} => ${status}`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true });
}

async function adminDeleteResource(req, res) {
  const { resourceId } = req.params;
  const resource = await Resource.findOne({ where: { code: resourceId } });
  if (!resource) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '资源不存在' } });
  await resource.update({ deleted: true, status: '下架' });

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '资源操作',
    content: `删除资源 ${resource.code}`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true });
}

async function adminUpdateSystemParam(req, res) {
  const { paramCode } = req.params;
  const { value } = req.body;
  const param = await SystemParam.findOne({ where: { paramCode } });
  if (!param) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '参数不存在' } });
  await param.update({ value: String(value), updatedBy: req.user.username || String(req.user.id) });

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '配置修改',
    content: `更新参数 ${param.paramCode}=${param.value}`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true });
}

async function adminRestoreSystemParam(req, res) {
  const { paramCode } = req.params;
  const param = await SystemParam.findOne({ where: { paramCode } });
  if (!param) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '参数不存在' } });
  await param.update({ value: param.defaultValue, updatedBy: req.user.username || String(req.user.id) });

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '配置修改',
    content: `恢复默认参数 ${param.paramCode}=${param.value}`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true });
}

async function adminUpdateRuleWeights(req, res) {
  const { ruleCode } = req.params;
  const { weightRatio } = req.body;
  const rule = await RecommendationRule.findOne({ where: { ruleCode } });
  if (!rule) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '规则不存在' } });
  await rule.update({ weightRatio });

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '配置修改',
    content: `更新规则权重 ${rule.ruleCode}`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true });
}

async function adminCreateResourceCategory(req, res) {
  const { categoryName, parentCategory, subject, type, sortOrder } = req.body;
  const categoryCode = `CAT-${subject}-${type}`;
  const [category, created] = await ResourceCategory.findOrCreate({
    where: { categoryCode },
    defaults: {
      categoryCode,
      categoryName,
      parentCategory,
      subject,
      type,
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 999,
      active: true,
    },
  });
  if (!created) {
    await category.update({
      categoryName,
      parentCategory,
      subject,
      type,
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : category.sortOrder,
      active: true,
    });
  }

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '资源操作',
    content: `新增分类 ${category.categoryCode}`,
    ip: req.ip || '',
    status: '成功',
  });
  return res.json({ ok: true, data: { categoryId: category.categoryCode } });
}

async function adminUpdateResourceCategory(req, res) {
  const { categoryId } = req.params;
  const category = await ensureCategoryByCode(categoryId);
  if (!category) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '分类不存在' } });
  if (!category.active) await category.update({ active: true });

  const oldSubject = category.subject;
  const oldType = category.type;
  const patch = {};
  for (const k of ['categoryName', 'parentCategory', 'subject', 'type']) {
    if (typeof req.body[k] === 'string' && req.body[k]) patch[k] = req.body[k];
  }
  if (Number.isFinite(Number(req.body.sortOrder))) patch.sortOrder = Number(req.body.sortOrder);

  await category.update(patch);
  if ((patch.subject && patch.subject !== oldSubject) || (patch.type && patch.type !== oldType)) {
    await Resource.update(
      { subject: patch.subject || oldSubject, type: patch.type || oldType },
      { where: { subject: oldSubject, type: oldType, deleted: false } }
    );
  }

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '资源操作',
    content: `编辑分类 ${category.categoryCode}`,
    ip: req.ip || '',
    status: '成功',
  });
  return res.json({ ok: true });
}

async function adminMergeResourceCategory(req, res) {
  const { categoryId } = req.params;
  const { targetCategoryId } = req.body;
  if (categoryId === targetCategoryId) {
    return res.status(400).json({ ok: false, error: { code: 'INVALID_PARAM', message: '目标分类不能与源分类相同' } });
  }

  const source = await ensureCategoryByCode(categoryId);
  const target = await ensureCategoryByCode(targetCategoryId);
  if (!source || !target) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '分类不存在' } });
  }
  if (!target.active) await target.update({ active: true });

  await Resource.update(
    { subject: target.subject, type: target.type },
    { where: { subject: source.subject, type: source.type, deleted: false } }
  );
  await source.update({ active: false });

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '资源操作',
    content: `合并分类 ${source.categoryCode} -> ${target.categoryCode}`,
    ip: req.ip || '',
    status: '成功',
  });
  return res.json({ ok: true });
}

async function adminCreateAssignment(req, res) {
  const { title, description, deadline, resourceIds, targetScope } = req.body;
  if (!title || !deadline) {
    return res.status(400).json({ ok: false, error: { code: 'INVALID_PARAM', message: '标题和截止日期为必填' } });
  }

  const assignment = await Assignment.create({
    title: String(title).trim(),
    description: String(description || '').trim(),
    deadline: new Date(deadline),
    resourceIds: Array.isArray(resourceIds) ? resourceIds : [],
    targetScope: targetScope || {},
    createdBy: req.user.id,
  });

  const scope = targetScope || {};
  let targetUsers = [];

  if (scope.type === 'class' && Array.isArray(scope.values) && scope.values.length > 0) {
    targetUsers = await User.findAll({ where: { role: 'student', active: true, stage: { [require('sequelize').Op.in]: scope.values } } });
  } else if (scope.type === 'tag' && Array.isArray(scope.values) && scope.values.length > 0) {
    const userTags = await UserTag.findAll({ where: { category: { [require('sequelize').Op.in]: scope.values } } });
    const userIds = [...new Set(userTags.map((t) => t.userId))];
    if (userIds.length) {
      targetUsers = await User.findAll({ where: { id: { [require('sequelize').Op.in]: userIds }, role: 'student', active: true } });
    }
  } else {
    targetUsers = await User.findAll({ where: { role: 'student', active: true } });
  }

  if (targetUsers.length) {
    const submissions = targetUsers.map((u) => ({
      assignmentId: assignment.id,
      userId: u.id,
      status: '待完成',
    }));
    await AssignmentSubmission.bulkCreate(submissions);
  }

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '作业操作',
    content: `创建作业#${assignment.id} "${assignment.title}"，派发给${targetUsers.length}名学生`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true, data: { id: assignment.id, assignedCount: targetUsers.length } });
}

async function adminDeleteAssignment(req, res) {
  const { assignmentId } = req.params;
  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '作业不存在' } });
  await AssignmentSubmission.destroy({ where: { assignmentId: assignment.id } });
  await assignment.destroy();

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '作业操作',
    content: `删除作业#${assignment.id} "${assignment.title}"`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true });
}

async function studentStartAssignment(req, res) {
  const userId = req.user.id;
  const { assignmentId } = req.params;
  const sub = await AssignmentSubmission.findOne({ where: { assignmentId, userId } });
  if (!sub) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '作业记录不存在' } });
  if (sub.status === '已提交') return res.status(400).json({ ok: false, error: { code: 'INVALID_OPERATION', message: '作业已提交' } });
  await sub.update({ status: '进行中' });
  return res.json({ ok: true });
}

async function studentSubmitAssignment(req, res) {
  const userId = req.user.id;
  const { assignmentId } = req.params;
  const sub = await AssignmentSubmission.findOne({ where: { assignmentId, userId } });
  if (!sub) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '作业记录不存在' } });
  if (sub.status === '已提交') return res.status(400).json({ ok: false, error: { code: 'INVALID_OPERATION', message: '作业已提交' } });
  await sub.update({ status: '已提交', submittedAt: new Date() });
  return res.json({ ok: true });
}

async function getResourcesDetail(req, res) {
  const codes = req.query.codes ? String(req.query.codes).split(',').filter(Boolean) : [];
  if (codes.length === 0) {
    return res.status(400).json({ ok: false, error: { code: 'INVALID_PARAM', message: '请指定资源编码' } });
  }
  if (codes.length > 4) {
    return res.status(400).json({ ok: false, error: { code: 'INVALID_PARAM', message: '最多对比4个资源' } });
  }
  const data = await getResourcesByCodes(codes);
  return res.json({ ok: true, data });
}

module.exports = {
  favorite,
  learn,
  unfavorite,
  moveToQueue,
  moveResourceToFolder,
  listFolders,
  createFolder,
  renameFolder,
  sortFolders,
  deleteFolder,
  adminUpdateUserStatus,
  adminTakeDownResource,
  adminUpdateUserProfile,
  adminCreateUserTag,
  adminUpdateUserTag,
  adminDeleteUserTag,
  adminUpdateResource,
  adminReviewResource,
  adminDeleteResource,
  adminUpdateSystemParam,
  adminRestoreSystemParam,
  adminUpdateRuleWeights,
  adminCreateResourceCategory,
  adminUpdateResourceCategory,
  adminMergeResourceCategory,
  adminCreateAssignment,
  adminDeleteAssignment,
  studentStartAssignment,
  studentSubmitAssignment,
  getResourcesDetail,
};
