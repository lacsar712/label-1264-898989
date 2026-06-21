const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { User } = require('../models');

async function login(req, res) {
  const { username, password } = req.body;
  const user = await User.findOne({ where: { username } });
  if (!user || !user.active) {
    return res.status(401).json({ ok: false, error: { code: 'INVALID_CREDENTIALS', message: '账号或密码错误' } });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ ok: false, error: { code: 'INVALID_CREDENTIALS', message: '账号或密码错误' } });
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return res.json({
    ok: true,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        stage: user.stage,
        learningStyle: user.learningStyle,
      },
    },
  });
}

async function me(req, res) {
  const user = req.user;
  return res.json({
    ok: true,
    data: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      stage: user.stage,
      learningStyle: user.learningStyle,
      subjectPreference: user.subjectPreference,
    },
  });
}

module.exports = { login, me };
