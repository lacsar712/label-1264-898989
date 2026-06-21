<script setup>
import { computed, onMounted, onUnmounted, ref, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  report: { type: Object, required: true },
})

const durationChart = ref(null)
const completionChart = ref(null)
const hitRateChart = ref(null)
const wrongChart = ref(null)
const subjectWrongChart = ref(null)

let durationChartInstance = null
let completionChartInstance = null
let hitRateChartInstance = null
let wrongChartInstance = null
let subjectWrongChartInstance = null

function initChart(ref, option, instance) {
  if (!ref.value || !option) return null
  instance = echarts.init(ref.value)
  instance.setOption(option)
  return instance
}

function disposeCharts() {
  if (durationChartInstance) durationChartInstance.dispose()
  if (completionChartInstance) completionChartInstance.dispose()
  if (hitRateChartInstance) hitRateChartInstance.dispose()
  if (wrongChartInstance) wrongChartInstance.dispose()
  if (subjectWrongChartInstance) subjectWrongChartInstance.dispose()
}

onMounted(async () => {
  await nextTick()
  
  durationChartInstance = initChart(durationChart, durationChartOption.value, durationChartInstance)
  completionChartInstance = initChart(completionChart, completionChartOption.value, completionChartInstance)
  hitRateChartInstance = initChart(hitRateChart, hitRateChartOption.value, hitRateChartInstance)
  wrongChartInstance = initChart(wrongChart, wrongQuestionChartOption.value, wrongChartInstance)
  subjectWrongChartInstance = initChart(subjectWrongChart, subjectWrongChartOption.value, subjectWrongChartInstance)

  window.addEventListener('resize', handleResize)
})

function handleResize() {
  if (durationChartInstance) durationChartInstance.resize()
  if (completionChartInstance) completionChartInstance.resize()
  if (hitRateChartInstance) hitRateChartInstance.resize()
  if (wrongChartInstance) wrongChartInstance.resize()
  if (subjectWrongChartInstance) subjectWrongChartInstance.resize()
}

onUnmounted(() => {
  disposeCharts()
  window.removeEventListener('resize', handleResize)
})

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
      axisLabel: { rotate: 45, fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      name: '分钟',
      nameTextStyle: { fontSize: 10 },
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
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: '完成率(%)',
      max: 100,
      nameTextStyle: { fontSize: 10 },
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
          fontSize: 10,
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
    legend: { bottom: 0, itemWidth: 12, itemHeight: 12, textStyle: { fontSize: 10 } },
    series: [
      {
        name: '掌握程度',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, fontSize: 11, formatter: '{b}: {c}道 ({d}%)' },
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
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: '错题数',
      nameTextStyle: { fontSize: 10 },
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
        label: { show: true, position: 'top', fontSize: 10 },
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
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: '命中率(%)',
      max: 100,
      nameTextStyle: { fontSize: 10 },
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
          fontSize: 10,
        },
      },
    ],
  }
})
</script>

