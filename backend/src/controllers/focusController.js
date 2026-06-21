const { Op } = require('sequelize');

const { FocusSession, FocusPreset, Resource, LearningDaily } = require('../models');

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

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

async function ensureDefaultPreset(userId) {
  const [preset] = await FocusPreset.findOrCreate({
    where: { userId, isDefault: true },
    defaults: {
      userId,
      name: '经典番茄钟',
      focusMinutes: 25,
      breakMinutes: 5,
      isDefault: true,
      sortOrder: 0,
    },
  });
  return preset;
}

async function listPresets(req, res) {
  const userId = req.user.id;
  await ensureDefaultPreset(userId);
  const presets = await FocusPreset.findAll({
    where: { userId },
    order: [['sortOrder', 'ASC'], ['id', 'ASC']],
  });
  return res.json({ ok: true, data: presets });
}

async function createPreset(req, res) {
  const userId = req.user.id;
  const { name, focusMinutes, breakMinutes } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ ok: false, error: { code: 'INVALID_PARAM', message: '预设名称不能为空' } });
  }

  const focusMin = safeNumber(focusMinutes);
  const breakMin = safeNumber(breakMinutes);
  if (focusMin < 1 || focusMin > 180) {
    return res.status(400).json({ ok: false, error: { code: 'INVALID_PARAM', message: '专注时长需在1-180分钟之间' } });
  }
  if (breakMin < 1 || breakMin > 60) {
    return res.status(400).json({ ok: false, error: { code: 'INVALID_PARAM', message: '休息时长需在1-60分钟之间' } });
  }

  const maxOrder = await FocusPreset.max('sortOrder', { where: { userId } });
  const preset = await FocusPreset.create({
    userId,
    name: String(name).trim().slice(0, 64),
    focusMinutes: focusMin,
    breakMinutes: breakMin,
    isDefault: false,
    sortOrder: Number.isFinite(maxOrder) ? maxOrder + 1 : 0,
  });

  return res.json({ ok: true, data: preset });
}

async function updatePreset(req, res) {
  const userId = req.user.id;
  const { presetId } = req.params;
  const { name, focusMinutes, breakMinutes } = req.body;

  const preset = await FocusPreset.findOne({ where: { id: presetId, userId } });
  if (!preset) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '预设不存在' } });
  }

  const patch = {};
  if (typeof name === 'string' && name.trim()) {
    patch.name = name.trim().slice(0, 64);
  }
  if (focusMinutes !== undefined) {
    const fm = safeNumber(focusMinutes);
    if (fm < 1 || fm > 180) {
      return res.status(400).json({ ok: false, error: { code: 'INVALID_PARAM', message: '专注时长需在1-180分钟之间' } });
    }
    patch.focusMinutes = fm;
  }
  if (breakMinutes !== undefined) {
    const bm = safeNumber(breakMinutes);
    if (bm < 1 || bm > 60) {
      return res.status(400).json({ ok: false, error: { code: 'INVALID_PARAM', message: '休息时长需在1-60分钟之间' } });
    }
    patch.breakMinutes = bm;
  }

  await preset.update(patch);
  return res.json({ ok: true, data: preset });
}

async function deletePreset(req, res) {
  const userId = req.user.id;
  const { presetId } = req.params;

  const preset = await FocusPreset.findOne({ where: { id: presetId, userId } });
  if (!preset) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '预设不存在' } });
  }
  if (preset.isDefault) {
    return res.status(400).json({ ok: false, error: { code: 'INVALID_OPERATION', message: '默认预设不可删除' } });
  }

  await preset.destroy();
  return res.json({ ok: true });
}

async function setDefaultPreset(req, res) {
  const userId = req.user.id;
  const { presetId } = req.params;

  const preset = await FocusPreset.findOne({ where: { id: presetId, userId } });
  if (!preset) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '预设不存在' } });
  }

  await FocusPreset.update({ isDefault: false }, { where: { userId } });
  await preset.update({ isDefault: true });

  return res.json({ ok: true });
}

