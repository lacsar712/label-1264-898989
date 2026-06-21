const jwt = require('jsonwebtoken');

const { User } = require('../models');

async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: '未登录' } });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.userId);
    if (!user || !user.active) {
      return res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: '账号不可用' } });
    }
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: '登录已过期' } });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: '无权限' } });
  }
  return next();
}

module.exports = { auth, requireAdmin };
