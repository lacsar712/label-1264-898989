<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ElButton,
  ElCard,
  ElCol,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElMessageBox,
  ElNotification,
  ElOption,
  ElProgress,
  ElRow,
  ElSelect,
  ElSkeleton,
  ElTable,
  ElTableColumn,
  ElTag,
  ElInput,
} from 'element-plus'
import {
  Document,
  Download,
  Printer,
  Refresh,
  Plus,
  View,
  Delete,
  FolderOpened,
  Clock,
} from '@element-plus/icons-vue'
import { api } from '../../lib/api'
import ReportPreview from '../../components/ReportPreview.vue'

const router = useRouter()

const loading = ref(false)
const generating = ref(false)
const progressPolling = ref(null)
const currentGeneratingReportId = ref(null)

const studentOptions = ref([])
const reportList = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const filters = reactive({
  userId: null,
  status: '',
  periodStart: '',
  periodEnd: '',
})

const generateForm = reactive({
  userId: null,
  periodType: '月',
  periodStart: '',
  periodEnd: '',
})

const generateFormVisible = ref(false)
const previewVisible = ref(false)
const currentReport = ref(null)
const currentProgress = reactive({
  status: '',
  progress: 0,
  progressMessage: '',
  errorMessage: '',
})

const periodTypeOptions = [
  { label: '周', value: '周' },
  { label: '月', value: '月' },
  { label: '学期', value: '学期' },
  { label: '自定义', value: '自定义' },
]

const statusOptions = [
  { label: '生成中', value: '生成中' },
  { label: '已完成', value: '已完成' },
  { label: '失败', value: '失败' },
]

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getStatusTagType(status) {
  const types = {
    '生成中': 'warning',
    '已完成': 'success',
    '失败': 'danger',
  }
  return types[status] || 'info'
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

function setQuickPeriod(type) {
  const now = new Date()
  let start, end

  switch (type) {
    case '周':
      const dayOfWeek = now.getDay() || 7
      end = new Date(now)
      start = new Date(now)
      start.setDate(now.getDate() - dayOfWeek + 1)
      break
    case '月':
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      break
    case '学期':
      const currentMonth = now.getMonth() + 1
      if (currentMonth >= 2 && currentMonth <= 7) {
        start = new Date(now.getFullYear(), 1, 1)
        end = new Date(now.getFullYear(), 6, 31)
      } else {
        start = new Date(now.getFullYear(), 8, 1)
        end = new Date(now.getFullYear() + 1, 0, 31)
      }
      break
  }

  if (start && end) {
    generateForm.periodStart = formatDate(start)
    generateForm.periodEnd = formatDate(end)
  }
}

async function loadStudents() {
  try {
    const resp = await api.get('/reports/students')
    studentOptions.value = resp.data?.data || []
  } catch (e) {}
}

async function loadReports() {
  loading.value = true
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
    }
    if (filters.userId) params.userId = filters.userId
    if (filters.status) params.status = filters.status
    if (filters.periodStart) params.periodStart = filters.periodStart
    if (filters.periodEnd) params.periodEnd = filters.periodEnd

    const resp = await api.get('/reports/admin', { params })
    reportList.value = resp.data?.data?.list || []
    total.value = resp.data?.data?.total || 0
  } finally {
    loading.value = false
  }
}

function openGenerateDialog() {
  generateForm.userId = null
  generateForm.periodType = '月'
  generateForm.periodStart = ''
  generateForm.periodEnd = ''
  setQuickPeriod('月')
  generateFormVisible.value = true
}

async function generateReport() {
  if (!generateForm.userId || !generateForm.periodStart || !generateForm.periodEnd) {
    ElNotification({ title: '提示', message: '请选择学生和统计周期', type: 'warning', duration: 2000 })
    return
  }

  generating.value = true
  currentProgress.status = '生成中'
  currentProgress.progress = 0
  currentProgress.progressMessage = '正在初始化报告生成...'
  currentProgress.errorMessage = ''

  try {
    const resp = await api.post('/reports/generate', {
      userId: generateForm.userId,
      periodStart: generateForm.periodStart,
      periodEnd: generateForm.periodEnd,
      periodType: generateForm.periodType,
    })

    const reportId = resp.data?.data?.id
    currentGeneratingReportId.value = reportId
    generateFormVisible.value = false

    startProgressPolling(reportId)
  } catch (e) {
    generating.value = false
    currentGeneratingReportId.value = null
  }
}

