const express = require('express');

const authRoutes = require('./auth');
const pageRoutes = require('./pages');
const actionRoutes = require('./actions');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ ok: true });
});

router.use('/auth', authRoutes);
router.use('/pages', pageRoutes);
router.use('/actions', actionRoutes);

module.exports = router;
