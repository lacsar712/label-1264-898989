<script setup>
import { computed, ref, watch } from 'vue'
import { ElButton, ElCard, ElCol, ElMessageBox, ElNotification, ElRow, ElSkeleton, ElTable, ElTableColumn, ElTag } from 'element-plus'

import EChart from '../../components/EChart.vue'
import { api } from '../../lib/api'
import { usePageData } from '../../lib/usePageData'

const { data, loading, refresh } = usePageData('/pages/admin/system')

const weightDraft = ref([])

watch(
  () => data.value?.activeRule?.ruleId,
  () => {
    weightDraft.value = (data.value?.weightTable || []).map((x) => ({
      name: x.name,
      baseWeight: Number(x.baseWeight || 0),
    }))
  },
  { immediate: true }
)

async function saveWeights() {
  const ruleId = data.value?.activeRule?.ruleId
  if (!ruleId) return
  await api.put(`/actions/admin/system/rules/${ruleId}/weights`, {
    weightRatio: weightDraft.value.map((x) => ({ name: x.name, value: Number(x.baseWeight || 0) })),
  })
  ElNotification({ title: '已保存', message: '推荐权重已更新', type: 'success', duration: 2000 })
  await refresh()
}

function resetWeights() {
  weightDraft.value = (data.value?.weightTable || []).map((x) => ({
    name: x.name,
    baseWeight: Number(x.baseWeight || 0),
  }))
}

function rowWeight(row) {
  const hit = weightDraft.value.find((x) => x.name === row.name)
  return hit || { name: row.name, baseWeight: Number(row.baseWeight || 0) }
}

async function editParam(row) {
  const { value } = await ElMessageBox.prompt('请输入新的参数值', `编辑参数：${row.paramId}`, {
    inputValue: String(row.value ?? ''),
    confirmButtonText: '保存',
    cancelButtonText: '取消',
  })
  await api.put(`/actions/admin/system/params/${row.paramId}`, { value })
  ElNotification({ title: '已保存', message: '参数已更新', type: 'success', duration: 2000 })
  await refresh()
}

async function restoreParam(row) {
  await ElMessageBox.confirm('确认恢复为默认值？', '恢复默认', { type: 'warning' })
  await api.post(`/actions/admin/system/params/${row.paramId}/restore`)
  ElNotification({ title: '已恢复', message: '参数已恢复默认', type: 'success', duration: 2000 })
  await refresh()
}

const ruleSimOption = computed(() => {
  const series = (data.value?.ruleSimLine || []).flatMap((r) => [
    {
      name: r.name,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      data: (r.points || []).map((p) => [p.x, p.y]),
    },
  ])
  const xAxis = (data.value?.ruleSimLine?.[0]?.points || []).map((p) => p.x)
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 8, left: 'center' },
    grid: { top: 56, left: 44, right: 18, bottom: 28, containLabel: true },
    xAxis: { type: 'category', data: xAxis },
    yAxis: { type: 'value', min: 0, max: 1 },
    series,
  }
})

const gaugeOption = computed(() => ({
  series: [
    {
      type: 'gauge',
      startAngle: 210,
      endAngle: -30,
      radius: '90%',
      center: ['50%', '55%'],
      progress: { show: true, width: 12 },
      axisLine: { lineStyle: { width: 12 } },
      splitLine: { length: 10, lineStyle: { width: 1 } },
      axisTick: { length: 6, lineStyle: { width: 1 } },
      axisLabel: { distance: 16 },
      pointer: { show: true, length: '70%', width: 4 },
      title: { fontSize: 12, offsetCenter: [0, '70%'] },
      detail: { fontSize: 18, offsetCenter: [0, '35%'] },
      data: [{ value: Number(data.value?.gauge?.maxRecommend || 0), name: '最大推荐数' }],
      min: 0,
      max: 50,
    },
  ],
}))

const logTypeOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { top: 24, left: 44, right: 18, bottom: 28, containLabel: true },
  xAxis: { type: 'category', data: (data.value?.logTypeDist || []).map((x) => x.name) },
  yAxis: { type: 'value', min: 0 },
  series: [
    {
      type: 'bar',
      barWidth: 20,
      itemStyle: { borderRadius: 8 },
      data: (data.value?.logTypeDist || []).map((x) => x.value),
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
              <div style="font-weight: 800">系统配置（管理员端）</div>
              <div style="font-size: 12px; color: #64748b">推荐规则 + 参数 + 日志</div>
            </div>
            <ElButton :loading="loading" @click="refresh">刷新</ElButton>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="14">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700">规则调整后推荐效果模拟（折线图）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="ruleSimOption" :height="320" />
          </ElSkeleton>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :lg="10">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700">系统核心参数（仪表盘）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="gaugeOption" :height="220" />
          </ElSkeleton>
          <div style="margin-top: 8px; font-size: 12px; color: #64748b; text-align: center">
            数据更新频率：{{ data?.gauge?.updateFreq }} 分钟
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="14">
        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px">
            <div style="font-weight: 700">推荐权重配置表</div>
            <div style="display: flex; gap: 8px">
              <ElButton size="small" @click="resetWeights">重置</ElButton>
              <ElButton size="small" type="primary" plain @click="saveWeights">保存</ElButton>
            </div>
          </div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="240px">
              <ElTable :data="data?.weightTable || []" size="small" style="width: 100%">
                <ElTableColumn prop="name" label="维度名称" min-width="140" />
                <ElTableColumn prop="baseWeight" label="基础权重" width="90">
                  <template #default="{ row }">
                    <el-input-number v-model="rowWeight(row).baseWeight" :min="0" :max="1" :step="0.01" controls-position="right" style="width: 100%" />
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="factor" label="调整系数" width="90">
                  <template #default="{ row }">{{ Number(row.factor).toFixed(2) }}</template>
                </ElTableColumn>
                <ElTableColumn prop="effectiveAt" label="生效时间" min-width="150" />
                <ElTableColumn label="操作" width="140" fixed="right">
                  <template #default>
                    <div style="display: flex; gap: 8px">
                      <ElButton size="small" @click="resetWeights">重置</ElButton>
                      <ElButton size="small" type="primary" plain @click="saveWeights">保存</ElButton>
                    </div>
                  </template>
                </ElTableColumn>
              </ElTable>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :lg="10">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700">系统参数管理表</div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="240px">
              <ElTable :data="data?.paramTable || []" size="small" style="width: 100%">
                <ElTableColumn prop="paramId" label="参数ID" width="110" />
                <ElTableColumn prop="name" label="参数名称" min-width="150" />
                <ElTableColumn prop="value" label="当前值" width="80" />
                <ElTableColumn prop="defaultValue" label="默认值" width="80" />
                <ElTableColumn prop="updatedBy" label="修改人" width="80" />
                <ElTableColumn label="操作" width="140" fixed="right">
                  <template #default="{ row }">
                    <div style="display: flex; gap: 8px">
                      <ElButton size="small" @click="editParam(row)">编辑</ElButton>
                      <ElButton size="small" type="warning" plain @click="restoreParam(row)">恢复默认</ElButton>
                    </div>
                  </template>
                </ElTableColumn>
              </ElTable>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="12">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700">日志类型分布（柱状图）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="logTypeOption" :height="260" />
          </ElSkeleton>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :lg="12">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700; margin-bottom: 10px">日志明细表</div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="260px">
              <ElTable :data="data?.logTable || []" size="small" style="width: 100%">
                <ElTableColumn prop="logId" label="日志ID" width="80" />
                <ElTableColumn prop="actor" label="操作人" width="70" />
                <ElTableColumn prop="type" label="操作类型" width="90" />
                <ElTableColumn prop="content" label="操作内容" min-width="160" />
                <ElTableColumn prop="occurredAt" label="操作时间" min-width="150" />
                <ElTableColumn prop="ip" label="IP" width="110" />
                <ElTableColumn prop="status" label="状态" width="70" />
              </ElTable>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>
