const express = require('express');
const { body, query } = require('express-validator');

const focus = require('../controllers/focusController');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get('/presets', auth, asyncHandler(focus.listPresets));
router.post(
  '/presets',
  auth,
  [
    body('name').isString().trim().isLength({ min: 1, max: 64 }),
    body('focusMinutes').isInt({ min: 1, max: 180 }),
    body('breakMinutes').isInt({ min: 1, max: 60 }),
  ],
  validate,
  asyncHandler(focus.createPreset)
);
router.put(
  '/presets/:presetId',
  auth,
  [
    body('name').optional().isString().trim().isLength({ min: 1, max: 64 }),
    body('focusMinutes').optional().isInt({ min: 1, max: 180 }),
    body('breakMinutes').optional().isInt({ min: 1, max: 60 }),
  ],
  validate,
  asyncHandler(focus.updatePreset)
);
router.delete('/presets/:presetId', auth, asyncHandler(focus.deletePreset));
router.post('/presets/:presetId/set-default', auth, asyncHandler(focus.setDefaultPreset));

router.post(
  '/sessions/start',
  auth,
  [body('presetId').optional().isInt({ min: 1 }), body('resourceId').optional().isInt({ min: 1 })],
  validate,
  asyncHandler(focus.startSession)
);
router.post(
  '/sessions/:sessionId/end',
  auth,
  [body('summary').optional().isString().isLength({ max: 500 }), body('actualFocusSeconds').optional().isInt({ min: 0 })],
  validate,
  asyncHandler(focus.endSession)
);
router.get(
  '/sessions',
  auth,
  [query('days').optional().isInt({ min: 1, max: 90 }), query('page').optional().isInt({ min: 1 }), query('pageSize').optional().isInt({ min: 1, max: 100 })],
  validate,
  asyncHandler(focus.listSessions)
);
router.get(
  '/stats',
  auth,
  [query('days').optional().isInt({ min: 1, max: 90 })],
  validate,
  asyncHandler(focus.getFocusStats)
);

module.exports = router;
