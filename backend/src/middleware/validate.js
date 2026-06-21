const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  return res.status(400).json({
    ok: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: '请求参数不合法',
      details: result.array().map((e) => ({ field: e.path, message: e.msg })),
    },
  });
}

module.exports = { validate };
