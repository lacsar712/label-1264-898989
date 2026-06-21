<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  ElButton,
  ElCard,
  ElCol,
  ElDialog,
  ElMessage,
  ElOption,
  ElRow,
  ElSelect,
  ElSkeleton,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus'

import EChart from '../components/EChart.vue'
import PomodoroTimer from '../components/PomodoroTimer.vue'
import { api } from '../lib/api'
import { usePageData } from '../lib/usePageData'

const { data, loading, refresh } = usePageData('/pages/home')

const profileDonutOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { top: 8, left: 'center' },
  series: [
    {
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '55%'],
      avoidLabelOverlap: true,
      label: { show: true, formatter: '{b}  {d}%' },
      labelLine: { length: 14, length2: 12 },
      data: (data.value?.profileDonut || []).map((x) => ({ name: x.name, value: x.value })),
    },
  ],
}))

const trendOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { top: 8, left: 'center' },
  grid: { top: 56, left: 44, right: 18, bottom: 28, containLabel: true },
  xAxis: { type: 'category', data: (data.value?.recommendTrend7d || []).map((x) => x.date) },
  yAxis: [
    { type: 'value', name: '点击', min: 0 },
    { type: 'value', name: '完成率', min: 0, max: 1 },
  ],
  series: [
    {
      name: '点击量',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 7,
      data: (data.value?.recommendTrend7d || []).map((x) => x.clickCount),
    },
    {
      name: '完成率',
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      symbol: 'diamond',
      symbolSize: 7,
      data: (data.value?.recommendTrend7d || []).map((x) => Number(x.completionRate || 0)),
    },
  ],
}))

const miniBarOption = computed(() => ({
  grid: { top: 18, left: 10, right: 10, bottom: 10, containLabel: true },
  xAxis: {
    type: 'category',
    axisLabel: { show: false },
    axisTick: { show: false },
    axisLine: { show: false },
    data: (data.value?.weeklySummaryTable || []).map((x) => x.date.slice(5)),
  },
  yAxis: { type: 'value', axisLabel: { show: false }, splitLine: { show: false } },
  series: [
    {
      type: 'bar',
      barWidth: 10,
      itemStyle: { borderRadius: 6, color: '#2563eb' },
      data: (data.value?.weeklySummaryTable || []).map((x) => x.studyMinutes),
    },
  ],
}))

const folders = ref([])
const favoriteDialog = ref(false)
const favoritingRecId = ref(null)
const selectedFolderId = ref(null)

async function loadFolders() {
  try {
    const resp = await api.get('/actions/favorite-folders')
    folders.value = resp.data?.data || []
  } catch (e) {
    folders.value = []
  }
}

onMounted(loadFolders)

async function doLearn(row) {
  await api.post(`/actions/recommendations/${row.recommendationId}/learn`)
  await refresh()
}

function openFavoriteDialog(row) {
  favoritingRecId.value = row.recommendationId
  selectedFolderId.value = folders.value.find((f) => f.isDefault)?.id || null
  favoriteDialog.value = true
}

async function confirmFavorite() {
  if (!favoritingRecId.value) return
  await api.post(`/actions/recommendations/${favoritingRecId.value}/favorite`, {
    folderId: selectedFolderId.value || null,
  })
  favoriteDialog.value = false
  ElMessage.success('收藏成功')
  await refresh()
  await loadFolders()
}
</script>

