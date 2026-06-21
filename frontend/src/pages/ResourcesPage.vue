<script setup>
import { computed, ref, watch } from 'vue'
import {
  ElButton,
  ElCard,
  ElCol,
  ElInput,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElRow,
  ElSelect,
  ElSkeleton,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus'

import EChart from '../components/EChart.vue'
import { api } from '../lib/api'
import { usePageData } from '../lib/usePageData'

const { data, loading, refresh } = usePageData('/pages/resources')

const stackedOption = computed(() => {
  const rows = data.value?.resourceCategoryStacked || []
  const subjects = rows.map((r) => r.subject)
  const types = ['课程', '课件', '题库', '视频']
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 8, left: 'center' },
    grid: { top: 56, left: 44, right: 18, bottom: 28, containLabel: true },
    xAxis: { type: 'category', data: subjects },
    yAxis: { type: 'value' },
    series: types.map((t) => ({
      name: t,
      type: 'bar',
      stack: 'total',
      barWidth: 18,
      emphasis: { focus: 'series' },
      data: rows.map((r) => r[t] || 0),
    })),
  }
})

const wordCloudOption = computed(() => ({
  tooltip: { show: true },
  series: [
    {
      type: 'wordCloud',
      gridSize: 8,
      sizeRange: [12, 38],
      rotationRange: [-45, 45],
      shape: 'circle',
      textStyle: {
        color: () => {
          const colors = ['#2563eb', '#0ea5e9', '#14b8a6', '#8b5cf6', '#f59e0b', '#ef4444']
          return colors[Math.floor(Math.random() * colors.length)]
        },
      },
      data: (data.value?.tagWordCloud || []).map((x) => ({ name: x.name, value: x.value })),
    },
  ],
}))

const tagPieOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { top: 8, left: 'center' },
  series: [
    {
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['50%', '55%'],
      label: { formatter: '{b} {d}%' },
      labelLine: { length: 14, length2: 12 },
      data: (data.value?.tagPie || []).map((x) => ({ name: x.name, value: x.value })),
    },
  ],
}))

const favoriteTrendOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { top: 24, left: 44, right: 18, bottom: 28, containLabel: true },
  xAxis: { type: 'category', data: (data.value?.favoriteCompletionTrend7d || []).map((x) => x.date) },
  yAxis: { type: 'value', min: 0, max: 1 },
  series: [
    {
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 7,
      areaStyle: { opacity: 0.12 },
      data: (data.value?.favoriteCompletionTrend7d || []).map((x) => Number(x.completionRate || 0)),
    },
  ],
}))

const keyword = ref('')
const subject = ref('')
const difficulty = ref('')
const sortField = ref('updatedAt')
const sortOrder = ref('desc')
const page = ref(1)
const pageSize = ref(8)

const filteredSearchTable = computed(() => {
  const rows = data.value?.searchTable || []
  const kw = keyword.value.trim().toLowerCase()
  return rows.filter((r) => {
    if (subject.value && r.subject !== subject.value) return false
    if (difficulty.value && r.difficulty !== difficulty.value) return false
    if (!kw) return true
    return String(r.resourceId).toLowerCase().includes(kw) || String(r.name).toLowerCase().includes(kw)
  })
})

function difficultyRank(v) {
  if (v === '基础') return 1
  if (v === '提高') return 2
  if (v === '挑战') return 3
  return 0
}

const sortedSearchTable = computed(() => {
  const rows = filteredSearchTable.value.slice()
  const order = sortOrder.value === 'asc' ? 1 : -1
  rows.sort((a, b) => {
    if (sortField.value === 'heat') return (Number(a.heat || 0) - Number(b.heat || 0)) * order
    if (sortField.value === 'difficulty') return (difficultyRank(a.difficulty) - difficultyRank(b.difficulty)) * order
    if (sortField.value === 'resourceId') return String(a.resourceId || '').localeCompare(String(b.resourceId || '')) * order
    return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * order
  })
  return rows
})

watch([keyword, subject, difficulty, sortField, sortOrder, pageSize], () => {
  page.value = 1
})

const pagedSearchTable = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return sortedSearchTable.value.slice(start, start + pageSize.value)
})

async function unfavorite(row) {
  await api.delete(`/actions/user-resources/${row.id}`)
  await refresh()
}

async function moveToQueue(row) {
  await api.post(`/actions/user-resources/${row.id}/move-to-queue`)
  await refresh()
}

async function removeRow(row) {
  await ElMessageBox.confirm('确认删除该记录？', '删除确认', { type: 'warning' })
  await api.delete(`/actions/user-resources/${row.id}`)
  await refresh()
}
</script>

