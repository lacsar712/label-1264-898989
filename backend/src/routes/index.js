const express = require('express');

const authRoutes = require('./auth');
const pageRoutes = require('./pages');
const actionRoutes = require('./actions');
const focusRoutes = require('./focus');
const flashcardRoutes = require('./flashcard');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ ok: true });
});

router.use('/auth', authRoutes);
router.use('/pages', pageRoutes);
router.use('/actions', actionRoutes);
router.use('/focus', focusRoutes);
router.use('/flashcards', flashcardRoutes);

module.exports = router;
