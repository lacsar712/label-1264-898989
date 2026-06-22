const { sequelize, User, Resource } = require('../models');

const MIN_RESOURCE_COUNT = 48;

async function checkDatabase() {
  try {
    await sequelize.authenticate();
    return { status: 'pass', detail: 'MySQL connection available' };
  } catch (err) {
    return { status: 'fail', detail: err.message };
  }
}

async function checkAdminUser() {
  try {
    const admin = await User.findOne({ where: { username: 'admin' } });
    if (admin) {
      return { status: 'pass', detail: 'Admin demo account exists' };
    }
    return { status: 'fail', detail: 'Admin demo account not found' };
  } catch (err) {
    return { status: 'fail', detail: err.message };
  }
}

async function checkResources() {
  try {
    const count = await Resource.count();
    if (count >= MIN_RESOURCE_COUNT) {
      return { status: 'pass', detail: `Resource count ${count} meets minimum ${MIN_RESOURCE_COUNT}` };
    }
    return { status: 'fail', detail: `Resource count ${count} below minimum ${MIN_RESOURCE_COUNT}` };
  } catch (err) {
    return { status: 'fail', detail: err.message };
  }
}

async function performHealthCheck() {
  const [database, adminUser, resources] = await Promise.all([
    checkDatabase(),
    checkAdminUser(),
    checkResources(),
  ]);

  const checks = { database, adminUser, resources };
  const allPassed = Object.values(checks).every((c) => c.status === 'pass');

  return {
    status: allPassed ? 'pass' : 'fail',
    checks,
  };
}

module.exports = {
  performHealthCheck,
  MIN_RESOURCE_COUNT,
};
