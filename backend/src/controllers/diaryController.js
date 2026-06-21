const { Op } = require('sequelize');

const { DiaryEntry } = require('../models');

function toDateOnly(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function upsertEntry(req, res) {
  const userId = req.user.id;
  const { date, mood, harvest, plan } = req.body;

  const entryDate = date || toDateOnly(new Date());

  if (mood !== undefined) {
    const m = Number(mood);
    if (!Number.isInteger(m) || m < 1 || m > 5) {
      return res.status(400).json({ ok: false, error: { code: 'INVALID_PARAM', message: '心情取值需为1-5整数' } });
    }
  }

  const [entry, created] = await DiaryEntry.findOrCreate({
    where: { userId, date: entryDate },
    defaults: {
      userId,
      date: entryDate,
      mood: mood || 3,
      harvest: String(harvest || '').slice(0, 5000),
      plan: String(plan || '').slice(0, 5000),
    },
  });

  if (!created) {
    const patch = {};
    if (mood !== undefined) patch.mood = Number(mood);
    if (harvest !== undefined) patch.harvest = String(harvest).slice(0, 5000);
    if (plan !== undefined) patch.plan = String(plan).slice(0, 5000);
    await entry.update(patch);
  }

  return res.json({ ok: true, data: entry });
}

async function getToday(req, res) {
  const userId = req.user.id;
  const today = toDateOnly(new Date());

  const entry = await DiaryEntry.findOne({ where: { userId, date: today } });

  return res.json({ ok: true, data: entry || null });
}

async function getEntryByDate(req, res) {
  const userId = req.user.id;
  const { date } = req.params;

  const entry = await DiaryEntry.findOne({ where: { userId, date } });
  if (!entry) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '该日期无日记' } });
  }

  return res.json({ ok: true, data: entry });
}

async function listEntries(req, res) {
  const userId = req.user.id;
  const { year, month, keyword, page = 1, pageSize = 20 } = req.query;

  const where = { userId };

  if (year && month) {
    const y = Number(year);
    const m = Number(month);
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    let endMonth = m + 1;
    let endYear = y;
    if (endMonth > 12) {
      endMonth = 1;
      endYear = y + 1;
    }
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
    where.date = { [Op.gte]: startDate, [Op.lt]: endDate };
  }

  if (keyword && String(keyword).trim()) {
    const kw = String(keyword).trim();
    where[Op.or] = [
      { harvest: { [Op.like]: `%${kw}%` } },
      { plan: { [Op.like]: `%${kw}%` } },
    ];
  }

  const offset = (Number(page) - 1) * Number(pageSize);
  const limit = Number(pageSize);

  const { count, rows } = await DiaryEntry.findAndCountAll({
    where,
    order: [['date', 'DESC']],
    offset,
    limit,
  });

  return res.json({
    ok: true,
    data: {
      list: rows,
      total: count,
      page: Number(page),
      pageSize: limit,
    },
  });
}

async function getMonthlyArchive(req, res) {
  const userId = req.user.id;
  const { year } = req.params;

  const entries = await DiaryEntry.findAll({
    where: {
      userId,
      date: {
        [Op.gte]: `${year}-01-01`,
        [Op.lt]: `${Number(year) + 1}-01-01`,
      },
    },
    attributes: ['date'],
    order: [['date', 'ASC']],
  });

  const months = [...new Set(entries.map((e) => e.date.slice(0, 7)))].sort().reverse();

  return res.json({ ok: true, data: { year: Number(year), months } });
}

async function getStreak(req, res) {
  const userId = req.user.id;

  const entries = await DiaryEntry.findAll({
    where: { userId },
    attributes: ['date'],
    order: [['date', 'DESC']],
  });

  if (entries.length === 0) {
    return res.json({ ok: true, data: { currentStreak: 0, maxStreak: 0 } });
  }

  const dateSet = new Set(entries.map((e) => e.date));
  const today = toDateOnly(new Date());

  let currentStreak = 0;
  let checkDate = today;

  if (!dateSet.has(today)) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    checkDate = toDateOnly(yesterday);
  }

  while (dateSet.has(checkDate)) {
    currentStreak += 1;
    const d = new Date(checkDate);
    d.setDate(d.getDate() - 1);
    checkDate = toDateOnly(d);
  }

  const sortedDates = [...dateSet].sort();
  let maxStreak = 1;
  let tempStreak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      tempStreak += 1;
      if (tempStreak > maxStreak) maxStreak = tempStreak;
    } else {
      tempStreak = 1;
    }
  }
  if (sortedDates.length === 1) maxStreak = 1;
  if (currentStreak > maxStreak) maxStreak = currentStreak;

  return res.json({ ok: true, data: { currentStreak, maxStreak } });
}

async function deleteEntry(req, res) {
  const userId = req.user.id;
  const { entryId } = req.params;

  const entry = await DiaryEntry.findOne({ where: { id: entryId, userId } });
  if (!entry) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '日记不存在' } });
  }

  await entry.destroy();
  return res.json({ ok: true });
}

module.exports = {
  upsertEntry,
  getToday,
  getEntryByDate,
  listEntries,
  getMonthlyArchive,
  getStreak,
  deleteEntry,
};
