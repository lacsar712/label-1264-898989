<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElButton, ElSkeleton, ElEmpty } from 'element-plus'
import { ArrowLeft, Printer } from '@element-plus/icons-vue'
import { api } from '../lib/api'
import ReportPreview from '../components/ReportPreview.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const report = ref(null)
const error = ref(false)
const reportPreviewRef = ref(null)

const reportId = computed(() => route.params.reportId)

async function loadReport() {
  if (!reportId.value) {
    error.value = true
    loading.value = false
    return
  }

  try {
    const resp = await api.get(`/reports/${reportId.value}`)
    report.value = resp.data?.data
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.back()
}

function handlePrint() {
  reportPreviewRef.value?.handlePrint()
}

onMounted(() => {
  loadReport()
})
</script>

<template>
  <div class="report-preview-page">
    <div class="preview-toolbar">
      <ElButton :icon="ArrowLeft" @click="goBack">
        返回
      </ElButton>
      <div class="toolbar-title">
          学情报告预览
        </div>
      <ElButton type="primary" :icon="Printer" :disabled="!report" @click="handlePrint">
        打印报告
      </ElButton>
    </div>

    <div class="preview-content">
      <ElSkeleton v-if="loading" :loading="true" animated>
        <div style="height: 600px;"></div>
      </ElSkeleton>

      <ElEmpty
        v-else-if="error"
        description="报告不存在或您无权访问"
        class="empty-state"
      />

      <ReportPreview
        v-else-if="report"
        ref="reportPreviewRef"
        :report="report"
      />
    </div>
  </div>
</template>

<style scoped>
.report-preview-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f1f5f9;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
  gap: 12px;
}

.toolbar-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  flex: 1;
  text-align: center;
}

.preview-content {
  flex: 1;
  overflow-y: auto;
}

.empty-state {
  padding: 60px 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
