const { Op } = require('sequelize');

const { Flashcard, FlashcardReview, WrongQuestion, ResourceTag, Resource } = require('../models');

function startOfDay(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function endOfDay(d) {
  const dt = new Date(d);
  dt.setHours(23, 59, 59, 999);
  return dt;
}

function addDays(d, n) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt;
}

async function listFlashcards(req, res) {
  const userId = req.user.id;
  const { status, page = 1, pageSize = 20 } = req.query;

  const where = { userId };
  const now = new Date();

  if (status === 'due') {
    where.nextReviewAt = { [Op.lte]: now };
  } else if (status === 'future') {
    where.nextReviewAt = { [Op.gt]: now };
  }

  const offset = (Number(page) - 1) * Number(pageSize);
  const limit = Number(pageSize);

  const { count, rows } = await Flashcard.findAndCountAll({
    where,
    order: [['nextReviewAt', 'ASC'], ['id', 'ASC']],
    offset,
    limit,
  });

  return res.json({
    ok: true,
    data: { list: rows, total: count, page: Number(page), pageSize: limit },
  });
}

async function getTodayDueCount(req, res) {
  const userId = req.user.id;
  const now = new Date();

  const count = await Flashcard.count({
    where: {
      userId,
      nextReviewAt: { [Op.lte]: now },
    },
  });

  return res.json({ ok: true, data: { count } });
}

async function getDueCards(req, res) {
  const userId = req.user.id;
  const now = new Date();

  const cards = await Flashcard.findAll({
    where: {
      userId,
      nextReviewAt: { [Op.lte]: now },
    },
    order: [['nextReviewAt', 'ASC'], ['id', 'ASC']],
    limit: 50,
  });

  return res.json({ ok: true, data: cards });
}

async function createFromWrongQuestion(req, res) {
  const userId = req.user.id;
  const { wrongQuestionId } = req.body;

  const wq = await WrongQuestion.findOne({ where: { id: wrongQuestionId, userId } });
  if (!wq) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '错题不存在' } });
  }

  const existing = await Flashcard.findOne({
    where: { userId, sourceType: 'wrong_question', sourceId: wrongQuestionId },
  });
  if (existing) {
    return res.status(400).json({ ok: false, error: { code: 'DUPLICATE', message: '该错题已在闪卡队列中' } });
  }

  const front = `【错题】${wq.knowledgePoint}（题号 ${wq.code}）`;
  const back = `知识点：${wq.knowledgePoint}\n掌握程度：${wq.mastery}\n做错次数：${wq.wrongCount}\n订正状态：${wq.corrected ? '已订正' : '未订正'}`;

  const card = await Flashcard.create({
    userId,
    sourceType: 'wrong_question',
    sourceId: wrongQuestionId,
    front,
    back,
    intervalDays: 1,
    easeFactor: 1.5,
    nextReviewAt: new Date(),
    reviewCount: 0,
    correctCount: 0,
  });

  return res.json({ ok: true, data: card });
}

async function createFromResourceTag(req, res) {
  const userId = req.user.id;
  const { tagId } = req.body;

  const tag = await ResourceTag.findByPk(tagId, {
    include: [{ model: Resource, as: 'resource' }],
  });
  if (!tag) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '标签不存在' } });
  }

  const existing = await Flashcard.findOne({
    where: { userId, sourceType: 'resource_tag', sourceId: tagId },
  });
  if (existing) {
    return res.status(400).json({ ok: false, error: { code: 'DUPLICATE', message: '该标签已在闪卡队列中' } });
  }

  const resourceName = tag.resource ? tag.resource.name : '未知资源';
  const front = `【资源标签】${tag.name}（${tag.stage}）— 来源：${resourceName}`;
  const back = `标签名：${tag.name}\n阶段：${tag.stage}\n权重：${tag.weight}\n来源资源：${resourceName}`;

  const card = await Flashcard.create({
    userId,
    sourceType: 'resource_tag',
    sourceId: tagId,
    front,
    back,
    intervalDays: 1,
    easeFactor: 1.5,
    nextReviewAt: new Date(),
    reviewCount: 0,
    correctCount: 0,
  });

  return res.json({ ok: true, data: card });
}

