<script setup>
import { computed } from 'vue'
import { ElButton, ElCard, ElCol, ElRow, ElSkeleton, ElTable, ElTableColumn, ElTag, ElMessage } from 'element-plus'

import EChart from '../components/EChart.vue'
import { usePageData } from '../lib/usePageData'
import { api } from '../lib/api'
import { useBadges } from '../stores/badges'

const { data, loading, refresh } = usePageData('/pages/progress')
const { updateProgress } = useBadges()

async function addToFlashcard(wrongId) {
  try {
    await api.post('/flashcards/from-wrong-question', { wrongQuestionId: wrongId })
    updateProgress('corrected_wrong', 1)
    updateProgress('study_date')
    const wrongTable = data.value?.wrongTable || []
    const remainingUncorrected = wrongTable.filter((w) => !w.corrected && w.wrongId !== wrongId).length
    if (remainingUncorrected === 0) {
      updateProgress('wrong_zero', 1)
    }
    ElMessage.success('已加入闪卡队列')
  } catch (e) {
    const msg = e?.response?.data?.error?.message || '加入闪卡失败'
    ElMessage.error(msg)
  }
}

const subjectPieOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { top: 8, left: 'center' },
  series: [
    {
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['50%', '56%'],
      label: { formatter: '{b} {d}%' },
      labelLine: { length: 14, length2: 12 },
      data: (data.value?.subjectPie || []).map((x) => ({ name: x.name, value: x.value })),
    },
  ],
}))

const progressTrendOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { top: 8, left: 'center' },
  grid: { top: 56, left: 44, right: 18, bottom: 28, containLabel: true },
  xAxis: { type: 'category', data: (data.value?.progressTrend30d || []).map((x) => x.date) },
  yAxis: { type: 'value', min: 0 },
  series: [
    {
      name: '实际进度(min)',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      areaStyle: { opacity: 0.12 },
      data: (data.value?.progressTrend30d || []).map((x) => x.actualMinutes),
    },
    {
      name: '目标进度(min)',
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { type: 'dashed' },
      data: (data.value?.progressTrend30d || []).map((x) => x.targetMinutes),
    },
  ],
}))

const funnelOption = computed(() => ({
  tooltip: { trigger: 'item' },
  series: [
    {
      type: 'funnel',
      left: '10%',
      top: 24,
      bottom: 10,
      width: '80%',
      min: 0,
      max: Math.max(...(data.value?.wrongFunnel || []).map((x) => x.value), 1),
      sort: 'descending',
      gap: 2,
      label: { show: true, position: 'inside' },
      data: data.value?.wrongFunnel || [],
    },
  ],
}))

const pomodoroBarOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { top: 24, left: 36, right: 12, bottom: 28, containLabel: true },
  xAxis: {
    type: 'category',
    data: (data.value?.pomodoroStats?.daily || []).map((x) => x.date.slice(5)),
    axisLabel: { fontSize: 11 },
  },
  yAxis: [
    { type: 'value', name: '番茄数', min: 0, axisLabel: { fontSize: 11 } },
  ],
  series: [
    {
      name: '番茄个数',
      type: 'bar',
      barWidth: 20,
      itemStyle: { borderRadius: [6, 6, 0, 0], color: '#f59e0b' },
      data: (data.value?.pomodoroStats?.daily || []).map((x) => x.count),
    },
  ],
}))
</script>