function startProgressPolling(reportId) {
  if (progressPolling.value) {
    clearInterval(progressPolling.value)
  }

  let pollingCount = 0
  const maxPolling = 120

  progressPolling.value = setInterval(async () => {
    pollingCount++
    if (pollingCount > maxPolling) {
      stopProgressPolling()
      ElNotification({ title: '提示', message: '报告生成超时，请稍后查看结果', type: 'warning', duration: 3000 })
      return
    }

    try {
      const resp = await api.get(`/reports/${reportId}/progress`)
      const progress = resp.data?.data

      currentProgress.status = progress?.status || ''
      currentProgress.progress = progress?.progress || 0
      currentProgress.progressMessage = progress?.progressMessage || ''
      currentProgress.errorMessage = progress?.errorMessage || ''

      if (progress?.status === '已完成') {
        stopProgressPolling()
        generating.value = false
        ElNotification({ title: '成功', message: '报告生成完成！', type: 'success', duration: 2000 })
        await loadReports()
        await viewReport(reportId)
      } else if (progress?.status === '失败') {
        stopProgressPolling()
        generating.value = false
        ElNotification({ title: '失败', message: progress?.errorMessage || '报告生成失败', type: 'error', duration: 3000 })
        await loadReports()
      }
    } catch (e) {
      stopProgressPolling()
      generating.value = false
    }
  }, 1000)
}

function stopProgressPolling() {
  if (progressPolling.value) {
    clearInterval(progressPolling.value)
    progressPolling.value = null
  }
  currentGeneratingReportId.value = null
}

async function viewReport(reportId) {
  try {
    const resp = await api.get(`/reports/${reportId}`)
    currentReport.value = resp.data?.data
    previewVisible.value = true
  } catch (e) {}
}

async function archiveReport(row) {
  if (row.status !== '已完成') {
    ElNotification({ title: '提示', message: '报告尚未完成，无法归档', type: 'warning', duration: 2000 })
    return
  }

  try {
    await ElMessageBox.confirm('确认归档该报告？归档后学生可在其端查看。', '归档确认', { type: 'warning' })
    await api.post(`/reports/${row.id}/archive`)
    ElNotification({ title: '成功', message: '报告已归档', type: 'success', duration: 2000 })
    await loadReports()
  } catch (e) {}
}

