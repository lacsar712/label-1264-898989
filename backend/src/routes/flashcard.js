const express = require('express');
const { body, query } = require('express-validator');

const flashcard = require('../controllers/flashcardController');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get(
  '/',
  auth,
  [
    query('status').optional().isIn(['due', 'future', 'all']),
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  asyncHandler(flashcard.listFlashcards)
);

router.get('/today-count', auth, asyncHandler(flashcard.getTodayDueCount));

router.get('/due', auth, asyncHandler(flashcard.getDueCards));

router.post(
  '/from-wrong-question',
  auth,
  [body('wrongQuestionId').isInt({ min: 1 })],
  validate,
  asyncHandler(flashcard.createFromWrongQuestion)
);

router.post(
  '/from-resource-tag',
  auth,
  [body('tagId').isInt({ min: 1 })],
  validate,
  asyncHandler(flashcard.createFromResourceTag)
);

router.post(
  '/batch-from-wrong-questions',
  auth,
  [body('wrongQuestionIds').isArray({ min: 1 }), body('wrongQuestionIds.*').isInt({ min: 1 })],
  validate,
  asyncHandler(flashcard.batchCreateFromWrongQuestions)
);

router.post(
  '/:flashcardId/review',
  auth,
  [body('result').isIn(['remembered', 'forgot'])],
  validate,
  asyncHandler(flashcard.reviewCard)
);

router.get(
  '/review-summary',
  auth,
  [query('sessionStart').isISO8601()],
  validate,
  asyncHandler(flashcard.getReviewSummary)
);

router.delete('/:flashcardId', auth, asyncHandler(flashcard.deleteFlashcard));

module.exports = router;
