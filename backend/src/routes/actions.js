const express = require('express');
const { body } = require('express-validator');

const action = require('../controllers/actionController');
const { auth, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.post(
  '/recommendations/:recommendationId/favorite',
  auth,
  [body('folderId').optional().isInt({ min: 1 })],
  validate,
  asyncHandler(action.favorite)
);
router.post('/recommendations/:recommendationId/learn', auth, asyncHandler(action.learn));
router.delete('/user-resources/:userResourceId', auth, asyncHandler(action.unfavorite));
router.post('/user-resources/:userResourceId/move-to-queue', auth, asyncHandler(action.moveToQueue));
router.post(
  '/user-resources/:userResourceId/move-to-folder',
  auth,
  [body('folderId').optional().isInt({ min: 1 })],
  validate,
  asyncHandler(action.moveResourceToFolder)
);

router.get('/favorite-folders', auth, asyncHandler(action.listFolders));
router.post(
  '/favorite-folders',
  auth,
  [body('name').isString().trim().isLength({ min: 1, max: 64 }), body('parentId').optional().isInt({ min: 1 })],
  validate,
  asyncHandler(action.createFolder)
);
router.put(
  '/favorite-folders/:folderId/rename',
  auth,
  [body('name').isString().trim().isLength({ min: 1, max: 64 })],
  validate,
  asyncHandler(action.renameFolder)
);
router.post(
  '/favorite-folders/sort',
  auth,
  [body('orders').isArray({ min: 0 })],
  validate,
  asyncHandler(action.sortFolders)
);
router.delete('/favorite-folders/:folderId', auth, asyncHandler(action.deleteFolder));

router.post(
  '/admin/users/:userId/status',
  auth,
  requireAdmin,
  [body('active').isBoolean()],
  validate,
  asyncHandler(action.adminUpdateUserStatus)
);

router.put(
  '/admin/users/:userId/profile',
  auth,
  requireAdmin,
  [
    body('name').optional().isString().trim().isLength({ min: 1, max: 64 }),
    body('stage').optional().isString().trim().isLength({ min: 1, max: 32 }),
    body('learningStyle').optional().isString().trim().isLength({ min: 1, max: 32 }),
    body('subjectPreference').optional().isArray(),
  ],
  validate,
  asyncHandler(action.adminUpdateUserProfile)
);

router.post(
  '/admin/user-tags',
  auth,
  requireAdmin,
  [body('userId').isInt(), body('name').isString().trim().isLength({ min: 1, max: 64 }), body('category').isString().trim().isLength({ min: 1, max: 32 }), body('weight').isFloat({ min: 0, max: 1 })],
  validate,
  asyncHandler(action.adminCreateUserTag)
);

router.put(
  '/admin/user-tags/:tagId',
  auth,
  requireAdmin,
  [body('name').optional().isString().trim().isLength({ min: 1, max: 64 }), body('category').optional().isString().trim().isLength({ min: 1, max: 32 }), body('weight').optional().isFloat({ min: 0, max: 1 })],
  validate,
  asyncHandler(action.adminUpdateUserTag)
);

router.delete('/admin/user-tags/:tagId', auth, requireAdmin, asyncHandler(action.adminDeleteUserTag));

router.put(
  '/admin/resources/:resourceId',
  auth,
  requireAdmin,
  [
    body('name').optional().isString().trim().isLength({ min: 1, max: 128 }),
    body('subject').optional().isString().trim().isLength({ min: 1, max: 32 }),
    body('type').optional().isIn(['课程', '课件', '题库', '视频']),
    body('difficulty').optional().isIn(['基础', '提高', '挑战']),
    body('status').optional().isIn(['上架', '下架', '审核中']),
    body('heat').optional().isInt({ min: 0 }),
  ],
  validate,
  asyncHandler(action.adminUpdateResource)
);

router.post(
  '/admin/resources/:resourceId/review',
  auth,
  requireAdmin,
  [body('status').isIn(['上架', '下架', '审核中'])],
  validate,
  asyncHandler(action.adminReviewResource)
);

router.post('/admin/resources/:resourceId/take-down', auth, requireAdmin, asyncHandler(action.adminTakeDownResource));
router.delete('/admin/resources/:resourceId', auth, requireAdmin, asyncHandler(action.adminDeleteResource));

router.put(
  '/admin/system/params/:paramCode',
  auth,
  requireAdmin,
  [body('value').exists()],
  validate,
  asyncHandler(action.adminUpdateSystemParam)
);

router.post('/admin/system/params/:paramCode/restore', auth, requireAdmin, asyncHandler(action.adminRestoreSystemParam));

router.put(
  '/admin/system/rules/:ruleCode/weights',
  auth,
  requireAdmin,
  [body('weightRatio').isArray({ min: 1 })],
  validate,
  asyncHandler(action.adminUpdateRuleWeights)
);

router.post(
  '/admin/resource-categories',
  auth,
  requireAdmin,
  [
    body('categoryName').isString().trim().isLength({ min: 1, max: 64 }),
    body('parentCategory').isString().trim().isLength({ min: 1, max: 64 }),
    body('subject').isString().trim().isLength({ min: 1, max: 32 }),
    body('type').isIn(['课程', '课件', '题库', '视频']),
    body('sortOrder').optional().isInt({ min: 0 }),
  ],
  validate,
  asyncHandler(action.adminCreateResourceCategory)
);

router.put(
  '/admin/resource-categories/:categoryId',
  auth,
  requireAdmin,
  [
    body('categoryName').optional().isString().trim().isLength({ min: 1, max: 64 }),
    body('parentCategory').optional().isString().trim().isLength({ min: 1, max: 64 }),
    body('subject').optional().isString().trim().isLength({ min: 1, max: 32 }),
    body('type').optional().isIn(['课程', '课件', '题库', '视频']),
    body('sortOrder').optional().isInt({ min: 0 }),
  ],
  validate,
  asyncHandler(action.adminUpdateResourceCategory)
);

router.post(
  '/admin/resource-categories/:categoryId/merge',
  auth,
  requireAdmin,
  [body('targetCategoryId').isString().trim().isLength({ min: 1, max: 64 })],
  validate,
  asyncHandler(action.adminMergeResourceCategory)
);

router.post(
  '/admin/assignments',
  auth,
  requireAdmin,
  [
    body('title').isString().trim().isLength({ min: 1, max: 128 }),
    body('deadline').isISO8601(),
    body('description').optional().isString().trim(),
    body('resourceIds').optional().isArray(),
    body('targetScope').optional().isObject(),
  ],
  validate,
  asyncHandler(action.adminCreateAssignment)
);

router.delete('/admin/assignments/:assignmentId', auth, requireAdmin, asyncHandler(action.adminDeleteAssignment));

router.post('/assignments/:assignmentId/start', auth, asyncHandler(action.studentStartAssignment));
router.post('/assignments/:assignmentId/submit', auth, asyncHandler(action.studentSubmitAssignment));

router.get('/resources/detail', auth, asyncHandler(action.getResourcesDetail));

module.exports = router;
