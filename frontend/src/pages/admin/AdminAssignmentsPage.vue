<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  ElButton,
  ElCard,
  ElCol,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
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
import { api } from '../lib/api'
import { usePageData } from '../lib/usePageData'

const { data, loading, refresh } = usePageData('/pages/admin/assignments')

const createDialog = ref(false)
const form = ref({
  title: '',
  description: '',
  deadline: '',
  resourceIds: [],
  targetScope: { type: 'class', values: [] },
})

const resourceOptions = ref([])

async function loadResources() {
  try {
    const resp = await api.get('/pages/resources')
    const resData = resp.data?.data
    if (Array.isArray(resData?.resources)) {
      resourceOptions.value = resData.resources.map((r) => ({ id: r.id, name: r.name, code: r.code }))
    } else if (Array.isArray(resData)) {
      resourceOptions.value = resData.map((r) => ({ id: r.id, name: r.name, code: r.code }))
    }
  } catch (e) {
    resourceOptions.value = []
  }
}

onMounted(loadResources)

const scopeTypeOptions = computed(() => {
  if (!data.value) return []
  if (form.value.targetScope.type === 'class') {
    return (data.value.classes || []).map((c) => ({ label: c, value: c }))
  }
  return (data.value.tagCategories || []).map((t) => ({ label: t, value: t }))
})

const completionDonutOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter(params) {
      const d = params.data
      return `${d.name}<br/>完成率: ${(d.value * 100).toFixed(1)}%<br/>已提交: ${d.submitted}/${d.total}`
    },
  },
  legend: { top: 8, left: 'center', type: 'scroll' },
  series: [
    {
      type: 'pie',
      radius: ['40%', '65%'],
      center: ['50%', '55%'],
      avoidLabelOverlap: true,
      label: { show: true, formatter: '{b}\n{d}%' },
      labelLine: { length: 14, length2: 12 },
      data: (data.value?.completionDonut || []).map((x) => ({
        name: x.name,
        value: x.value,
        submitted: x.submitted,
        total: x.total,
      })),
    },
  ],
}))

function openCreate() {
  form.value = { title: '', description: '', deadline: '', resourceIds: [], targetScope: { type: 'class', values: [] } }
  createDialog.value = true
}

async function submitCreate() {
  if (!form.value.title || !form.value.deadline) {
    ElMessage.warning('标题和截止日期为必填')
    return
  }
  try {
    await api.post('/actions/admin/assignments', {
      title: form.value.title,
      description: form.value.description,
      deadline: form.value.deadline,
      resourceIds: form.value.resourceIds,
      targetScope: form.value.targetScope,
    })
    ElMessage.success('作业创建成功')
    createDialog.value = false
    await refresh()
  } catch (e) {
    ElMessage.error('创建失败')
  }
}