async function deleteReport(row) {
  try {
    await ElMessageBox.confirm('确认删除该报告？此操作不可恢复。', '删除确认', { type: 'warning' })
    await api.delete(`/reports/${row.id}`)
    ElNotification({ title: '成功', message: '报告已删除', type: 'success', duration: 2000 })
    await loadReports()
  } catch (e) {}
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

function openPreviewInNewTab() {
  if (!currentReport.value?.id) return
  const routeData = router.resolve({
    path: `/report-preview/${currentReport.value.id}`,
  })
  window.open(routeData.href, '_blank')
}

onMounted(() => {
  loadStudents()
  loadReports()
})
</script>

<template>
  <div class="admin-reports-page">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard class="panel-card header-card">
          <div class="header-main">
            <div>
              <div class="page-title">学情报告管理（管理员端）</div>
              <div class="page-subtitle">生成、管理和归档学生学情分析报告</div>
            </div>
            <div class="header-actions">
              <ElButton :icon="Refresh" plain :loading="loading" @click="loadReports">刷新列表</ElButton>
              <ElButton type="primary" :icon="Plus" @click="openGenerateDialog" :disabled="generating">
                生成新报告
              </ElButton>
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" class="section-row">
      <ElCol :span="24">
        <ElCard class="panel-card">
          <div class="filter-bar">
            <div class="filter-items">
              <ElSelect
                v-model="filters.userId"
                placeholder="选择学生"
                clearable
                style="width: 220px"
                @change="loadReports"
              >
                <ElOption
                  v-for="student in studentOptions"
                  :key="student.id"
                  :label="student.label"
                  :value="student.id"
                />
              </ElSelect>
              <ElSelect
                v-model="filters.status"
                placeholder="报告状态"
                clearable
                style="width: 150px"
                @change="loadReports"
              >
                <ElOption v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </ElSelect>
              <ElDatePicker
                v-model="filters.periodStart"
                type="date"
                placeholder="开始日期"
                value-format="YYYY-MM-DD"
                style="width: 150px"
                @change="loadReports"
              />
              <ElDatePicker
                v-model="filters.periodEnd"
                type="date"
                placeholder="结束日期"
                value-format="YYYY-MM-DD"
                style="width: 150px"
                @change="loadReports"
              />
            </div>
          </div>

          <ElSkeleton :loading="loading" animated>
            <div class="table-wrapper">
              <ElTable
                :data="reportList"
                size="default"
                class="data-table"
                empty-text="暂无报告数据"
              >
                <ElTableColumn prop="id" label="ID" width="70" />
                <ElTableColumn label="学生" min-width="150">
                  <template #default="{ row }">
                    <div class="student-info">
                      <span class="student-name">{{ row.userName || '-' }}</span>
                      <el-tag size="small" type="info">{{ row.userStage || '-' }}</el-tag>
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="周期" min-width="200">
                  <template #default="{ row }">
                    <div class="period-info">
                      <el-tag size="small" effect="plain">{{ row.periodType }}</el-tag>
                      <span class="period-text">{{ row.periodStart }} ~ {{ row.periodEnd }}</span>
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag :type="getStatusTagType(row.status)" size="small">
                      {{ row.status }}
                    </el-tag>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="评级" width="100">
                  <template #default="{ row }">
                    <el-tag
                      v-if="row.overallLevel"
                      :type="getLevelTagType(row.overallLevel)"
                      size="small"
                      effect="dark"
                    >
                      {{ row.overallLevel }}
                    </el-tag>
                    <span v-else class="text-muted">-</span>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="完成率" width="90">
                  <template #default="{ row }">
                    <span v-if="row.completionRate !== undefined">{{ row.completionRate }}%</span>
                    <span v-else class="text-muted">-</span>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="是否归档" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.archived ? 'success' : 'info'" size="small">
                      {{ row.archived ? '已归档' : '未归档' }}
                    </el-tag>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="生成人" width="100">
                  <template #default="{ row }">
                    {{ row.generatedByName || '-' }}
                  </template>
                </ElTableColumn>
                <ElTableColumn label="生成时间" width="170">
                  <template #default="{ row }">
                    {{ formatDateTime(row.generatedAt) }}
                  </template>
                </ElTableColumn>
                <ElTableColumn label="操作" width="260" fixed="right">
                  <template #default="{ row }">
                    <div class="actions-row">
                      <ElButton
                        size="small"
                        type="primary"
                        plain
                        :icon="View"
                        :disabled="row.status !== '已完成'"
                        @click="viewReport(row.id)"
                      >
                        查看
                      </ElButton>
                      <ElButton
                        size="small"
                        :icon="FolderOpened"
                        :disabled="row.status !== '已完成' || row.archived"
                        @click="archiveReport(row)"
                      >
                        归档
                      </ElButton>
                      <ElButton
                        size="small"
                        type="danger"
                        plain
                        :icon="Delete"
                        @click="deleteReport(row)"
                      >
                        删除
                      </ElButton>
                    </div>
                  </template>
                </ElTableColumn>
              </ElTable>

              <div class="pagination-wrapper">
                <el-pagination
                  v-model:current-page="page"
                  v-model:page-size="pageSize"
                  :page-sizes="[10, 20, 30, 50]"
                  :total="total"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="handleSizeChange"
                  @current-change="handlePageChange"
                />
              </div>
            </div>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElDialog
      v-model="generateFormVisible"
      title="生成学情报告"
      width="560px"
      :close-on-click-modal="false"
    >
      <ElForm label-width="90px">
        <ElFormItem label="选择学生" required>
          <ElSelect
            v-model="generateForm.userId"
            placeholder="请选择学生"
            filterable
            style="width: 100%"
          >
            <ElOption
              v-for="student in studentOptions"
              :key="student.id"
              :label="student.label"
              :value="student.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="周期类型">
          <div class="quick-period-buttons">
            <ElButton
              v-for="opt in periodTypeOptions"
              :key="opt.value"
              :type="generateForm.periodType === opt.value ? 'primary' : 'default'"
              size="small"
              @click="generateForm.periodType = opt.value; setQuickPeriod(opt.value)"
            >
              {{ opt.label }}
            </ElButton>
          </div>
        </ElFormItem>
        <ElFormItem label="开始日期" required>
          <ElDatePicker
            v-model="generateForm.periodStart"
            type="date"
            placeholder="选择开始日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </ElFormItem>
        <ElFormItem label="结束日期" required>
          <ElDatePicker
            v-model="generateForm.periodEnd"
            type="date"
            placeholder="选择结束日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="generateFormVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="generating" @click="generateReport">
          开始生成
        </ElButton>
      </template>
    </ElDialog>

    <ElDialog
      v-model="generating"
      title="正在生成报告"
      width="480px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
    >
      <div class="generating-content">
        <div class="generating-icon">
          <el-icon :size="48" color="#3b82f6"><Clock /></el-icon>
        </div>
        <div class="generating-message">{{ currentProgress.progressMessage }}</div>
        <ElProgress
          :percentage="currentProgress.progress"
          :status="currentProgress.status === '失败' ? 'exception' : ''"
          :stroke-width="12"
        />
        <div class="generating-tip">请勿关闭此页面，报告生成需要几秒钟...</div>
      </div>
    </ElDialog>

    <ElDialog
      v-model="previewVisible"
      title="报告预览"
      width="95%"
      :close-on-click-modal="false"
      class="report-preview-dialog"
    >
      <template #header>
        <div class="dialog-header">
          <span>{{ currentReport?.title }}</span>
          <div class="dialog-header-actions">
            <ElButton size="small" @click="openPreviewInNewTab">
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
.admin-reports-page {
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

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-bar {
  margin-bottom: 16px;
}

.filter-items {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.table-wrapper {
  min-height: 400px;
}

.data-table :deep(.el-table__cell) {
  padding-top: 10px;
  padding-bottom: 10px;
}

.student-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.student-name {
  font-weight: 500;
  color: #1e293b;
}

.period-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.period-text {
  font-size: 13px;
  color: #475569;
}

.text-muted {
  color: #94a3b8;
}

.actions-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.quick-period-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.generating-content {
  text-align: center;
  padding: 20px 0;
}

.generating-icon {
  margin-bottom: 16px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.generating-message {
  font-size: 15px;
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 16px;
}

.generating-tip {
  margin-top: 12px;
  font-size: 12px;
  color: #94a3b8;
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

@media (max-width: 992px) {
  .admin-reports-page {
    padding: 12px 12px 20px;
  }
}
</style>
