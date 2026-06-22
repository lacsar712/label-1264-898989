const express = require('express');

const { performHealthCheck } = require('../services/healthService');

const authRoutes = require('./auth');
const pageRoutes = require('./pages');
const actionRoutes = require('./actions');
const focusRoutes = require('./focus');
const flashcardRoutes = require('./flashcard');
const reportRoutes = require('./reports');
const diaryRoutes = require('./diary');

const router = express.Router();

router.get('/health', async (req, res) => {
  const result = await performHealthCheck();
  const statusCode = result.status === 'pass' ? 200 : 503;
  res.status(statusCode).json(result);
});

router.use('/auth', authRoutes);
router.use('/pages', pageRoutes);
router.use('/actions', actionRoutes);
router.use('/focus', focusRoutes);
router.use('/flashcards', flashcardRoutes);
router.use('/reports', reportRoutes);
router.use('/diary', diaryRoutes);

module.exports = router;
