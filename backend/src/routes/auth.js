const express = require('express');
const { body } = require('express-validator');

const { login, me } = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.post(
  '/login',
  [body('username').isString().trim().isLength({ min: 1 }), body('password').isString().isLength({ min: 1 })],
  validate,
  asyncHandler(login)
);

router.get('/me', auth, asyncHandler(me));

module.exports = router;