<template>
  <div style="padding: 16px 16px 22px">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px">
            <div>
              <div style="font-weight: 800">首页 · 概览</div>
              <div style="font-size: 12px; color: #64748b">
                核心入口：概览图表 + 轻量化表格
              </div>
            </div>
            <ElButton :loading="loading" @click="refresh">刷新</ElButton>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="12">
        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: baseline; justify-content: space-between">
            <div style="font-weight: 700">用户画像可视化</div>
            <div style="font-size: 12px; color: #64748b">{{ data?.user?.name }} · {{ data?.user?.stage }}</div>
          </div>

          <ElSkeleton :loading="loading" animated>
            <EChart :option="profileDonutOption" :height="320" />
          </ElSkeleton>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :lg="12">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="font-weight: 700; margin-bottom: 10px">核心画像数据（紧凑表格）</div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="320px">
              <ElTable :data="data?.profileTable || []" size="small" style="width: 100%">
                <ElTableColumn prop="name" label="标签名称" min-width="140" />
                <ElTableColumn prop="weight" label="权重值" width="90">
                  <template #default="{ row }">
                    <ElTag type="primary" effect="plain">{{ Number(row.weight).toFixed(3) }}</ElTag>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="updatedAt" label="更新时间" min-width="150" />
              </ElTable>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="8">
        <PomodoroTimer @session-end="refresh" @session-start="refresh" />
      </ElCol>
      <ElCol :xs="24" :lg="16">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px">
            <div style="font-weight: 700">学习数据速览</div>
            <div style="font-size: 12px; color: #64748b">总览 + 迷你柱状图</div>
          </div>
          <ElSkeleton :loading="loading" animated>
            <ElRow :gutter="12">
              <ElCol :span="6">
                <ElCard shadow="never" style="border-radius: 12px">
                  <div style="font-size: 12px; color: #64748b">总学时(7天)</div>
                  <div style="font-size: 18px; font-weight: 800">
                    {{ Math.round((data?.quickStats?.totalStudyMinutes7d || 0) / 60) }}h
                  </div>
                </ElCard>
              </ElCol>
              <ElCol :span="6">
                <ElCard shadow="never" style="border-radius: 12px">
                  <div style="font-size: 12px; color: #64748b">完成资源(7天)</div>
                  <div style="font-size: 18px; font-weight: 800">{{ data?.quickStats?.completedResources7d || 0 }}</div>
                </ElCard>
              </ElCol>
              <ElCol :span="6">
                <ElCard shadow="never" style="border-radius: 12px">
                  <div style="font-size: 12px; color: #64748b">推荐匹配(7天)</div>
                  <div style="font-size: 18px; font-weight: 800">
                    {{ Math.round((data?.quickStats?.avgRecommendMatch7d || 0) * 100) }}%
                  </div>
                </ElCard>
              </ElCol>
              <ElCol :span="6">
                <ElCard shadow="never" style="border-radius: 12px; background: #fef3c7">
                  <div style="font-size: 12px; color: #92400e">🍅 番茄(7天)</div>
                  <div style="font-size: 18px; font-weight: 800; color: #78350f">
                    {{ data?.quickStats?.pomodoroCount7d || 0 }}个
                  </div>
                </ElCard>
              </ElCol>
            </ElRow>
            <div style="margin-top: 12px">
              <EChart :option="miniBarOption" :height="120" />
            </div>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="14">
        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px">
            <div style="font-weight: 700">推荐资源列表（卡片式表格）</div>
            <div style="font-size: 12px; color: #64748b">学习 / 收藏（可选择收藏夹）</div>
          </div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="360px">
              <ElTable :data="data?.recommendTable || []" size="small" class="card-table" style="width: 100%">
                <ElTableColumn prop="resourceId" label="资源ID" width="110" />
                <ElTableColumn prop="name" label="名称" min-width="180" />
                <ElTableColumn label="适配标签" min-width="160">
                  <template #default="{ row }">
                    <div style="display: flex; gap: 6px; flex-wrap: wrap">
                      <ElTag v-for="t in row.adaptedTags" :key="t" type="info" effect="plain">{{ t }}</ElTag>
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="matchScore" label="匹配度" width="90">
                  <template #default="{ row }">
                    <ElTag type="success" effect="plain">{{ Number(row.matchScore).toFixed(3) }}</ElTag>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="操作" width="170" fixed="right">
                  <template #default="{ row }">
                    <div style="display: flex; gap: 8px">
                      <ElButton size="small" type="primary" @click="doLearn(row)">学习</ElButton>
                      <ElButton size="small" @click="openFavoriteDialog(row)">收藏</ElButton>
                    </div>
                  </template>
                </ElTableColumn>
              </ElTable>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :lg="10">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="font-weight: 700; margin-bottom: 10px">周学习数据汇总</div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="360px">
              <ElTable :data="data?.weeklySummaryTable || []" size="small" style="width: 100%">
                <ElTableColumn prop="date" label="日期" width="110" />
                <ElTableColumn prop="studyMinutes" label="学习时长(min)" width="120" />
                <ElTableColumn prop="completedCount" label="完成资源数" width="110" />
                <ElTableColumn prop="avgMatchScore" label="推荐匹配度均值" min-width="140">
                  <template #default="{ row }">
                    <ElTag type="info" effect="plain">{{ (Number(row.avgMatchScore) * 100).toFixed(1) }}%</ElTag>
                  </template>
                </ElTableColumn>
              </ElTable>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElDialog v-model="favoriteDialog" title="收藏到收藏夹" width="420px">
      <div style="display: flex; flex-direction: column; gap: 12px">
        <div style="font-size: 13px; color: #475569">选择要加入的收藏夹</div>
        <ElSelect v-model="selectedFolderId" placeholder="选择收藏夹" style="width: 100%">
          <ElOption v-for="f in folders" :key="f.id" :label="f.name + (f.isDefault ? '（默认）' : '')" :value="f.id" />
        </ElSelect>
      </div>
      <template #footer>
        <ElButton @click="favoriteDialog = false">取消</ElButton>
        <ElButton type="primary" @click="confirmFavorite">确认收藏</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
