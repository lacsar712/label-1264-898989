<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ElButton,
  ElCard,
  ElCol,
  ElDialog,
  ElEmpty,
  ElRow,
  ElSkeleton,
  ElTag,
  ElPagination,
} from 'element-plus'
import {
  Document,
  View,
  Printer,
  Calendar,
  User,
} from '@element-plus/icons-vue'
import { api } from '../lib/api'
import ReportPreview from '../components/ReportPreview.vue'

const router = useRouter()

const loading = ref(false)
const reportList = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const previewVisible = ref(false)
const currentReport = ref(null)

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getLevelTagType(level) {
  const types = {
    '优秀': 'success',
    '良好': 'primary',
    '一般': 'warning',
    '需努力': 'danger',
  }
  return types[level] || 'info'
}

function getLevelColor(level) {
  const colors = {
    '优秀': 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
    '良好': 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    '一般': 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    '需努力': 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
  }
  return colors[level] || 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)'
}

async function loadReports() {
  loading.value = true
  try {
    const resp = await api.get('/reports/student', {
      params: { page: page.value, pageSize: pageSize.value },
    })
    reportList.value = resp.data?.data?.list || []
    total.value = resp.data?.data?.total || 0
  } finally {
    loading.value = false
  }
}

async function viewReport(reportId) {
  try {
    const resp = await api.get(`/reports/${reportId}`)
    currentReport.value = resp.data?.data
    previewVisible.value = true
  } catch (e) {}
}

function openPreviewInNewTab(reportId) {
  const routeData = router.resolve({
    path: `/report-preview/${reportId}`,
  })
  window.open(routeData.href, '_blank')
}

function handlePageChange(newPage) {
  page.value = newPage
  loadReports()
}

function handleSizeChange(newSize) {
  pageSize.value = newSize
  page.value = 1
  loadReports()
}

onMounted(() => {
  loadReports()
})
</script>

<template>
  <div class="student-reports-page">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard class="panel-card header-card">
          <div class="header-main">
            <div>
              <div class="page-title">我的学情报告</div>
              <div class="page-subtitle">查看管理员为您归档的历史学情分析报告</div>
            </div>
            <div class="header-stats">
              <div class="stat-badge">
                <span class="stat-icon"><Document /></span>
                <span class="stat-text">共 {{ total }} 份报告</span>
              </div>
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" class="section-row">
      <ElCol :span="24">
        <ElSkeleton :loading="loading" animated>
          <div v-if="reportList.length > 0" class="reports-grid">
            <div
              v-for="report in reportList"
              :key="report.id"
              class="report-card"
              :style="{ background: getLevelColor(report.overallLevel) }"
            >
              <div class="report-card-header">
                <div class="report-icon">
                  <el-icon :size="28"><Document /></el-icon>
                </div>
                <el-tag
                  :type="getLevelTagType(report.overallLevel)"
                  size="large"
                  effect="dark"
                  class="level-tag"
                >
                  {{ report.overallLevel || '未评级' }}
                </el-tag>
              </div>

              <div class="report-card-title">{{ report.title }}</div>

              <div class="report-card-meta">
                <div class="meta-item">
                  <el-icon><Calendar /></el-icon>
                  <span>{{ formatDate(report.periodStart) }} ~ {{ formatDate(report.periodEnd) }}</span>
                </div>
                <div class="meta-item">
                  <el-icon><User /></el-icon>
                  <span>生成人：{{ report.generatedByName || '系统' }}</span>
                </div>
                <div class="meta-item">
                  <el-tag size="small" effect="plain">{{ report.periodType }}</el-tag>
                  <span class="completion-rate">完成率 {{ report.completionRate || 0 }}%</span>
                </div>
              </div>

              <div class="report-card-footer">
                <div class="generate-time">{{ formatDateTime(report.generatedAt) }}</div>
                <div class="card-actions">
                  <ElButton size="small" @click="viewReport(report.id)">
                    查看详情
                  </ElButton>
                  <ElButton size="small" type="primary" plain @click="openPreviewInNewTab(report.id)">
                    新窗口打开
                  </ElButton>
                </div>
              </div>
            </div>
          </div>

          <ElEmpty v-else description="暂无归档的学情报告" class="empty-state" />

          <div v-if="total > 0" class="pagination-wrapper">
            <ElPagination
              v-model:current-page="page"
              v-model:page-size="pageSize"
              :page-sizes="[5, 10, 20]"
              :total="total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handlePageChange"
            />
          </div>
        </ElSkeleton>
      </ElCol>
    </ElRow>

    <ElDialog
      v-model="previewVisible"
      title="报告详情"
      width="95%"
      :close-on-click-modal="false"
      class="report-preview-dialog"
    >
      <template #header>
        <div class="dialog-header">
          <span>{{ currentReport?.title }}</span>
          <div class="dialog-header-actions">
            <ElButton size="small" @click="openPreviewInNewTab(currentReport?.id)">
              新标签页打开
            </ElButton>
          </div>
        </div>
      </template>
      <div class="preview-dialog-content">
        <ReportPreview v-if="currentReport" :report="currentReport" />
      </div>
      <template #footer>
        <ElButton @click="previewVisible = false">关闭</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.student-reports-page {
  padding: 16px 16px 22px;
}

.section-row {
  margin-top: 16px;
}

.panel-card {
  border-radius: 14px;
  border: 1px solid #e7edf5;
}

.header-card :deep(.el-card__body) {
  padding: 16px 18px;
}

.header-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
}

.page-subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
}

.header-stats {
  display: flex;
  align-items: center;
}

.stat-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #eff6ff;
  padding: 8px 16px;
  border-radius: 20px;
  color: #1d4ed8;
  font-weight: 500;
}

.stat-icon {
  display: flex;
  align-items: center;
}

.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  min-height: 400px;
}

.report-card {
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.report-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.report-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.report-icon {
  color: #3b82f6;
  opacity: 0.8;
}

.level-tag {
  font-weight: 600;
}

.report-card-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.4;
}

.report-card-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #475569;
}

.meta-item .el-icon {
  color: #64748b;
  font-size: 14px;
}

.completion-rate {
  margin-left: 8px;
  font-weight: 500;
  color: #0369a1;
}

.report-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  margin-top: auto;
}

.generate-time {
  font-size: 12px;
  color: #94a3b8;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  padding: 60px 0;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

.report-preview-dialog :deep(.el-dialog__body) {
  padding: 0;
  height: calc(100vh - 200px);
}

.preview-dialog-content {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.dialog-header-actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 768px) {
  .student-reports-page {
    padding: 12px 12px 20px;
  }

  .reports-grid {
    grid-template-columns: 1fr;
  }
}
</style>
