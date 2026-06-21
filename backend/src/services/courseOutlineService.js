const { Op } = require('sequelize');
const {
  Resource,
  CourseChapter,
  CourseSection,
  CourseKnowledgePoint,
  UserLearningProgress,
  UserResource,
} = require('../models');

async function getOutlineByResourceId(resourceId) {
  const resource = await Resource.findOne({
    where: { id: resourceId, deleted: false },
  });
  if (!resource) return null;

  const chapters = await CourseChapter.findAll({
    where: { resourceId },
    order: [['sortOrder', 'ASC'], ['id', 'ASC']],
  });

  const chapterIds = chapters.map((c) => c.id);
  const sections = chapterIds.length
    ? await CourseSection.findAll({
        where: { chapterId: { [Op.in]: chapterIds } },
        order: [['sortOrder', 'ASC'], ['id', 'ASC']],
      })
    : [];

  const sectionIds = sections.map((s) => s.id);
  const knowledgePoints = sectionIds.length
    ? await CourseKnowledgePoint.findAll({
        where: { sectionId: { [Op.in]: sectionIds } },
        order: [['sortOrder', 'ASC'], ['id', 'ASC']],
      })
    : [];

  return {
    resource: {
      id: resource.id,
      code: resource.code,
      name: resource.name,
      subject: resource.subject,
      type: resource.type,
      difficulty: resource.difficulty,
      estimatedHours: Number(resource.estimatedHours),
    },
    chapters: chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      description: ch.description,
      sortOrder: ch.sortOrder,
      sections: sections
        .filter((s) => Number(s.chapterId) === Number(ch.id))
        .map((se) => ({
          id: se.id,
          title: se.title,
          description: se.description,
          sortOrder: se.sortOrder,
          knowledgePoints: knowledgePoints
            .filter((k) => Number(k.sectionId) === Number(se.id))
            .map((kp) => ({
              id: kp.id,
              title: kp.title,
              description: kp.description,
              sortOrder: kp.sortOrder,
            })),
        })),
    })),
  };
}

async function getOutlineWithProgress(resourceId, userId) {
  const outline = await getOutlineByResourceId(resourceId);
  if (!outline) return null;

  const allKpIds = [];
  outline.chapters.forEach((ch) =>
    ch.sections.forEach((se) =>
      se.knowledgePoints.forEach((kp) => allKpIds.push(kp.id))
    )
  );

  const progresses = allKpIds.length
    ? await UserLearningProgress.findAll({
        where: { userId, knowledgePointId: { [Op.in]: allKpIds } },
      })
    : [];

  const progressMap = progresses.reduce((acc, p) => {
    acc[p.knowledgePointId] = p.learned;
    return acc;
  }, {});

  const totalKps = allKpIds.length;
  let learnedKps = 0;

  outline.chapters.forEach((ch) => {
    let chapterTotal = 0;
    let chapterLearned = 0;
    ch.sections.forEach((se) => {
      let sectionTotal = se.knowledgePoints.length;
      let sectionLearned = 0;
      se.knowledgePoints.forEach((kp) => {
        chapterTotal += 1;
        kp.learned = !!progressMap[kp.id];
        if (kp.learned) {
          sectionLearned += 1;
          chapterLearned += 1;
          learnedKps += 1;
        }
      });
      se.progressPercent = sectionTotal ? Math.round((sectionLearned / sectionTotal) * 100) : 0;
    });
    ch.progressPercent = chapterTotal ? Math.round((chapterLearned / chapterTotal) * 100) : 0;
  });

  outline.totalKps = totalKps;
  outline.learnedKps = learnedKps;
  outline.overallProgress = totalKps ? Math.round((learnedKps / totalKps) * 100) : 0;

  return outline;
}

async function createChapter({ resourceId, title, description, sortOrder }) {
  const resource = await Resource.findOne({ where: { id: resourceId, deleted: false } });
  if (!resource) throw new Error('RESOURCE_NOT_FOUND');

  const maxOrder = await CourseChapter.max('sortOrder', { where: { resourceId } });
  const chapter = await CourseChapter.create({
    resourceId,
    title: String(title).trim().slice(0, 200),
    description: description ? String(description).trim() : null,
    sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : (Number.isFinite(maxOrder) ? maxOrder + 1 : 0),
  });
  return chapter;
}

async function updateChapter(chapterId, { title, description, sortOrder }) {
  const chapter = await CourseChapter.findByPk(chapterId);
  if (!chapter) throw new Error('CHAPTER_NOT_FOUND');
  const patch = {};
  if (typeof title === 'string') patch.title = String(title).trim().slice(0, 200);
  if (description !== undefined) patch.description = description ? String(description).trim() : null;
  if (Number.isFinite(Number(sortOrder))) patch.sortOrder = Number(sortOrder);
  await chapter.update(patch);
  return chapter;
}

async function deleteChapter(chapterId) {
  const chapter = await CourseChapter.findByPk(chapterId);
  if (!chapter) throw new Error('CHAPTER_NOT_FOUND');

  const sections = await CourseSection.findAll({ where: { chapterId } });
  const sectionIds = sections.map((s) => s.id);

  if (sectionIds.length) {
    const kps = await CourseKnowledgePoint.findAll({ where: { sectionId: { [Op.in]: sectionIds } } });
    const kpIds = kps.map((k) => k.id);
    if (kpIds.length) {
      await UserLearningProgress.destroy({ where: { knowledgePointId: { [Op.in]: kpIds } } });
      await CourseKnowledgePoint.destroy({ where: { id: { [Op.in]: kpIds } } });
    }
    await CourseSection.destroy({ where: { id: { [Op.in]: sectionIds } } });
  }

  await chapter.destroy();
  return true;
}

