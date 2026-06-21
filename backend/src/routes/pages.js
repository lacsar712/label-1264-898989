const express = require('express');

const page = require('../controllers/pageController');
const { auth, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get('/home', auth, asyncHandler(page.home));
router.get('/resources', auth, asyncHandler(page.resources));
router.get('/recommendation-analysis', auth, asyncHandler(page.recommendationAnalysis));
router.get('/progress', auth, asyncHandler(page.progress));

router.get('/admin/users', auth, requireAdmin, asyncHandler(page.userAdmin));
router.get('/admin/resources', auth, requireAdmin, asyncHandler(page.resourceAdmin));
router.get('/admin/system', auth, requireAdmin, asyncHandler(page.systemConfig));

module.exports = router;
