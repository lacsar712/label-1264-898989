<script setup>
import { computed, onMounted, ref, nextTick } from 'vue'
import { ElButton } from 'element-plus'
import { Printer } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import EChart from './EChart.vue'
import ReportPrintTemplate from './ReportPrintTemplate.vue'

const props = defineProps({
  report: { type: Object, required: true },
})

const emit = defineEmits(['close'])

const printContentRef = ref(null)

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getLevelColor(level) {
  const colors = {
    '优秀': '#10b981',
    '良好': '#3b82f6',
    '一般': '#f59e0b',
    '需努力': '#ef4444',
  }
  return colors[level] || '#64748b'
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

function getTrendIcon(change) {
  if (change > 0) return '↑'
  if (change < 0) return '↓'
  return '→'
}

function getTrendColor(change, isPositiveGood = true) {
  if (change === 0) return '#64748b'
  const positive = isPositiveGood ? change > 0 : change < 0
  return positive ? '#10b981' : '#ef4444'
}

const durationChartOption = computed(() => {
  if (!props.report?.learningDurationTrend) return null
  const trend = props.report.learningDurationTrend
  return {
    tooltip: { trigger: 'axis' },
    grid: { top: 30, left: 50, right: 20, bottom: 60 },
    xAxis: {
      type: 'category',
      data: trend.dates?.map((d) => d.slice(5)) || [],
      axisLabel: { rotate: 45, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: '分钟',
      nameTextStyle: { fontSize: 12 },
    },
    series: [
      {
        name: '学习时长',
        type: 'line',
        smooth: true,
        data: trend.durations || [],
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
          ]),
        },
        lineStyle: { color: '#3b82f6', width: 2 },
        itemStyle: { color: '#3b82f6' },
      },
    ],
  }
})

const completionChartOption = computed(() => {
  if (!props.report?.subjectCompletion) return null
  const data = props.report.subjectCompletion
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 30, left: 50, right: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: data.subjects?.map((s) => s.subject) || [],
      axisLabel: { fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      name: '完成率(%)',
      max: 100,
      nameTextStyle: { fontSize: 12 },
    },
    series: [
      {
        name: '完成率',
        type: 'bar',
        data: data.subjects?.map((s) => s.completionRate) || [],
        itemStyle: {
          color: (params) => {
            const v = params.value
            if (v >= 80) return '#10b981'
            if (v >= 60) return '#3b82f6'
            if (v >= 40) return '#f59e0b'
            return '#ef4444'
          },
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: '50%',
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%',
          fontSize: 12,
          fontWeight: 600,
        },
      },
    ],
  }
})

const wrongQuestionChartOption = computed(() => {
  if (!props.report?.wrongQuestionDistribution) return null
  const data = props.report.wrongQuestionDistribution
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, itemWidth: 14, itemHeight: 14, textStyle: { fontSize: 12 } },
    series: [
      {
        name: '掌握程度',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, fontSize: 12, formatter: '{b}: {c}道 ({d}%)' },
        data: [
          { value: data.masteryBreakdown?.find((m) => m.level === '低')?.count || 0, name: '低掌握', itemStyle: { color: '#ef4444' } },
          { value: data.masteryBreakdown?.find((m) => m.level === '中')?.count || 0, name: '中掌握', itemStyle: { color: '#f59e0b' } },
          { value: data.masteryBreakdown?.find((m) => m.level === '高')?.count || 0, name: '高掌握', itemStyle: { color: '#10b981' } },
        ],
      },
    ],
  }
})

const subjectWrongChartOption = computed(() => {
  if (!props.report?.wrongQuestionDistribution) return null
  const data = props.report.wrongQuestionDistribution
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 30, left: 50, right: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: data.subjectBreakdown?.map((s) => s.subject) || [],
      axisLabel: { fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      name: '错题数',
      nameTextStyle: { fontSize: 12 },
    },
    series: [
      {
        name: '错题数',
        type: 'bar',
        data: data.subjectBreakdown?.map((s) => s.count) || [],
        itemStyle: {
          color: '#f97316',
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: '50%',
        label: { show: true, position: 'top', fontSize: 12, fontWeight: 600 },
      },
    ],
  }
})

const hitRateChartOption = computed(() => {
  if (!props.report?.recommendationHitRate) return null
  const data = props.report.recommendationHitRate
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 30, left: 50, right: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: data.subjectBreakdown?.map((s) => s.subject) || [],
      axisLabel: { fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      name: '命中率(%)',
      max: 100,
      nameTextStyle: { fontSize: 12 },
    },
    series: [
      {
        name: '命中率',
        type: 'bar',
        data: data.subjectBreakdown?.map((s) => s.hitRate) || [],
        itemStyle: {
          color: '#8b5cf6',
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: '50%',
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%',
          fontSize: 12,
          fontWeight: 600,
        },
      },
    ],
  }
})

async function handlePrint() {
  await nextTick()

  const canvases = printContentRef.value?.querySelectorAll('canvas') || []
  canvases.forEach((canvas) => {
    const dataUrl = canvas.toDataURL('image/png')
    const img = document.createElement('img')
    img.src = dataUrl
    img.style.width = canvas.style.width || canvas.width + 'px'
    img.style.height = canvas.style.height || canvas.height + 'px'
    img.style.display = 'block'
    canvas.parentNode.replaceChild(img, canvas)
  })

  const styleHtml = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; }
      @media print {
        @page { size: A4; margin: 15mm 10mm; }
        .report-section { page-break-inside: avoid; }
      }
    </style>
  `

  const containerContent = printContentRef.value?.outerHTML || ''
  
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('请允许弹窗以打印报告')
    return
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${props.report?.title || '学情报告'}</title>
      ${styleHtml}
    </head>
    <body>
      ${containerContent}
    </body>
    </html>
  `)

  printWindow.document.close()
  
  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
    setTimeout(() => {
      printWindow.close()
    }, 500)
  }, 800)
}

defineExpose({
  handlePrint,
})
</script>

<template>
  <div class="report-preview-container">
    <div class="preview-toolbar">
      <div class="toolbar-title">
        <span class="title-text">报告预览</span>
        <el-tag :type="getLevelTagType(report?.summary?.overallLevel)" size="large" effect="dark">
          综合评级：{{ report?.summary?.overallLevel || '-' }}
        </el-tag>
      </div>
      <div class="toolbar-actions">
        <ElButton type="primary" :icon="Printer" @click="handlePrint">
          打印报告
        </ElButton>
      </div>
    </div>

    <div class="preview-scroll">
      <div ref="printContentRef">
        <ReportPrintTemplate :report="report" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.report-preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f1f5f9;
}

.preview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.toolbar-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-text {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
}

.preview-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.preview-scroll :deep(.report-print-container) {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border-radius: 8px;
}

@media print {
  .preview-toolbar {
    display: none !important;
  }
}
</style>
