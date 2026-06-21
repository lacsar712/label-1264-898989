const { getHomeData } = require('../services/pages/homeService');
const { getResourcesData } = require('../services/pages/resourcesService');
const { getRecommendationAnalysisData } = require('../services/pages/recommendationAnalysisService');
const { getProgressData } = require('../services/pages/progressService');
const { getAdminUsersData } = require('../services/pages/adminUsersService');
const { getAdminResourcesData } = require('../services/pages/adminResourcesService');
const { getAdminSystemData } = require('../services/pages/adminSystemService');

async function home(req, res) {
  res.json({ ok: true, data: await getHomeData(req.user.id) });
}

async function resources(req, res) {
  res.json({ ok: true, data: await getResourcesData(req.user.id) });
}

async function recommendationAnalysis(req, res) {
  res.json({ ok: true, data: await getRecommendationAnalysisData(req.user.id) });
}

async function progress(req, res) {
  res.json({ ok: true, data: await getProgressData(req.user.id) });
}

async function userAdmin(req, res) {
  res.json({ ok: true, data: await getAdminUsersData() });
}

async function resourceAdmin(req, res) {
  res.json({ ok: true, data: await getAdminResourcesData() });
}

async function systemConfig(req, res) {
  res.json({ ok: true, data: await getAdminSystemData() });
}

module.exports = { home, resources, recommendationAnalysis, progress, userAdmin, resourceAdmin, systemConfig };