<template>
  <div class="report-print-container">
    <div class="report-header">
      <div class="report-header-top">
        <h1 class="report-title">学情分析报告</h1>
        <div class="report-meta">
          <div class="meta-item">
            <span class="meta-label">报告编号：</span>
            <span class="meta-value">#{{ report?.id }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">生成时间：</span>
            <span class="meta-value">{{ formatDateTime(report?.generatedAt) }}</span>
          </div>
        </div>
      </div>
      <div class="report-header-info">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">学生姓名</span>
            <span class="info-value">{{ report?.userName || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">所属学段</span>
            <span class="info-value">{{ report?.userStage || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">统计周期</span>
            <span class="info-value">{{ formatDate(report?.periodStart) }} 至 {{ formatDate(report?.periodEnd) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">周期类型</span>
            <span class="info-value">{{ report?.periodType || '-' }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="report-summary">
      <h2 class="section-title">综合评估</h2>
      <div class="summary-overall">
        <div class="overall-level" :style="{ borderColor: getLevelColor(report?.summary?.overallLevel) }">
          <div class="level-label">综合评级</div>
          <div class="level-value" :style="{ color: getLevelColor(report?.summary?.overallLevel) }">
            {{ report?.summary?.overallLevel || '-' }}
          </div>
        </div>
        <div class="summary-stats">
          <div class="stat-item">
            <div class="stat-value">{{ report?.summary?.totalStudyHours || 0 }}<span class="stat-unit">小时</span></div>
            <div class="stat-label">累计学习时长</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ report?.summary?.avgDailyMinutes || 0 }}<span class="stat-unit">分钟</span></div>
            <div class="stat-label">日均学习时长</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ report?.summary?.completionRate || 0 }}<span class="stat-unit">%</span></div>
            <div class="stat-label">任务完成率</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ report?.summary?.hitRate || 0 }}<span class="stat-unit">%</span></div>
            <div class="stat-label">推荐命中率</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ report?.summary?.totalWrongQuestions || 0 }}<span class="stat-unit">道</span></div>
            <div class="stat-label">累计错题</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ report?.summary?.correctionRate || 0 }}<span class="stat-unit">%</span></div>
            <div class="stat-label">错题订正率</div>
          </div>
        </div>
      </div>

      <div class="summary-best-worst">
        <div class="best-worst-card best">
          <div class="bw-label">优势学科</div>
          <div class="bw-subject">{{ report?.summary?.bestSubject || '-' }}</div>
          <div class="bw-rate">完成率 {{ report?.summary?.bestSubjectRate || 0 }}%</div>
        </div>
        <div class="best-worst-card worst">
          <div class="bw-label">待提升学科</div>
          <div class="bw-subject">{{ report?.summary?.weakSubject || '-' }}</div>
          <div class="bw-rate">完成率 {{ report?.summary?.weakSubjectRate || 0 }}%</div>
        </div>
      </div>

      <div v-if="report?.summary?.highlights?.length > 0" class="summary-section">
        <h3 class="subsection-title highlight">🌟 亮点表现</h3>
        <ul class="summary-list">
          <li v-for="(item, idx) in report.summary.highlights" :key="'h-' + idx">{{ item }}</li>
        </ul>
      </div>

      <div v-if="report?.summary?.improvements?.length > 0" class="summary-section">
        <h3 class="subsection-title improvement">📈 进步提升</h3>
        <ul class="summary-list">
          <li v-for="(item, idx) in report.summary.improvements" :key="'i-' + idx">{{ item }}</li>
        </ul>
      </div>

      <div v-if="report?.summary?.concerns?.length > 0" class="summary-section">
        <h3 class="subsection-title concern">⚠️ 关注要点</h3>
        <ul class="summary-list">
          <li v-for="(item, idx) in report.summary.concerns" :key="'c-' + idx">{{ item }}</li>
        </ul>
      </div>
    </div>

    <div class="report-section">
      <h2 class="section-title">一、学习时长走势</h2>
      <div class="section-stats">
        <div class="mini-stat">
          <span class="mini-label">总计</span>
          <span class="mini-value">{{ report?.learningDurationTrend?.totalHours || 0 }} 小时</span>
        </div>
        <div class="mini-stat">
          <span class="mini-label">日均</span>
          <span class="mini-value">{{ report?.learningDurationTrend?.avgMinutes || 0 }} 分钟</span>
        </div>
        <div class="mini-stat">
          <span class="mini-label">最高</span>
          <span class="mini-value">{{ report?.learningDurationTrend?.maxMinutes || 0 }} 分钟</span>
        </div>
      </div>
      <div class="chart-container">
        <div v-if="durationChartOption" ref="durationChart" class="chart"></div>
      </div>
    </div>

    <div class="report-section">
      <h2 class="section-title">二、各科完成率</h2>
      <div class="section-stats">
        <div class="mini-stat">
          <span class="mini-label">总任务数</span>
          <span class="mini-value">{{ report?.subjectCompletion?.overall?.totalTasks || 0 }}</span>
        </div>
        <div class="mini-stat">
          <span class="mini-label">已完成</span>
          <span class="mini-value">{{ report?.subjectCompletion?.overall?.completedTasks || 0 }}</span>
        </div>
        <div class="mini-stat">
          <span class="mini-label">总体完成率</span>
          <span class="mini-value">{{ report?.subjectCompletion?.overall?.completionRate || 0 }}%</span>
        </div>
      </div>
      <div class="chart-container">
        <div v-if="completionChartOption" ref="completionChart" class="chart"></div>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>学科</th>
            <th>总任务</th>
            <th>已完成</th>
            <th>完成率</th>
            <th>学习时长</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="subject in report?.subjectCompletion?.subjects" :key="subject.subject">
            <td>{{ subject.subject }}</td>
            <td>{{ subject.totalTasks }}</td>
            <td>{{ subject.completedTasks }}</td>
            <td>
              <span class="rate-badge" :style="{ background: subject.completionRate >= 80 ? '#10b981' : subject.completionRate >= 60 ? '#3b82f6' : subject.completionRate >= 40 ? '#f59e0b' : '#ef4444' }">
                {{ subject.completionRate }}%
              </span>
            </td>
            <td>{{ subject.studyHours }} 小时</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="report-section">
      <h2 class="section-title">三、推荐命中率</h2>
      <div class="section-stats">
        <div class="mini-stat">
          <span class="mini-label">推荐总数</span>
          <span class="mini-value">{{ report?.recommendationHitRate?.totalRecommendations || 0 }}</span>
        </div>
        <div class="mini-stat">
          <span class="mini-label">点击数</span>
          <span class="mini-value">{{ report?.recommendationHitRate?.clickedCount || 0 }}</span>
        </div>
        <div class="mini-stat">
          <span class="mini-label">命中率</span>
          <span class="mini-value">{{ report?.recommendationHitRate?.hitRate || 0 }}%</span>
        </div>
        <div class="mini-stat">
          <span class="mini-label">平均匹配度</span>
          <span class="mini-value">{{ report?.recommendationHitRate?.avgMatchScore || 0 }}</span>
        </div>
      </div>
      <div class="chart-container">
        <div v-if="hitRateChartOption" ref="hitRateChart" class="chart"></div>
      </div>
    </div>

    <div class="report-section">
      <h2 class="section-title">四、错题分布</h2>
      <div class="section-stats">
        <div class="mini-stat">
          <span class="mini-label">错题总数</span>
          <span class="mini-value">{{ report?.wrongQuestionDistribution?.totalWrongQuestions || 0 }}</span>
        </div>
        <div class="mini-stat">
          <span class="mini-label">已订正</span>
          <span class="mini-value">{{ report?.wrongQuestionDistribution?.correctedCount || 0 }}</span>
        </div>
        <div class="mini-stat">
          <span class="mini-label">订正率</span>
          <span class="mini-value">{{ report?.wrongQuestionDistribution?.correctionRate || 0 }}%</span>
        </div>
      </div>
      <div class="charts-row">
        <div class="chart-container half">
          <h3 class="chart-title">掌握程度分布</h3>
          <div v-if="wrongQuestionChartOption" ref="wrongChart" class="chart small"></div>
        </div>
        <div class="chart-container half">
          <h3 class="chart-title">学科错题分布</h3>
          <div v-if="subjectWrongChartOption" ref="subjectWrongChart" class="chart small"></div>
        </div>
      </div>

      <div v-if="report?.wrongQuestionDistribution?.topKnowledgePoints?.length > 0" class="knowledge-points">
        <h3 class="subsection-title">高频错题知识点 Top 10</h3>
        <div class="kp-list">
          <div v-for="(kp, idx) in report.wrongQuestionDistribution.topKnowledgePoints" :key="idx" class="kp-item">
            <span class="kp-rank" :style="{ background: idx < 3 ? '#ef4444' : idx < 6 ? '#f59e0b' : '#3b82f6' }">{{ idx + 1 }}</span>
            <span class="kp-name">{{ kp.name }}</span>
            <span class="kp-count">{{ kp.count }} 次</span>
          </div>
        </div>
      </div>
    </div>

    <div class="report-section">
      <h2 class="section-title">五、周期对比分析</h2>
      <div class="comparison-note">
        <span class="note-label">对比周期：</span>
        <span class="note-value">{{ formatDate(report?.periodComparison?.previousPeriod?.start) }} 至 {{ formatDate(report?.periodComparison?.previousPeriod?.end) }}</span>
      </div>

      <div class="comparison-grid">
        <div v-for="(metric, key) in report?.periodComparison?.metrics" :key="key" class="comparison-item">
          <div class="comparison-label">{{
            key === 'totalMinutes' ? '学习时长' :
            key === 'completionRate' ? '任务完成率' :
            key === 'hitRate' ? '推荐命中率' : '错题数量'
          }}</div>
          <div class="comparison-values">
            <div class="comp-prev">
              <span class="comp-label">上周期</span>
              <span class="comp-value">{{ metric.previous }} {{ metric.unit }}</span>
            </div>
            <div class="comp-arrow" :style="{ color: getTrendColor(metric.change, key !== 'wrongQuestions') }">
              {{ getTrendIcon(metric.change) }}
            </div>
            <div class="comp-curr">
              <span class="comp-label">本周期</span>
              <span class="comp-value">{{ metric.current }} {{ metric.unit }}</span>
            </div>
          </div>
          <div class="comparison-change" :style="{ color: getTrendColor(metric.change, key !== 'wrongQuestions') }">
            {{ metric.change > 0 ? '+' : '' }}{{ metric.change }}{{ key === 'totalMinutes' || key === 'wrongQuestions' ? '%' : '个百分点' }}
          </div>
        </div>
      </div>

      <table class="data-table mt-20">
        <thead>
          <tr>
            <th>学科</th>
            <th>上周期完成率</th>
            <th>本周期完成率</th>
            <th>变化</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="subject in report?.periodComparison?.subjectComparisons" :key="subject.subject">
            <td>{{ subject.subject }}</td>
            <td>{{ subject.previousRate }}%</td>
            <td>{{ subject.currentRate }}%</td>
            <td>
              <span :style="{ color: getTrendColor(subject.change) }">
                {{ subject.change > 0 ? '+' : '' }}{{ subject.change }} 个百分点
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="report-footer">
      <div class="footer-note">本报告由智能教学资源推荐系统自动生成</div>
      <div class="footer-signature">
        <div class="sig-item">
          <span class="sig-label">生成人：</span>
          <span class="sig-value">{{ report?.generatedByName || '系统' }}</span>
        </div>
        <div class="sig-item">
          <span class="sig-label">生成日期：</span>
          <span class="sig-value">{{ formatDate(report?.generatedAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.report-print-container {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 30px;
  background: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  color: #1e293b;
  font-size: 14px;
  line-height: 1.6;
}

.report-header {
  border-bottom: 3px solid #2563eb;
  padding-bottom: 24px;
  margin-bottom: 32px;
}

.report-header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 20px;
}

.report-title {
  font-size: 28px;
  font-weight: 800;
  color: #1e40af;
  margin: 0;
  letter-spacing: 2px;
}

.report-meta {
  text-align: right;
  font-size: 12px;
  color: #64748b;
}

.meta-item {
  margin-bottom: 4px;
}

.meta-label {
  color: #94a3b8;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  background: #f8fafc;
  padding: 16px 20px;
  border-radius: 8px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: #64748b;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e40af;
  margin: 0 0 16px 0;
  padding-left: 12px;
  border-left: 4px solid #2563eb;
}

.subsection-title {
  font-size: 14px;
  font-weight: 600;
  margin: 16px 0 8px 0;
}

.subsection-title.highlight { color: #0369a1; }
.subsection-title.improvement { color: #047857; }
.subsection-title.concern { color: #b91c1c; }

.report-summary {
  margin-bottom: 40px;
}

.summary-overall {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.overall-level {
  flex-shrink: 0;
  width: 140px;
  height: 140px;
  border: 4px solid;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
}

.level-label {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 8px;
}

.level-value {
  font-size: 36px;
  font-weight: 800;
}

.summary-stats {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-item {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}

.stat-unit {
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  margin-left: 4px;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

.summary-best-worst {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.best-worst-card {
  flex: 1;
  padding: 16px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.best-worst-card.best {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border: 1px solid #86efac;
}

.best-worst-card.worst {
  background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
  border: 1px solid #fca5a5;
}

.bw-label {
  font-size: 12px;
  color: #64748b;
}

.bw-subject {
  font-size: 20px;
  font-weight: 700;
  margin: 4px 0;
}

.bw-rate {
  font-size: 13px;
  color: #475569;
}

.summary-list {
  margin: 0;
  padding-left: 20px;
}

.summary-list li {
  margin-bottom: 6px;
  font-size: 14px;
}

.report-section {
  margin-bottom: 40px;
  page-break-inside: avoid;
}

.section-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.mini-stat {
  background: #f1f5f9;
  padding: 10px 16px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mini-label {
  font-size: 12px;
  color: #64748b;
}

.mini-value {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.chart-container {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
}

.chart-container.half {
  width: calc(50% - 8px);
}

.charts-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.chart {
  width: 100%;
  height: 300px;
}

.chart.small {
  height: 250px;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #334155;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
  font-size: 13px;
}

.data-table th {
  background: #f1f5f9;
  padding: 10px 12px;
  text-align: left;
  font-weight: 600;
  color: #334155;
  border-bottom: 2px solid #e2e8f0;
}

.data-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
}

.data-table tr:hover {
  background: #f8fafc;
}

.rate-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.knowledge-points {
  margin-top: 20px;
}

.kp-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.kp-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
}

.kp-rank {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.kp-name {
  flex: 1;
  font-size: 13px;
}

.kp-count {
  font-size: 12px;
  color: #ef4444;
  font-weight: 600;
}

.comparison-note {
  background: #eff6ff;
  padding: 10px 16px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 13px;
}

.note-label {
  color: #1e40af;
  font-weight: 600;
}

.note-value {
  color: #334155;
}

.comparison-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.comparison-item {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.comparison-label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 10px;
}

.comparison-values {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.comp-prev, .comp-curr {
  flex: 1;
  text-align: center;
}

.comp-label {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 2px;
}

.comp-value {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.comp-arrow {
  font-size: 20px;
  font-weight: 700;
}

.comparison-change {
  text-align: center;
  font-size: 14px;
  font-weight: 600;
}

.report-footer {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

.footer-note {
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 16px;
}

.footer-signature {
  display: flex;
  justify-content: flex-end;
  gap: 32px;
  font-size: 13px;
}

.sig-label {
  color: #64748b;
}

.sig-value {
  color: #1e293b;
  font-weight: 500;
}

.mt-20 {
  margin-top: 20px;
}

@media print {
  .report-print-container {
    padding: 0;
    max-width: none;
  }

  .report-section {
    page-break-inside: avoid;
  }

  @page {
    size: A4;
    margin: 15mm 10mm;
  }
}
</style>
