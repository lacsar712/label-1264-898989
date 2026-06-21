const { body, query } = require('express-validator');

const reportService = require('../services/learningReportService');

async function generateReport(req, res) {
  const { userId, periodStart, periodEnd, periodType } = req.body;
  const generatedBy = req.user.id;

  const report = await reportService.createReport(
    userId,
    periodStart,
    periodEnd,
    periodType,
    generatedBy
  );

  res.json({
    ok: true,
    data: {
      id: report.id,
      status: report.status,
      progress: report.progress,
    },
  });
}

async function getProgress(req, res) {
  const { reportId } = req.params;
  const isAdmin = req.user.role === 'admin';
  const progress = await reportService.getReportProgress(reportId, req.user.id, isAdmin);
  res.json({ ok: true, data: progress });
}

async function getAdminList(req, res) {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const filters = {
    userId: req.query.userId ? parseInt(req.query.userId) : null,
    status: req.query.status || null,
    periodStart: req.query.periodStart || null,
    periodEnd: req.query.periodEnd || null,
  };

  const result = await reportService.getAdminReportList(page, pageSize, filters);
  res.json({ ok: true, data: result });
}

async function getStudentList(req, res) {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;

  const result = await reportService.getStudentReportList(req.user.id, page, pageSize);
  res.json({ ok: true, data: result });
}

async function getDetail(req, res) {
  const { reportId } = req.params;
  const isAdmin = req.user.role === 'admin';

  const detail = await reportService.getReportDetail(reportId, req.user.id, isAdmin);
  res.json({ ok: true, data: detail });
}

async function archiveReport(req, res) {
  const { reportId } = req.params;
  await reportService.archiveReport(reportId);
  res.json({ ok: true, data: { archived: true } });
}

async function deleteReport(req, res) {
  const { reportId } = req.params;
  await reportService.deleteReport(reportId);
  res.json({ ok: true, data: { deleted: true } });
}

async function getStudentOptions(req, res) {
  const { User } = require('../models');
  const students = await User.findAll({
    where: { role: 'student', active: true },
    attributes: ['id', 'name', 'stage', 'username'],
    order: [['name', 'ASC']],
  });

  res.json({
    ok: true,
    data: students.map((s) => ({
      id: s.id,
      name: s.name,
      stage: s.stage,
      username: s.username,
      label: `${s.id} · ${s.name} · ${s.stage}`,
    })),
  });
}

function validateGenerateReport() {
  return [
    body('userId').isInt({ min: 1 }),
    body('periodStart').isISO8601(),
    body('periodEnd').isISO8601(),
    body('periodType').isIn(['周', '月', '学期', '自定义']),
  ];
}

module.exports = {
  generateReport,
  getProgress,
  getAdminList,
  getStudentList,
  getDetail,
  archiveReport,
  deleteReport,
  getStudentOptions,
  validateGenerateReport,
};