async function deleteAssignment(row) {
  try {
    await api.delete(`/actions/admin/assignments/${row.id}`)
    ElMessage.success('删除成功')
    await refresh()
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div style="padding: 16px 16px 22px">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px">
            <div>
              <div style="font-weight: 800">作业管理</div>
              <div style="font-size: 12px; color: #64748b">创建作业、按班级或标签批量派发、查看完成率</div>
            </div>
            <div style="display: flex; gap: 10px; align-items: center">
              <ElButton type="primary" @click="openCreate">发布作业</ElButton>
              <ElButton :loading="loading" @click="refresh">刷新</ElButton>
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="10">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="font-weight: 700; margin-bottom: 10px">各作业完成率（环形图）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="completionDonutOption" :height="380" />
          </ElSkeleton>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :lg="14">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="font-weight: 700; margin-bottom: 10px">作业列表</div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="420px">
              <ElTable :data="data?.assignments || []" size="small" style="width: 100%">
                <ElTableColumn prop="title" label="标题" min-width="120" />
                <ElTableColumn label="截止日期" width="130">
                  <template #default="{ row }">{{ fmtDate(row.deadline) }}</template>
                </ElTableColumn>
                <ElTableColumn label="派发范围" width="120">
                  <template #default="{ row }">
                    <template v-if="row.targetScope?.type === 'class'">
                      <ElTag v-for="v in (row.targetScope.values || []).slice(0, 2)" :key="v" size="small" type="primary" effect="plain" style="margin: 2px">{{ v }}</ElTag>
                    </template>
                    <template v-else-if="row.targetScope?.type === 'tag'">
                      <ElTag v-for="v in (row.targetScope.values || []).slice(0, 2)" :key="v" size="small" type="warning" effect="plain" style="margin: 2px">{{ v }}</ElTag>
                    </template>
                    <ElTag v-else size="small" type="info" effect="plain">全部学生</ElTag>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="完成率" width="90">
                  <template #default="{ row }">
                    <ElTag :type="row.stats.completionRate >= 0.8 ? 'success' : row.stats.completionRate >= 0.5 ? 'warning' : 'danger'" effect="plain">
                      {{ (row.stats.completionRate * 100).toFixed(0) }}%
                    </ElTag>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="统计" width="160">
                  <template #default="{ row }">
                    <div style="font-size: 12px; line-height: 1.8">
                      <span style="color: #16a34a">已提交 {{ row.stats.submitted }}</span> /
                      <span style="color: #d97706">进行中 {{ row.stats.inProgress }}</span> /
                      <span style="color: #dc2626">逾期 {{ row.stats.overdue }}</span> /
                      总 {{ row.stats.total }}
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="关联资源" min-width="120">
                  <template #default="{ row }">
                    <div style="display: flex; gap: 4px; flex-wrap: wrap">
                      <ElTag v-for="r in (row.resourceList || []).slice(0, 2)" :key="r.id" size="small" type="info" effect="plain">{{ r.name.slice(0, 8) }}</ElTag>
                      <ElTag v-if="row.resourceList?.length > 2" size="small" type="info" effect="plain">+{{ row.resourceList.length - 2 }}</ElTag>
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="操作" width="80" fixed="right">
                  <template #default="{ row }">
                    <ElButton size="small" type="danger" plain @click="deleteAssignment(row)">删除</ElButton>
                  </template>
                </ElTableColumn>
              </ElTable>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElDialog v-model="createDialog" title="发布作业" width="600px" :close-on-click-modal="false">
      <ElForm label-position="top">
        <ElFormItem label="作业标题" required>
          <ElInput v-model="form.title" placeholder="请输入作业标题" maxlength="128" show-word-limit />
        </ElFormItem>
        <ElFormItem label="作业描述">
          <ElInput v-model="form.description" type="textarea" :rows="3" placeholder="可选，描述作业内容与要求" />
        </ElFormItem>
        <ElFormItem label="截止日期" required>
          <ElDatePicker v-model="form.deadline" type="datetime" placeholder="选择截止日期" style="width: 100%" value-format="YYYY-MM-DDTHH:mm:ssZ" />
        </ElFormItem>
        <ElFormItem label="关联资源">
          <ElSelect v-model="form.resourceIds" multiple placeholder="选择关联资源" style="width: 100%" filterable>
            <ElOption v-for="r in resourceOptions" :key="r.id" :label="`${r.name} (${r.code})`" :value="r.id" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="派发方式">
          <ElSelect v-model="form.targetScope.type" style="width: 100%; margin-bottom: 8px">
            <ElOption label="按班级派发" value="class" />
            <ElOption label="按标签派发" value="tag" />
            <ElOption label="全部学生" value="all" />
          </ElSelect>
          <ElSelect
            v-if="form.targetScope.type !== 'all'"
            v-model="form.targetScope.values"
            multiple
            :placeholder="form.targetScope.type === 'class' ? '选择班级' : '选择标签分类'"
            style="width: 100%"
          >
            <ElOption v-for="opt in scopeTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="createDialog = false">取消</ElButton>
        <ElButton type="primary" @click="submitCreate">确认发布</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