<template>
  <div style="padding: 16px 16px 22px">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px">
            <div>
              <div style="font-weight: 800">学习进度模块</div>
              <div style="font-size: 12px; color: #64748b">追踪 + 复盘 + 目标</div>
            </div>
            <ElButton :loading="loading" @click="refresh">刷新</ElButton>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="12">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700">学习总览（各学科学习时长占比）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="subjectPieOption" :height="320" />
          </ElSkeleton>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :lg="12">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="font-weight: 700; margin-bottom: 10px">总览汇总表</div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="320px">
              <ElTable :data="data?.overviewTable || []" size="small" style="width: 100%">
                <ElTableColumn prop="subject" label="学科" width="70" />
                <ElTableColumn prop="totalStudyMinutes" label="总学时(min)" width="110" />
                <ElTableColumn prop="completedResources" label="完成资源数" width="110" />
                <ElTableColumn prop="wrongCount" label="错题数" width="80" />
                <ElTableColumn prop="masteryRate" label="掌握率" min-width="100">
                  <template #default="{ row }">
                    <ElTag type="success" effect="plain">{{ (Number(row.masteryRate) * 100).toFixed(1) }}%</ElTag>
                  </template>
                </ElTableColumn>
              </ElTable>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="14">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700">进度趋势与对比（近30天）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="progressTrendOption" :height="320" />
          </ElSkeleton>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :lg="10">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700">错题复盘（漏斗）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="funnelOption" :height="320" />
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="14">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700">🍅 番茄钟统计（近7天）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="pomodoroBarOption" :height="320" />
          </ElSkeleton>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :lg="10">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="font-weight: 700; margin-bottom: 10px">本周番茄概览</div>
          <ElSkeleton :loading="loading" animated>
            <ElRow :gutter="12">
              <ElCol :span="12">
                <ElCard shadow="never" style="border-radius: 12px; background: #fef3c7">
                  <div style="font-size: 12px; color: #92400e; margin-bottom: 4px">🍅 本周番茄</div>
                  <div style="font-size: 24px; font-weight: 800; color: #78350f">
                    {{ data?.pomodoroStats?.weekPomodoroCount || 0 }}
                    <span style="font-size: 13px; font-weight: 500">个</span>
                  </div>
                </ElCard>
              </ElCol>
              <ElCol :span="12">
                <ElCard shadow="never" style="border-radius: 12px; background: #dcfce7">
                  <div style="font-size: 12px; color: #166534; margin-bottom: 4px">⏱ 累计专注</div>
                  <div style="font-size: 24px; font-weight: 800; color: #14532d">
                    {{ Math.round((data?.pomodoroStats?.weekFocusMinutes || 0) / 60 * 10) / 10 }}
                    <span style="font-size: 13px; font-weight: 500">小时</span>
                  </div>
                </ElCard>
              </ElCol>
            </ElRow>
            <div style="margin-top: 16px">
              <div style="font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 8px">最近专注记录</div>
              <el-scrollbar height="180px">
                <div v-if="!data?.pomodoroStats?.recentList?.length" style="text-align: center; color: #94a3b8; font-size: 13px; padding: 24px 0">
                  暂无专注记录
                </div>
                <div v-else style="display: flex; flex-direction: column; gap: 8px">
                  <div
                    v-for="item in data?.pomodoroStats?.recentList"
                    :key="item.id"
                    style="padding: 10px 12px; background: #f8fafc; border-radius: 10px"
                  >
                    <div style="display: flex; justify-content: space-between; align-items: center">
                      <div style="font-size: 13px; font-weight: 500; color: #334155">
                        🍅 {{ item.presetName || '番茄钟' }}
                      </div>
                      <div style="font-size: 12px; color: #f59e0b; font-weight: 600">
                        {{ Math.round(item.actualFocusSeconds / 60) }}分钟
                      </div>
                    </div>
                    <div v-if="item.resourceName" style="font-size: 12px; color: #64748b; margin-top: 4px">
                      {{ item.resourceName }}
                    </div>
                    <div v-if="item.summary" style="font-size: 12px; color: #94a3b8; margin-top: 4px">
                      {{ item.summary }}
                    </div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 4px">
                      {{ new Date(item.startedAt).toLocaleString() }}
                    </div>
                  </div>
                </div>
              </el-scrollbar>
            </div>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="14">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700; margin-bottom: 10px">每日进度表</div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="340px">
              <ElTable :data="data?.dailyTable || []" size="small" style="width: 100%">
                <ElTableColumn prop="date" label="日期" width="110" />
                <ElTableColumn prop="subject" label="学科" width="70" />
                <ElTableColumn prop="studyMinutes" label="学习时长(min)" width="120" />
                <ElTableColumn prop="completedCount" label="完成资源" width="90" />
                <ElTableColumn prop="targetAchieveRate" label="目标达成率" width="110">
                  <template #default="{ row }">
                    <ElTag type="info" effect="plain">{{ (Number(row.targetAchieveRate) * 100).toFixed(1) }}%</ElTag>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="note" label="备注" min-width="160" />
              </ElTable>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :lg="10">
        <ElCard style="border-radius: 14px; margin-bottom: 16px">
          <div style="font-weight: 700; margin-bottom: 10px">错题明细表</div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="160px">
              <ElTable :data="data?.wrongTable || []" size="small" style="width: 100%">
                <ElTableColumn prop="wrongId" label="错题ID" width="90" />
                <ElTableColumn prop="knowledgePoint" label="所属知识点" min-width="160" />
                <ElTableColumn prop="wrongCount" label="做错次数" width="80" />
                <ElTableColumn prop="corrected" label="订正状态" width="80" />
                <ElTableColumn prop="mastery" label="掌握程度" width="80" />
                <ElTableColumn prop="reviewedAt" label="复盘时间" min-width="150" />
                <ElTableColumn label="操作" width="100" fixed="right">
                  <template #default="{ row }">
                    <ElButton type="primary" text size="small" @click="addToFlashcard(row.wrongId)">
                      加入闪卡
                    </ElButton>
                  </template>
                </ElTableColumn>
              </ElTable>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>

        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px">
            <div style="font-weight: 700">学习目标管理</div>
            <div style="font-size: 12px; color: #64748b">环形进度条</div>
          </div>
          <ElSkeleton :loading="loading" animated>
            <ElRow :gutter="12">
              <ElCol v-for="g in data?.goalRings || []" :key="g.type" :span="8">
                <ElCard shadow="never" style="border-radius: 12px; text-align: center">
                  <div style="font-size: 12px; color: #64748b; margin-bottom: 8px">{{ g.type }}目标</div>
                  <el-progress type="circle" :percentage="Math.round(Number(g.percent || 0) * 100)" :width="80" />
                </ElCard>
              </ElCol>
            </ElRow>
            <div style="margin-top: 12px">
              <el-scrollbar height="160px">
                <ElTable :data="data?.goalTable || []" size="small" style="width: 100%">
                  <ElTableColumn prop="type" label="类型" width="60" />
                  <ElTableColumn prop="targetMinutes" label="时长" width="70" />
                  <ElTableColumn prop="targetResources" label="资源数" width="70" />
                  <ElTableColumn prop="startDate" label="起始" width="110" />
                  <ElTableColumn prop="endDate" label="结束" width="110" />
                  <ElTableColumn prop="currentMinutes" label="当前(min)" width="90" />
                  <ElTableColumn prop="currentResources" label="当前资源" width="90" />
                  <ElTableColumn prop="adjustmentRecord" label="调整记录" min-width="180">
                    <template #default="{ row }">
                      <span v-if="!Array.isArray(row.adjustmentRecord) || row.adjustmentRecord.length === 0">-</span>
                      <span v-else>{{ row.adjustmentRecord[row.adjustmentRecord.length - 1]?.note || '已调整' }}</span>
                    </template>
                  </ElTableColumn>
                </ElTable>
              </el-scrollbar>
            </div>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>
