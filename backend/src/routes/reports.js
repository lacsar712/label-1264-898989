const express = require('express');

const reportController = require('../controllers/reportController');
const { auth, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get('/students', auth, requireAdmin, asyncHandler(reportController.getStudentOptions));

router.post(
  '/generate',
  auth,
  requireAdmin,
  reportController.validateGenerateReport(),
  validate,
  asyncHandler(reportController.generateReport)
);

router.get('/admin', auth, requireAdmin, asyncHandler(reportController.getAdminList));

router.get('/student', auth, asyncHandler(reportController.getStudentList));

router.get('/:reportId/progress', auth, asyncHandler(reportController.getProgress));

router.get('/:reportId', auth, asyncHandler(reportController.getDetail));

router.post('/:reportId/archive', auth, requireAdmin, asyncHandler(reportController.archiveReport));

router.delete('/:reportId', auth, requireAdmin, asyncHandler(reportController.deleteReport));

module.exports = router;
