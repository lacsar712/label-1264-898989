const { Op } = require('sequelize');

const { User, UserTag, Resource, Assignment, AssignmentSubmission } = require('../../models');

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function getStudentAssignmentData(userId) {
  const now = new Date();

  const overdueSubs = await AssignmentSubmission.findAll({
    where: { userId, status: '待完成' },
    include: [{ model: Assignment, as: 'assignment' }],
  });
  for (const sub of overdueSubs) {
    if (sub.assignment && new Date(sub.assignment.deadline) < now) {
      await sub.update({ status: '已逾期' });
    }
  }

  const inProgressOverdue = await AssignmentSubmission.findAll({
    where: { userId, status: '进行中' },
    include: [{ model: Assignment, as: 'assignment' }],
  });
  for (const sub of inProgressOverdue) {
    if (sub.assignment && new Date(sub.assignment.deadline) < now) {
      await sub.update({ status: '已逾期' });
    }
  }

  const submissions = await AssignmentSubmission.findAll({
    where: { userId },
    include: [{ model: Assignment, as: 'assignment' }],
    order: [['createdAt', 'DESC']],
  });

  const items = submissions.map((sub) => {
    const a = sub.assignment;
    return {
      submissionId: sub.id,
      assignmentId: sub.assignmentId,
      title: a?.title || '',
      description: a?.description || '',
      deadline: a?.deadline,
      resourceIds: a?.resourceIds || [],
      status: sub.status,
      submittedAt: sub.submittedAt,
      createdAt: sub.createdAt,
      isOverdue: sub.status === '已逾期' || (a && new Date(a.deadline) < now),
    };
  });

  const resourceIds = [...new Set(items.flatMap((i) => i.resourceIds))];
  const resources = resourceIds.length
    ? await Resource.findAll({ where: { id: { [Op.in]: resourceIds } } })
    : [];
  const resourceMap = {};
  for (const r of resources) {
    resourceMap[r.id] = { id: r.id, code: r.code, name: r.name, subject: r.subject, type: r.type };
  }

  return { items, resourceMap };
}

async function getAdminAssignmentData() {
  const assignments = await Assignment.findAll({
    include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']],
  });

  const result = [];

  for (const a of assignments) {
    const subs = await AssignmentSubmission.findAll({ where: { assignmentId: a.id } });
    const total = subs.length;
    const submitted = subs.filter((s) => s.status === '已提交').length;
    const inProgress = subs.filter((s) => s.status === '进行中').length;
    const pending = subs.filter((s) => s.status === '待完成').length;
    const overdue = subs.filter((s) => s.status === '已逾期').length;
    const completionRate = total > 0 ? submitted / total : 0;

    const resourceIds = a.resourceIds || [];
    const resources = resourceIds.length
      ? await Resource.findAll({ where: { id: { [Op.in]: resourceIds } } })
      : [];
    const resourceList = resources.map((r) => ({ id: r.id, code: r.code, name: r.name }));

    result.push({
      id: a.id,
      title: a.title,
      description: a.description,
      deadline: a.deadline,
      resourceIds: a.resourceIds,
      resourceList,
      targetScope: a.targetScope,
      createdBy: a.createdBy,
      creatorName: a.creator?.name || '',
      createdAt: a.createdAt,
      stats: { total, submitted, inProgress, pending, overdue, completionRate: safeNumber(completionRate) },
    });
  }

  const completionDonut = result.map((a) => ({
    name: a.title,
    value: a.stats.completionRate,
    submitted: a.stats.submitted,
    total: a.stats.total,
  }));

  const stages = await User.findAll({
    attributes: ['stage'],
    group: ['stage'],
    where: { role: 'student', active: true },
  });
  const classes = stages.map((u) => u.stage).filter(Boolean);

  const tags = await UserTag.findAll({
    attributes: ['category'],
    group: ['category'],
  });
  const tagCategories = tags.map((t) => t.category).filter(Boolean);

  return { assignments: result, completionDonut, classes, tagCategories };
}

module.exports = { getStudentAssignmentData, getAdminAssignmentData };
