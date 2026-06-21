<script setup>
import { computed } from 'vue'
import { ElButton, ElCard, ElCol, ElRow, ElSkeleton, ElTable, ElTableColumn, ElTag } from 'element-plus'

import EChart from '../components/EChart.vue'
import { usePageData } from '../lib/usePageData'

const { data, loading, refresh } = usePageData('/pages/recommendation-analysis')

const radarOption = computed(() => {
  const items = data.value?.radar || []
  return {
    tooltip: {},
    radar: {
      indicator: items.map((x) => ({ name: x.name, max: 100 })),
      radius: 110,
      splitNumber: 5,
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: items.map((x) => x.value),
            name: '能力评分',
            areaStyle: { opacity: 0.14 },
          },
        ],
      },
    ],
  }
})

const sankeyOption = computed(() => ({
  tooltip: { trigger: 'item' },
  series: [
    {
      type: 'sankey',
      left: 10,
      right: 10,
      top: 16,
      bottom: 16,
      nodeGap: 14,
      nodeWidth: 18,
      emphasis: { focus: 'adjacency' },
      data: data.value?.strategySankey?.nodes || [],
      links: data.value?.strategySankey?.links || [],
      lineStyle: { color: 'source', curveness: 0.5 },
      label: { color: '#0f172a' },
    },
  ],
}))

const flowOption = computed(() => {
  const nodes = data.value?.strategyFlow?.nodes || []
  const edges = data.value?.strategyFlow?.edges || []
  return {
    tooltip: {
      trigger: 'item',
      formatter: (p) => p?.data?.desc || p?.name || '',
    },
    series: [
      {
        type: 'graph',
        coordinateSystem: null,
        layout: 'none',
        roam: false,
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: 8,
        data: nodes.map((n) => ({
          id: n.id,
          name: n.name,
          x: Number(n.x || 0) * 5,
          y: Number(n.y || 0) * 2.4,
          symbolSize: [120, 52],
          value: n.desc,
          desc: n.desc,
          itemStyle: { color: '#e0ecff', borderColor: '#3b82f6', borderWidth: 1.2, borderRadius: 10 },
          label: { color: '#1e3a8a', fontWeight: 600 },
        })),
        links: edges.map((e) => ({ source: e.source, target: e.target, lineStyle: { color: '#60a5fa', width: 2 } })),
      },
    ],
  }
})

const effectOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { top: 8, left: 'center' },
  grid: { top: 56, left: 44, right: 18, bottom: 28, containLabel: true },
  xAxis: { type: 'category', data: (data.value?.effectTrend || []).map((x) => x.batch) },
  yAxis: [
    { type: 'value', name: '点击量', min: 0 },
    { type: 'value', name: '完成/留存', min: 0, max: 1 },
  ],
  series: [
    {
      name: '点击量',
      type: 'bar',
      barWidth: 16,
      data: (data.value?.effectTrend || []).map((x) => x.clickCount),
    },
    {
      name: '完成率',
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      symbol: 'circle',
      symbolSize: 7,
      data: (data.value?.effectTrend || []).map((x) => Number(x.completionRate || 0)),
    },
    {
      name: '留存率',
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      symbol: 'diamond',
      symbolSize: 7,
      data: (data.value?.effectTrend || []).map((x) => Number(x.retentionRate || 0)),
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
              <div style="font-weight: 800">推荐分析模块</div>
              <div style="font-size: 12px; color: #64748b">画像 + 策略 + 效果</div>
            </div>
            <ElButton :loading="loading" @click="refresh">刷新</ElButton>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="12">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700">用户画像深度分析（雷达图）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="radarOption" :height="320" />
          </ElSkeleton>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :lg="12">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="font-weight: 700; margin-bottom: 10px">画像维度表（评分明细）</div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="320px">
              <ElTable :data="data?.dimensionTable || []" size="small" style="width: 100%">
                <ElTableColumn prop="name" label="维度名称" min-width="130" />
                <ElTableColumn prop="score" label="评分" width="80">
                  <template #default="{ row }">
                    <ElTag type="primary" effect="plain">{{ row.score }}</ElTag>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="weight" label="权重" width="80">
                  <template #default="{ row }">{{ Number(row.weight).toFixed(2) }}</template>
                </ElTableColumn>
                <ElTableColumn prop="suggestion" label="提升建议" min-width="220" />
              </ElTable>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="12">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700">推荐策略流程图</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="flowOption" :height="320" />
          </ElSkeleton>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :lg="12">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700">推荐策略拆解（桑基图）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="sankeyOption" :height="320" />
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="24">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="font-weight: 700; margin-bottom: 10px">策略配置表</div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="280px">
              <ElTable :data="data?.ruleTable || []" size="small" style="width: 100%">
                <ElTableColumn prop="ruleId" label="规则ID" width="90" />
                <ElTableColumn prop="name" label="规则名称" min-width="180" />
                <ElTableColumn prop="matchDimensions" label="匹配维度" min-width="180">
                  <template #default="{ row }">
                    <div style="display: flex; gap: 6px; flex-wrap: wrap">
                      <ElTag v-for="t in row.matchDimensions" :key="t" type="info" effect="plain">{{ t }}</ElTag>
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="weightRatio" label="权重占比" min-width="180">
                  <template #default="{ row }">
                    <div style="display: flex; gap: 6px; flex-wrap: wrap">
                      <ElTag v-for="w in row.weightRatio || []" :key="w.name" type="primary" effect="plain">
                        {{ w.name }} {{ Math.round(Number(w.value || 0) * 100) }}%
                      </ElTag>
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="enabled" label="生效状态" width="80">
                  <template #default="{ row }">
                    <ElTag :type="row.enabled ? 'success' : 'warning'" effect="plain">
                      {{ row.enabled ? '启用' : '停用' }}
                    </ElTag>
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
          <div style="font-weight: 700">推荐效果分析（双轴趋势）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="effectOption" :height="320" />
          </ElSkeleton>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :lg="10">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="font-weight: 700; margin-bottom: 10px">效果明细表</div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="320px">
              <ElTable :data="data?.effectTable || []" size="small" style="width: 100%">
                <ElTableColumn prop="batch" label="推荐批次" width="130" />
                <ElTableColumn prop="resourceCount" label="资源数" width="70" />
                <ElTableColumn prop="clickCount" label="点击数" width="70" />
                <ElTableColumn prop="completeCount" label="完成数" width="70" />
                <ElTableColumn prop="completionRate" label="完成率" width="90">
                  <template #default="{ row }">
                    <ElTag type="success" effect="plain">{{ (Number(row.completionRate) * 100).toFixed(1) }}%</ElTag>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="reviewNote" label="复盘备注" min-width="160" />
              </ElTable>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>