async function createSection({ chapterId, title, description, sortOrder }) {
  const chapter = await CourseChapter.findByPk(chapterId);
  if (!chapter) throw new Error('CHAPTER_NOT_FOUND');

  const maxOrder = await CourseSection.max('sortOrder', { where: { chapterId } });
  const section = await CourseSection.create({
    chapterId,
    title: String(title).trim().slice(0, 200),
    description: description ? String(description).trim() : null,
    sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : (Number.isFinite(maxOrder) ? maxOrder + 1 : 0),
  });
  return section;
}

async function updateSection(sectionId, { title, description, sortOrder }) {
  const section = await CourseSection.findByPk(sectionId);
  if (!section) throw new Error('SECTION_NOT_FOUND');
  const patch = {};
  if (typeof title === 'string') patch.title = String(title).trim().slice(0, 200);
  if (description !== undefined) patch.description = description ? String(description).trim() : null;
  if (Number.isFinite(Number(sortOrder))) patch.sortOrder = Number(sortOrder);
  await section.update(patch);
  return section;
}

async function deleteSection(sectionId) {
  const section = await CourseSection.findByPk(sectionId);
  if (!section) throw new Error('SECTION_NOT_FOUND');

  const kps = await CourseKnowledgePoint.findAll({ where: { sectionId } });
  const kpIds = kps.map((k) => k.id);
  if (kpIds.length) {
    await UserLearningProgress.destroy({ where: { knowledgePointId: { [Op.in]: kpIds } } });
    await CourseKnowledgePoint.destroy({ where: { id: { [Op.in]: kpIds } } });
  }

  await section.destroy();
  return true;
}

async function createKnowledgePoint({ sectionId, title, description, sortOrder }) {
  const section = await CourseSection.findByPk(sectionId);
  if (!section) throw new Error('SECTION_NOT_FOUND');

  const maxOrder = await CourseKnowledgePoint.max('sortOrder', { where: { sectionId } });
  const kp = await CourseKnowledgePoint.create({
    sectionId,
    title: String(title).trim().slice(0, 200),
    description: description ? String(description).trim() : null,
    sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : (Number.isFinite(maxOrder) ? maxOrder + 1 : 0),
  });
  return kp;
}

async function updateKnowledgePoint(kpId, { title, description, sortOrder }) {
  const kp = await CourseKnowledgePoint.findByPk(kpId);
  if (!kp) throw new Error('KP_NOT_FOUND');
  const patch = {};
  if (typeof title === 'string') patch.title = String(title).trim().slice(0, 200);
  if (description !== undefined) patch.description = description ? String(description).trim() : null;
  if (Number.isFinite(Number(sortOrder))) patch.sortOrder = Number(sortOrder);
  await kp.update(patch);
  return kp;
}

async function deleteKnowledgePoint(kpId) {
  const kp = await CourseKnowledgePoint.findByPk(kpId);
  if (!kp) throw new Error('KP_NOT_FOUND');
  await UserLearningProgress.destroy({ where: { knowledgePointId: kpId } });
  await kp.destroy();
  return true;
}

async function toggleKnowledgePointLearned(userId, knowledgePointId, learned) {
  const kp = await CourseKnowledgePoint.findByPk(knowledgePointId);
  if (!kp) throw new Error('KP_NOT_FOUND');

  const [progress] = await UserLearningProgress.findOrCreate({
    where: { userId, knowledgePointId },
    defaults: { learned: !!learned, learnedAt: learned ? new Date() : null },
  });

  if (progress.learned !== !!learned) {
    await progress.update({
      learned: !!learned,
      learnedAt: learned ? new Date() : null,
    });
  }

  const section = await CourseSection.findByPk(kp.sectionId);
  const chapter = section ? await CourseChapter.findByPk(section.chapterId) : null;
  if (chapter) {
    const resource = await Resource.findByPk(chapter.resourceId);
    if (resource) {
      const [ur] = await UserResource.findOrCreate({
        where: { userId, resourceId: resource.id },
        defaults: { status: '学习中', progressPercent: 1, startedAt: new Date() },
      });
      if (learned && ur.status !== '已完成') {
        await ur.update({ status: '学习中', startedAt: ur.startedAt || new Date() });
      }
    }
  }

  return { learned: !!learned };
}

async function syncUserResourceProgress(userId, resourceId) {
  const outline = await getOutlineWithProgress(resourceId, userId);
  if (!outline) return null;

  const [ur] = await UserResource.findOrCreate({
    where: { userId, resourceId },
    defaults: {
      status: outline.overallProgress >= 100 ? '已完成' : outline.overallProgress > 0 ? '学习中' : '待学',
      progressPercent: outline.overallProgress,
      startedAt: outline.overallProgress > 0 ? new Date() : null,
      completedAt: outline.overallProgress >= 100 ? new Date() : null,
    },
  });

  const newStatus = outline.overallProgress >= 100 ? '已完成' : outline.overallProgress > 0 ? '学习中' : ur.status || '待学';
  await ur.update({
    progressPercent: outline.overallProgress,
    status: newStatus,
    startedAt: outline.overallProgress > 0 ? ur.startedAt || new Date() : ur.startedAt,
    completedAt: outline.overallProgress >= 100 ? ur.completedAt || new Date() : null,
  });

  return { progressPercent: outline.overallProgress, status: newStatus };
}

module.exports = {
  getOutlineByResourceId,
  getOutlineWithProgress,
  createChapter,
  updateChapter,
  deleteChapter,
  createSection,
  updateSection,
  deleteSection,
  createKnowledgePoint,
  updateKnowledgePoint,
  deleteKnowledgePoint,
  toggleKnowledgePointLearned,
  syncUserResourceProgress,
};
