const express = require('express');
const { body, query, param } = require('express-validator');

const diary = require('../controllers/diaryController');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.post(
  '/',
  auth,
  [
    body('date').optional().isISO8601(),
    body('mood').optional().isInt({ min: 1, max: 5 }),
    body('harvest').optional().isString().isLength({ max: 5000 }),
    body('plan').optional().isString().isLength({ max: 5000 }),
  ],
  validate,
  asyncHandler(diary.upsertEntry)
);

router.get('/today', auth, asyncHandler(diary.getToday));

router.get('/streak', auth, asyncHandler(diary.getStreak));

router.get(
  '/list',
  auth,
  [
    query('year').optional().isInt({ min: 2000, max: 2100 }),
    query('month').optional().isInt({ min: 1, max: 12 }),
    query('keyword').optional().isString().trim().isLength({ max: 100 }),
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  asyncHandler(diary.listEntries)
);

router.get(
  '/archive/:year',
  auth,
  [param('year').isInt({ min: 2000, max: 2100 })],
  validate,
  asyncHandler(diary.getMonthlyArchive)
);

router.get(
  '/date/:date',
  auth,
  [param('date').isISO8601()],
  validate,
  asyncHandler(diary.getEntryByDate)
);

router.delete('/:entryId', auth, asyncHandler(diary.deleteEntry));

module.exports = router;