async function batchCreateFromWrongQuestions(req, res) {
  const userId = req.user.id;
  const { wrongQuestionIds } = req.body;

  if (!Array.isArray(wrongQuestionIds) || wrongQuestionIds.length === 0) {
    return res.status(400).json({ ok: false, error: { code: 'INVALID_PARAM', message: '请提供错题ID列表' } });
  }

  const wqs = await WrongQuestion.findAll({
    where: { id: { [Op.in]: wrongQuestionIds }, userId },
  });

  const existingCards = await Flashcard.findAll({
    where: {
      userId,
      sourceType: 'wrong_question',
      sourceId: { [Op.in]: wrongQuestionIds },
    },
  });
  const existingIds = new Set(existingCards.map((c) => c.sourceId));

  const created = [];
  for (const wq of wqs) {
    if (existingIds.has(wq.id)) continue;

    const front = `【错题】${wq.knowledgePoint}（题号 ${wq.code}）`;
    const back = `知识点：${wq.knowledgePoint}\n掌握程度：${wq.mastery}\n做错次数：${wq.wrongCount}\n订正状态：${wq.corrected ? '已订正' : '未订正'}`;

    const card = await Flashcard.create({
      userId,
      sourceType: 'wrong_question',
      sourceId: wq.id,
      front,
      back,
      intervalDays: 1,
      easeFactor: 1.5,
      nextReviewAt: new Date(),
      reviewCount: 0,
      correctCount: 0,
    });
    created.push(card);
  }

  return res.json({ ok: true, data: { created: created.length, skipped: wqs.length - created.length } });
}

async function reviewCard(req, res) {
  const userId = req.user.id;
  const { flashcardId } = req.params;
  const { result } = req.body;

  if (!['remembered', 'forgot'].includes(result)) {
    return res.status(400).json({ ok: false, error: { code: 'INVALID_PARAM', message: '结果必须是 remembered 或 forgot' } });
  }

  const card = await Flashcard.findOne({ where: { id: flashcardId, userId } });
  if (!card) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '闪卡不存在' } });
  }

  await FlashcardReview.create({
    flashcardId: card.id,
    userId,
    result,
  });

  let intervalDays = Number(card.intervalDays);
  let easeFactor = Number(card.easeFactor);

  if (result === 'forgot') {
    intervalDays = 1;
  } else {
    easeFactor = Math.min(Number((easeFactor + 0.1).toFixed(2)), 2.5);
    intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
  }

  const nextReviewAt = addDays(new Date(), intervalDays);

  await card.update({
    intervalDays,
    easeFactor,
    nextReviewAt,
    reviewCount: card.reviewCount + 1,
    correctCount: card.correctCount + (result === 'remembered' ? 1 : 0),
  });

  if (card.sourceType === 'wrong_question') {
    await WrongQuestion.update(
      { reviewedAt: new Date() },
      { where: { id: card.sourceId, userId } }
    );
  }

  return res.json({
    ok: true,
    data: {
      card,
      nextReviewAt,
      intervalDays,
    },
  });
}

async function getReviewSummary(req, res) {
  const userId = req.user.id;
  const { sessionStart } = req.query;

  if (!sessionStart) {
    return res.status(400).json({ ok: false, error: { code: 'INVALID_PARAM', message: '请提供复习开始时间' } });
  }

  const since = new Date(sessionStart);

  const reviews = await FlashcardReview.findAll({
    where: {
      userId,
      createdAt: { [Op.gte]: since },
    },
    include: [{ model: Flashcard, as: 'flashcard' }],
    order: [['createdAt', 'ASC']],
  });

  const total = reviews.length;
  const remembered = reviews.filter((r) => r.result === 'remembered').length;
  const forgot = total - remembered;
  const accuracy = total > 0 ? Number(((remembered / total) * 100).toFixed(1)) : 0;

  const cardIds = [...new Set(reviews.map((r) => r.flashcardId))];
  const cards = await Flashcard.findAll({
    where: { id: { [Op.in]: cardIds }, userId },
  });

  const nextReviews = cards
    .filter((c) => c.nextReviewAt)
    .map((c) => ({
      id: c.id,
      front: c.front,
      nextReviewAt: c.nextReviewAt,
      intervalDays: c.intervalDays,
    }))
    .sort((a, b) => new Date(a.nextReviewAt) - new Date(b.nextReviewAt));

  const todayEnd = endOfDay(new Date());
  const tomorrowDue = await Flashcard.count({
    where: {
      userId,
      nextReviewAt: { [Op.gt]: todayEnd, [Op.lte]: addDays(todayEnd, 1) },
    },
  });

  return res.json({
    ok: true,
    data: {
      total,
      remembered,
      forgot,
      accuracy,
      nextReviews,
      tomorrowDue,
    },
  });
}

async function deleteFlashcard(req, res) {
  const userId = req.user.id;
  const { flashcardId } = req.params;

  const card = await Flashcard.findOne({ where: { id: flashcardId, userId } });
  if (!card) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '闪卡不存在' } });
  }

  await FlashcardReview.destroy({ where: { flashcardId: card.id } });
  await card.destroy();

  return res.json({ ok: true });
}

module.exports = {
  listFlashcards,
  getTodayDueCount,
  getDueCards,
  createFromWrongQuestion,
  createFromResourceTag,
  batchCreateFromWrongQuestions,
  reviewCard,
  getReviewSummary,
  deleteFlashcard,
};
