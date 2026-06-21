<script setup>
import { computed, ref } from 'vue'
import { ElButton, ElCard, ElCol, ElRow, ElSkeleton, ElTable, ElTableColumn, ElTag, ElDialog, ElProgress, ElSelect, ElOption } from 'element-plus'

import EChart from '../components/EChart.vue'
import { usePageData } from '../lib/usePageData'

const { data, loading, refresh } = usePageData('/pages/ability-map')

const selectedSubject = ref('')
const selectedDimension = ref(null)
const detailDialogVisible = ref(false)

function onChartClick(params) {
  if (params?.componentType === 'radar' && params?.name) {
    const dim = data.value?.dimensionScoreTable?.find((d) => d.name === params.name)
    if (dim) {
      selectedDimension.value = dim
      detailDialogVisible.value = true
    }
  }
}

const currentSubjectData = computed(() => {
  if (!selectedSubject.value || !data.value?.subjects) return null
  return data.value.subjects.find((s) => s.subject === selectedSubject.value)
})

const radarOption = computed(() => {
  if (!data.value?.overallRadar || !data.value?.subjects?.length) {
    return {
      tooltip: {},
      radar: { indicator: [], radius: 110 },
      series: [],
    }
  }

  const indicators = data.value.overallRadar.map((r) => ({
    name: r.name,
    max: 100,
    color: r.color,
  }))

  const subjectColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

  const seriesData = data.value.subjects.slice(0, 6).map((s, idx) => ({
    name: s.subject,
    value: s.dimensions.map((d) => d.score),
    itemStyle: { color: subjectColors[idx % subjectColors.length] },
    lineStyle: { width: 2 },
    areaStyle: { opacity: selectedSubject.value === s.subject ? 0.25 : 0.08 },
    emphasis: { areaStyle: { opacity: 0.35 } },
  }))

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        if (params.componentType === 'radar') {
          return `<strong>${params.name}</strong><br/>${params.value}分`
        }
        let html = `<div style="font-weight:600;margin-bottom:6px">${params.name}</div>`
        params.value.forEach((v, i) => {
          html += `<div style="display:flex;justify-content:space-between;gap:16px">
            <span>${indicators[i].name}</span>
            <span style="font-weight:600">${v}</span>
          </div>`
        })
        return html
      },
    },
    legend: {
      top: 8,
      left: 'center',
      type: 'scroll',
      textStyle: { fontSize: 12 },
    },
    radar: {
      indicator: indicators.map((i) => ({ name: i.name, max: 100 })),
      radius: '62%',
      center: ['50%', '55%'],
      splitNumber: 5,
      axisName: {
        color: '#334155',
        fontSize: 13,
        fontWeight: 600,
      },
      splitLine: {
        lineStyle: { color: '#e2e8f0' },
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: ['rgba(99, 102, 241, 0.02)', 'rgba(99, 102, 241, 0.04)'],
        },
      },
    },
    series: [
      {
        type: 'radar',
        data: seriesData,
        emphasis: { focus: 'series' },
      },
    ],
  }
})

const subjectRadarOption = computed(() => {
  if (!currentSubjectData.value) {
    return {
      tooltip: {},
      radar: { indicator: [], radius: 100 },
      series: [],
    }
  }

  const subject = currentSubjectData.value
  const indicators = subject.dimensions.map((d) => ({
    name: d.name,
    max: 100,
  }))

  return {
    tooltip: {
      trigger: 'item',
    },
    radar: {
      indicator: indicators,
      radius: '65%',
      center: ['50%', '55%'],
      splitNumber: 5,
      axisName: {
        color: '#334155',
        fontSize: 12,
        fontWeight: 500,
      },
      splitLine: {
        lineStyle: { color: '#e2e8f0' },
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: ['rgba(16, 185, 129, 0.02)', 'rgba(16, 185, 129, 0.05)'],
        },
      },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: subject.dimensions.map((d) => d.score),
            name: subject.subject,
            itemStyle: { color: '#10b981' },
            lineStyle: { width: 2.5, color: '#10b981' },
            areaStyle: {
              color: {
                type: 'radial',
                x: 0.5,
                y: 0.5,
                r: 0.5,
                colorStops: [
                  { offset: 0, color: 'rgba(16, 185, 129, 0.05)' },
                  { offset: 1, color: 'rgba(16, 185, 129, 0.25)' },
                ],
              },
            },
          },
        ],
      },
    ],
  }
})

const dimensionFactorTable = computed(() => {
  if (!selectedDimension.value || !currentSubjectData.value) return []
  const dim = currentSubjectData.value.dimensions.find((d) => d.key === selectedDimension.value.key)
  return dim?.factors || []
})

function getLevelTagType(level) {
  const map = {
    优秀: 'success',
    良好: 'primary',
    中等: 'warning',
    待提升: 'info',
  }
  return map[level] || 'info'
}

function openDetailByDim(dim) {
  selectedDimension.value = dim
  detailDialogVisible.value = true
}
</script>

