const { logger } = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('request_error', {
    path: req.path,
    method: req.method,
    message: err?.message,
    stack: err?.stack,
  });

  if (res.headersSent) return next(err);

  res.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '服务器内部错误',
    },
  });
}

module.exports = { errorHandler };