async function startSession(req, res) {
  const userId = req.user.id;
  const { presetId, resourceId } = req.body;

  let preset = null;
  let focusMinutes = 25;
  let breakMinutes = 5;
  let presetName = '经典番茄钟';

  if (presetId) {
    preset = await FocusPreset.findOne({ where: { id: presetId, userId } });
    if (preset) {
      focusMinutes = preset.focusMinutes;
      breakMinutes = preset.breakMinutes;
      presetName = preset.name;
    }
  }

  if (!preset) {
    preset = await ensureDefaultPreset(userId);
    focusMinutes = preset.focusMinutes;
    breakMinutes = preset.breakMinutes;
    presetName = preset.name;
  }

  let resourceName = '';
  if (resourceId) {
    const resource = await Resource.findByPk(resourceId);
    if (resource) {
      resourceName = resource.name;
    }
  }

  const session = await FocusSession.create({
    userId,
    resourceId: resourceId || null,
    resourceName,
    presetId: preset.id,
    presetName,
    focusMinutes,
    breakMinutes,
    actualFocusSeconds: 0,
    status: '进行中',
    summary: '',
    startedAt: new Date(),
  });

  return res.json({ ok: true, data: session });
}

async function endSession(req, res) {
  const userId = req.user.id;
  const { sessionId } = req.params;
  const { summary, actualFocusSeconds } = req.body;

  const session = await FocusSession.findOne({ where: { id: sessionId, userId } });
  if (!session) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '专注记录不存在' } });
  }
  if (session.status !== '进行中') {
    return res.status(400).json({ ok: false, error: { code: 'INVALID_STATUS', message: '该专注记录已结束' } });
  }

  const actualSec = safeNumber(actualFocusSeconds);
  const endedAt = new Date();
  const minSeconds = Math.min(actualSec, session.focusMinutes * 60);

  await session.update({
    status: '已完成',
    summary: String(summary || '').slice(0, 500),
    actualFocusSeconds: minSeconds,
    endedAt,
  });

  const date = toDateOnly(session.startedAt);
  const subject = '综合';
  const [daily] = await LearningDaily.findOrCreate({
    where: { userId, date, subject },
    defaults: {
      userId,
      date,
      subject,
      studyMinutes: 0,
      completedCount: 0,
      avgMatchScore: 0,
      targetAchieveRate: 0,
      note: '',
    },
  });

  const addMinutes = Math.round(minSeconds / 60);
  await daily.update({
    studyMinutes: daily.studyMinutes + addMinutes,
  });

  return res.json({ ok: true, data: session });
}

async function listSessions(req, res) {
  const userId = req.user.id;
  const { days = 7, page = 1, pageSize = 20 } = req.query;

  const since = daysAgo(safeNumber(days) - 1);
  const offset = (safeNumber(page) - 1) * safeNumber(pageSize);
  const limit = safeNumber(pageSize);

  const { count, rows } = await FocusSession.findAndCountAll({
    where: {
      userId,
      startedAt: { [Op.gte]: since },
    },
    order: [['startedAt', 'DESC']],
    offset,
    limit,
  });

  return res.json({
    ok: true,
    data: {
      list: rows,
      total: count,
      page: safeNumber(page),
      pageSize: limit,
    },
  });
}

async function getFocusStats(req, res) {
  const userId = req.user.id;
  const { days = 7 } = req.query;

  const since = daysAgo(safeNumber(days) - 1);
  const dateStr = toDateOnly(since);

  const sessions = await FocusSession.findAll({
    where: {
      userId,
      status: '已完成',
      startedAt: { [Op.gte]: since },
    },
    order: [['startedAt', 'ASC']],
  });

  const dateList = [];
  for (let i = 0; i < safeNumber(days); i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    dateList.push(toDateOnly(d));
  }

  const dailyMap = dateList.reduce((acc, date) => {
    acc[date] = { date, count: 0, focusSeconds: 0 };
    return acc;
  }, {});

  for (const s of sessions) {
    const date = toDateOnly(s.startedAt);
    if (!dailyMap[date]) continue;
    dailyMap[date].count += 1;
    dailyMap[date].focusSeconds += safeNumber(s.actualFocusSeconds);
  }

  const dailyStats = dateList.map((date) => ({
    date,
    pomodoroCount: dailyMap[date].count,
    focusMinutes: Math.round(dailyMap[date].focusSeconds / 60),
  }));

  const totalPomodoros = dailyStats.reduce((sum, d) => sum + d.pomodoroCount, 0);
  const totalFocusMinutes = dailyStats.reduce((sum, d) => sum + d.focusMinutes, 0);

  return res.json({
    ok: true,
    data: {
      totalPomodoros,
      totalFocusMinutes,
      dailyStats,
    },
  });
}

module.exports = {
  listPresets,
  createPreset,
  updatePreset,
  deletePreset,
  setDefaultPreset,
  startSession,
  endSession,
  listSessions,
  getFocusStats,
};