<template>
  <div style="padding: 16px 16px 22px">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px">
            <div>
              <div style="font-weight: 800">资源库模块</div>
              <div style="font-size: 12px; color: #64748b">检索 + 分类 + 管理</div>
            </div>
            <ElButton :loading="loading" @click="refresh">刷新</ElButton>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="14">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700">资源分类可视化（堆叠柱状图）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="stackedOption" :height="320" />
          </ElSkeleton>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :lg="10">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px">
            <div style="font-weight: 700">筛选结果表</div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end">
              <ElInput v-model="keyword" placeholder="搜索资源ID/名称" style="width: 160px" />
              <ElSelect v-model="subject" placeholder="学科" clearable style="width: 110px">
                <ElOption label="语文" value="语文" />
                <ElOption label="数学" value="数学" />
                <ElOption label="英语" value="英语" />
                <ElOption label="物理" value="物理" />
                <ElOption label="化学" value="化学" />
                <ElOption label="生物" value="生物" />
              </ElSelect>
              <ElSelect v-model="difficulty" placeholder="难度" clearable style="width: 110px">
                <ElOption label="基础" value="基础" />
                <ElOption label="提高" value="提高" />
                <ElOption label="挑战" value="挑战" />
              </ElSelect>
              <ElSelect v-model="sortField" placeholder="排序字段" style="width: 120px">
                <ElOption label="更新时间" value="updatedAt" />
                <ElOption label="热度" value="heat" />
                <ElOption label="难度" value="difficulty" />
                <ElOption label="资源ID" value="resourceId" />
              </ElSelect>
              <ElSelect v-model="sortOrder" placeholder="排序方向" style="width: 110px">
                <ElOption label="降序" value="desc" />
                <ElOption label="升序" value="asc" />
              </ElSelect>
            </div>
          </div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="280px">
              <ElTable :data="pagedSearchTable" size="small" style="width: 100%">
                <ElTableColumn prop="resourceId" label="资源ID" width="110" />
                <ElTableColumn prop="name" label="名称" min-width="180" />
                <ElTableColumn prop="subject" label="学科" width="70" />
                <ElTableColumn prop="difficulty" label="难度" width="70" />
                <ElTableColumn prop="heat" label="热度" width="70" />
                <ElTableColumn prop="updatedAt" label="更新时间" min-width="150" />
              </ElTable>
            </el-scrollbar>
            <div style="display: flex; justify-content: flex-end; padding-top: 8px">
              <ElPagination
                v-model:current-page="page"
                v-model:page-size="pageSize"
                :total="sortedSearchTable.length"
                :page-sizes="[8, 12, 20]"
                layout="total, sizes, prev, pager, next"
              />
            </div>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="12">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700">资源标签分析（词云）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="wordCloudOption" :height="320" />
          </ElSkeleton>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :lg="12">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700">高频标签占比（饼图）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="tagPieOption" :height="320" />
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="14">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700; margin-bottom: 10px">标签关联表</div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="320px">
              <ElTable :data="data?.tagRelationTable || []" size="small" style="width: 100%">
                <ElTableColumn prop="tagName" label="标签名称" min-width="140" />
                <ElTableColumn prop="resourceCount" label="关联资源数" width="110" />
                <ElTableColumn prop="stage" label="适配学段" width="90" />
                <ElTableColumn prop="recommendWeight" label="推荐权重" width="110">
                  <template #default="{ row }">
                    <ElTag type="success" effect="plain">{{ Number(row.recommendWeight).toFixed(3) }}</ElTag>
                  </template>
                </ElTableColumn>
              </ElTable>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :lg="10">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700">收藏资源学习完成率趋势</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="favoriteTrendOption" :height="180" />
          </ElSkeleton>
        </ElCard>

        <ElCard style="border-radius: 14px; margin-top: 16px">
          <div style="font-weight: 700; margin-bottom: 10px">我的收藏 / 待学（操作型表格）</div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="230px">
              <ElTable :data="data?.favoriteTable || []" size="small" style="width: 100%">
                <ElTableColumn prop="name" label="资源名称" min-width="160" />
                <ElTableColumn prop="favoritedAt" label="收藏时间" min-width="150" />
                <ElTableColumn prop="progressPercent" label="进度" width="70">
                  <template #default="{ row }">{{ row.progressPercent }}%</template>
                </ElTableColumn>
                <ElTableColumn prop="status" label="状态" width="70" />
                <ElTableColumn label="操作" width="230" fixed="right">
                  <template #default="{ row }">
                    <div style="display: flex; gap: 8px">
                      <ElButton size="small" @click="unfavorite(row)">取消收藏</ElButton>
                      <ElButton size="small" type="primary" plain @click="moveToQueue(row)">移至待学</ElButton>
                      <ElButton size="small" type="danger" plain @click="removeRow(row)">删除</ElButton>
                    </div>
                  </template>
                </ElTableColumn>
              </ElTable>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>