<template>
  <div style="padding: 16px 16px 22px; background: linear-gradient(180deg, #f0f4ff 0%, #f5f7fa 100%); min-height: 100%">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard style="border-radius: 16px; border: none; box-shadow: 0 4px 20px rgba(99, 102, 241, 0.08)">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap">
            <div style="display: flex; align-items: center; gap: 12px">
              <div style="width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center">
                <span style="font-size: 22px">🧠</span>
              </div>
              <div>
                <div style="font-size: 20px; font-weight: 800; color: #1e293b">学科能力图谱</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 2px">能力结构分析 · 多维评估 · 因子洞察</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px">
              <ElSelect
                v-model="selectedSubject"
                placeholder="选择学科"
                style="width: 140px"
                size="default"
              >
                <ElOption
                  v-for="s in data?.subjects || []"
                  :key="s.subject"
                  :label="s.subject"
                  :value="s.subject"
                />
              </ElSelect>
              <ElButton :loading="loading" @click="refresh" type="primary" plain>
                刷新数据
              </ElButton>
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="10">
        <ElCard style="border-radius: 14px; border: none; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04)">
          <div style="font-weight: 700; font-size: 15px; color: #1e293b; margin-bottom: 4px">综合能力雷达</div>
          <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px">全学科四维能力对比</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="radarOption" :height="340" />
          </ElSkeleton>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :lg="14">
        <ElCard style="border-radius: 14px; border: none; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04); height: 100%">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px">
            <div>
              <div style="font-weight: 700; font-size: 15px; color: #1e293b">维度得分总览</div>
              <div style="font-size: 12px; color: #94a3b8; margin-top: 2px">点击维度名称查看贡献因子</div>
            </div>
            <div v-if="data?.dimensionScoreTable" style="display: flex; gap: 8px; flex-wrap: wrap">
              <ElTag
                v-for="d in data.dimensionScoreTable"
                :key="d.key"
                :type="getLevelTagType(d.level)"
                effect="light"
                size="small"
                style="cursor: pointer"
                @click="openDetailByDim(d)"
              >
                {{ d.name }} · {{ d.score }}分
              </ElTag>
            </div>
          </div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="320px">
              <ElTable
                :data="data?.dimensionScoreTable || []"
                size="default"
                style="width: 100%"
                :cell-style="{ padding: '10px 12px' }"
              >
                <ElTableColumn prop="name" label="评估维度" width="120">
                  <template #default="{ row }">
                    <div
                      style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 600"
                      @click="openDetailByDim(row)"
                    >
                      <span
                        :style="{
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: row.color,
                        }"
                      ></span>
                      <span style="color: #1e293b">{{ row.name }}</span>
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="得分" width="180">
                  <template #default="{ row }">
                    <ElProgress
                      :percentage="row.score"
                      :color="row.color"
                      :stroke-width="10"
                      :text-inside="true"
                    />
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="level" label="等级" width="80">
                  <template #default="{ row }">
                    <ElTag :type="getLevelTagType(row.level)" effect="plain" round size="small">
                      {{ row.level }}
                    </ElTag>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="weight" label="权重" width="70">
                  <template #default="{ row }">
                    <span style="color: #64748b; font-size: 13px">{{ (Number(row.weight) * 100).toFixed(0) }}%</span>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="最强学科" width="110">
                  <template #default="{ row }">
                    <div style="text-align: center">
                      <div style="font-weight: 600; color: #10b981; font-size: 13px">{{ row.topSubject }}</div>
                      <div style="font-size: 11px; color: #94a3b8">{{ row.topSubjectScore }}分</div>
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="薄弱学科" width="110">
                  <template #default="{ row }">
                    <div style="text-align: center">
                      <div style="font-weight: 600; color: #ef4444; font-size: 13px">{{ row.weakSubject }}</div>
                      <div style="font-size: 11px; color: #94a3b8">{{ row.weakSubjectScore }}分</div>
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="suggestion" label="提升建议" min-width="200">
                  <template #default="{ row }">
                    <span style="color: #64748b; font-size: 13px; line-height: 1.5">{{ row.suggestion }}</span>
                  </template>
                </ElTableColumn>
              </ElTable>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="8">
        <ElCard style="border-radius: 14px; border: none; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04)">
          <div style="font-weight: 700; font-size: 15px; color: #1e293b; margin-bottom: 4px">
            {{ selectedSubject || '请选择学科' }} · 能力雷达
          </div>
          <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px">单科四维能力分布</div>
          <ElSkeleton :loading="loading" animated>
            <template v-if="currentSubjectData">
              <EChart :option="subjectRadarOption" :height="280" />
              <div style="text-align: center; margin-top: 8px">
                <div style="font-size: 12px; color: #94a3b8">综合得分</div>
                <div style="font-size: 32px; font-weight: 800; color: #10b981; line-height: 1.2">
                  {{ currentSubjectData.overallScore }}
                  <span style="font-size: 14px; font-weight: 500; color: #94a3b8">/ 100</span>
                </div>
              </div>
            </template>
            <template v-else>
              <div style="height: 300px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 13px">
                请在上方选择一个学科
              </div>
            </template>
          </ElSkeleton>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :lg="16">
        <ElCard style="border-radius: 14px; border: none; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04); height: 100%">
          <div style="font-weight: 700; font-size: 15px; color: #1e293b; margin-bottom: 4px">学科学力对比</div>
          <div style="font-size: 12px; color: #94a3b8; margin-bottom: 12px">各学科四维能力横向对比</div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="340px">
              <ElTable
                :data="data?.subjects || []"
                size="default"
                style="width: 100%"
                :cell-style="{ padding: '10px 12px' }"
              >
                <ElTableColumn prop="subject" label="学科" width="80" fixed>
                  <template #default="{ row }">
                    <div style="font-weight: 700; color: #1e293b; font-size: 14px">{{ row.subject }}</div>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="综合得分" width="110" fixed>
                  <template #default="{ row }">
                    <div style="text-align: center">
                      <div style="font-size: 20px; font-weight: 800; color: #6366f1">{{ row.overallScore }}</div>
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn
                  v-for="dim in data?.dimensionScoreTable || []"
                  :key="dim.key"
                  :label="dim.name"
                  min-width="130"
                >
                  <template #default="{ row }">
                    <div>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 4px">
                        <span style="font-size: 12px; color: #64748b">得分</span>
                        <span style="font-size: 13px; font-weight: 600; color: #1e293b">
                          {{ row.dimensions?.find((d) => d.key === dim.key)?.score || 0 }}
                        </span>
                      </div>
                      <ElProgress
                        :percentage="row.dimensions?.find((d) => d.key === dim.key)?.score || 0"
                        :color="dim.color"
                        :stroke-width="6"
                        :show-text="false"
                      />
                    </div>
                  </template>
                </ElTableColumn>
              </ElTable>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElDialog
      v-model="detailDialogVisible"
      :title="`${selectedDimension?.name || ''} · 贡献因子明细`"
      width="600px"
      :close-on-click-modal="true"
    >
      <div v-if="selectedDimension && currentSubjectData" style="padding: 8px 0">
        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px; padding: 14px 16px; background: linear-gradient(135deg, #f0f4ff, #ede9fe); border-radius: 12px">
          <div style="flex: 1">
            <div style="font-size: 13px; color: #64748b; margin-bottom: 4px">{{ currentSubjectData.subject }} · {{ selectedDimension.name }}</div>
            <div style="font-size: 28px; font-weight: 800; color: #1e293b">
              {{ currentSubjectData.dimensions?.find((d) => d.key === selectedDimension.key)?.score || 0 }}
              <span style="font-size: 14px; font-weight: 500; color: #94a3b8">分</span>
            </div>
          </div>
          <ElTag :type="getLevelTagType(selectedDimension.level)" effect="light" size="large" round>
            {{ selectedDimension.level }}
          </ElTag>
        </div>

        <div style="font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 10px">
          贡献因子分析
        </div>
        <div style="font-size: 12px; color: #94a3b8; margin-bottom: 12px">
          点击查看各行为项对得分的贡献，绿色为拉动项，红色为拖累项
        </div>

        <el-scrollbar max-height="380px">
          <ElTable
            :data="dimensionFactorTable"
            size="default"
            style="width: 100%"
            :cell-style="{ padding: '12px 14px' }"
          >
            <ElTableColumn prop="name" label="因子名称" min-width="140">
              <template #default="{ row }">
                <div style="display: flex; align-items: center; gap: 8px">
                  <span
                    :style="{
                      fontSize: '16px',
                    }"
                  >
                    {{ row.isPositive ? '📈' : '📉' }}
                  </span>
                  <span style="font-weight: 600; color: #1e293b">{{ row.name }}</span>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="当前值" width="100">
              <template #default="{ row }">
                <span style="font-weight: 600; color: #334155">{{ row.value }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="weight" label="权重" width="80">
              <template #default="{ row }">
                <span style="color: #64748b; font-size: 13px">{{ (Number(row.weight) * 100).toFixed(0) }}%</span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="贡献度" width="160">
              <template #default="{ row }">
                <ElProgress
                  :percentage="Math.round(row.contribution)"
                  :color="row.isPositive ? '#10b981' : '#ef4444'"
                  :stroke-width="8"
                  :text-inside="true"
                />
              </template>
            </ElTableColumn>
            <ElTableColumn label="影响" width="70">
              <template #default="{ row }">
                <ElTag :type="row.isPositive ? 'success' : 'danger'" effect="plain" size="small">
                  {{ row.isPositive ? '拉动' : '拖累' }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="detail" label="详细说明" min-width="180">
              <template #default="{ row }">
                <span style="color: #64748b; font-size: 13px">{{ row.detail }}</span>
              </template>
            </ElTableColumn>
          </ElTable>
        </el-scrollbar>

        <div style="margin-top: 16px; padding: 12px 14px; background: #f8fafc; border-radius: 10px">
          <div style="font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 4px">💡 提升建议</div>
          <div style="font-size: 13px; color: #64748b; line-height: 1.6">
            {{ selectedDimension.suggestion }}
          </div>
        </div>
      </div>
    </ElDialog>
  </div>
</template>
