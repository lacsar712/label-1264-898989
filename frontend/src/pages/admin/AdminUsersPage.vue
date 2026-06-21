<script setup>
import { computed, reactive, ref } from 'vue'
import {
  ElButton,
  ElCard,
  ElCol,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessageBox,
  ElNotification,
  ElOption,
  ElRow,
  ElSelect,
  ElSkeleton,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus'

import EChart from '../../components/EChart.vue'
import { api } from '../../lib/api'
import { usePageData } from '../../lib/usePageData'

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物']
const DEFAULT_STAGES = ['小学', '初中', '高中', '管理员']
const DEFAULT_TAGS = ['代数', '几何', '阅读理解', '语法']
const DEFAULT_BEHAVIOR_GROUPS = ['小学·低', '小学·中', '初中·中', '初中·高', '高中·中', '高中·高']

function safeNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function buildDefaultHeatmapRows() {
  return DEFAULT_STAGES.map((stage) => {
    const row = { stage }
    SUBJECTS.forEach((subject) => {
      row[subject] = 0
    })
    return row
  })
}

function buildDefaultTagPoints(stages) {
  const sourceStages = stages.length > 0 ? stages : DEFAULT_STAGES
  const points = []
  for (const stage of sourceStages) {
    for (const tagName of DEFAULT_TAGS) {
      points.push({ stage, tagName, weight: 0, userId: 0 })
    }
  }
  return points
}

const { data, loading, refresh } = usePageData('/pages/admin/users')

const pageData = computed(() => {
  const source = data.value || {}

  const heatmap = Array.isArray(source.heatmap) && source.heatmap.length > 0
    ? source.heatmap.map((row) => {
        const normalized = { stage: row?.stage || '未知学段' }
        SUBJECTS.forEach((subject) => {
          normalized[subject] = safeNumber(row?.[subject])
        })
        return normalized
      })
    : buildDefaultHeatmapRows()

  const userList = Array.isArray(source.userList)
    ? source.userList.map((user) => ({
        ...user,
        coreTags: Array.isArray(user?.coreTags) ? user.coreTags : [],
        subjectPreference: Array.isArray(user?.subjectPreference) ? user.subjectPreference : [],
      }))
    : []

  const behaviorTop10 = Array.isArray(source.behaviorTop10) && source.behaviorTop10.length > 0
    ? source.behaviorTop10.slice(0, 10).map((item) => ({
        name: item?.name || '未命名分组',
        click: safeNumber(item?.click),
        learnMinutes: Number(safeNumber(item?.learnMinutes).toFixed(1)),
      }))
    : DEFAULT_BEHAVIOR_GROUPS.map((name) => ({ name, click: 0, learnMinutes: 0 }))

  while (behaviorTop10.length < 10) {
    behaviorTop10.push({
      name: `分组#${behaviorTop10.length + 1}`,
      click: 0,
      learnMinutes: 0,
    })
  }

  const behaviorTable = Array.isArray(source.behaviorTable)
    ? source.behaviorTable
    : []

  const tagScatterStages = Array.isArray(source?.tagScatter?.stages) && source.tagScatter.stages.length > 0
    ? source.tagScatter.stages
    : DEFAULT_STAGES

  const rawPoints = Array.isArray(source?.tagScatter?.points)
    ? source.tagScatter.points
    : []

  const tagScatterPoints = rawPoints.length > 0
    ? rawPoints.map((point) => ({
        stage: point?.stage || '未知',
        tagName: point?.tagName || '未命名标签',
        weight: safeNumber(point?.weight),
        userId: point?.userId || 0,
      }))
    : buildDefaultTagPoints(tagScatterStages)

  const tagManageTable = Array.isArray(source.tagManageTable)
    ? source.tagManageTable.map((tag) => ({
        ...tag,
        weight: safeNumber(tag?.weight),
      }))
    : []

  return {
    heatmap,
    userList,
    behaviorTop10,
    behaviorTable,
    tagScatter: {
      stages: tagScatterStages,
      points: tagScatterPoints,
    },
    tagManageTable,
  }
})

const summaryCards = computed(() => {
  const users = pageData.value.userList
  const activeCount = users.filter((u) => u.active).length

  return [
    { label: '用户总数', value: users.length },
    { label: '当前启用', value: activeCount },
    { label: '行为记录', value: pageData.value.behaviorTable.length },
    { label: '标签总数', value: pageData.value.tagManageTable.length },
  ]
})

const heatmapOption = computed(() => {
  const rows = pageData.value.heatmap
  const stages = rows.map((r) => r.stage)

  const values = []
  for (let y = 0; y < stages.length; y += 1) {
    for (let x = 0; x < SUBJECTS.length; x += 1) {
      values.push([x, y, safeNumber(rows[y]?.[SUBJECTS[x]])])
    }
  }

  const maxValue = Math.max(1, ...values.map((v) => v[2]))

  return {
    tooltip: { position: 'top' },
    grid: { top: 24, left: 70, right: 92, bottom: 56, containLabel: true },
    xAxis: {
      type: 'category',
      data: SUBJECTS,
      splitArea: { show: true },
      axisLabel: { margin: 12, interval: 0 },
    },
    yAxis: {
      type: 'category',
      data: stages,
      splitArea: { show: true },
      axisLabel: { margin: 10 },
    },
    visualMap: {
      min: 0,
      max: maxValue,
      calculable: true,
      orient: 'vertical',
      right: 10,
      top: 'middle',
      itemHeight: 120,
      text: ['高', '低'],
    },
    series: [
      {
        type: 'heatmap',
        data: values,
        label: { show: true },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.2)' } },
      },
    ],
  }
})

const behaviorBarOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { top: 8, left: 'center' },
  grid: { top: 56, left: 44, right: 18, bottom: 42, containLabel: true },
  xAxis: {
    type: 'category',
    data: pageData.value.behaviorTop10.map((x) => x.name),
    axisLabel: { interval: 0, rotate: 20 },
  },
  yAxis: { type: 'value' },
  series: [
    { name: '点击', type: 'bar', barWidth: 14, data: pageData.value.behaviorTop10.map((x) => x.click) },
    { name: '学习时长(min)', type: 'bar', barWidth: 14, data: pageData.value.behaviorTop10.map((x) => x.learnMinutes) },
  ],
}))

const tagScatterOption = computed(() => {
  const points = pageData.value.tagScatter.points
  const stages = Array.from(new Set(points.map((p) => p.stage).filter(Boolean)))
  const tagNames = Array.from(new Set(points.map((p) => p.tagName).filter(Boolean))).slice(0, 24)

  const series = stages.map((stage) => ({
    name: stage,
    type: 'scatter',
    symbolSize: 10,
    data: points
      .filter((p) => p.stage === stage && tagNames.includes(p.tagName))
      .map((p) => ({
        value: [safeNumber(p.weight), p.tagName],
        userId: p.userId,
      })),
  }))

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        const weight = Number(p.value?.[0] || 0).toFixed(3)
        const tagName = p.value?.[1] || '-'
        const userId = p.data?.userId || '-'
        return `学段：${p.seriesName}<br/>标签：${tagName}<br/>权重：${weight}<br/>用户ID：${userId}`
      },
    },
    legend: { top: 8, left: 'center' },
    grid: { top: 56, left: 90, right: 18, bottom: 28, containLabel: true },
    xAxis: { type: 'value', min: 0, max: 1, name: '权重' },
    yAxis: { type: 'category', data: tagNames, name: '标签', axisLabel: { interval: 0 } },
    series,
  }
})

const userDetailOpen = ref(false)
const userEditOpen = ref(false)
const currentUser = ref(null)
const userEditForm = reactive({
  name: '',
  stage: '',
  learningStyle: '',
  subjectPreference: [],
})

function openUserDetail(row) {
  currentUser.value = row
  userDetailOpen.value = true
}

function openUserEdit(row) {
  currentUser.value = row
  userEditForm.name = row.name || ''
  userEditForm.stage = row.stage || ''
  userEditForm.learningStyle = row.learningStyle || ''
  userEditForm.subjectPreference = Array.isArray(row.subjectPreference) ? row.subjectPreference.slice() : []
  userEditOpen.value = true
}

async function saveUserEdit() {
  const user = currentUser.value
  if (!user) return

  await api.put(`/actions/admin/users/${user.userId}/profile`, {
    name: userEditForm.name,
    stage: userEditForm.stage,
    learningStyle: userEditForm.learningStyle,
    subjectPreference: userEditForm.subjectPreference,
  })

  ElNotification({ title: '已保存', message: '用户信息已更新', type: 'success', duration: 2000 })
  userEditOpen.value = false
  await refresh()
}

const tagDialogOpen = ref(false)
const tagDialogMode = ref('create')
const editingTagId = ref(null)
const tagForm = reactive({
  userId: null,
  name: '',
  category: '学习阶段',
  weight: 0.5,
})

function openCreateTag() {
  tagDialogMode.value = 'create'
  editingTagId.value = null
  tagForm.userId = pageData.value.userList[0]?.userId || null
  tagForm.name = ''
  tagForm.category = '学习阶段'
  tagForm.weight = 0.5
  tagDialogOpen.value = true
}

function openEditTag(row) {
  tagDialogMode.value = 'edit'
  editingTagId.value = row.tagId
  tagForm.userId = row.userId || null
  tagForm.name = row.tagName || ''
  tagForm.category = row.relatedBehavior || '学习阶段'
  tagForm.weight = safeNumber(row.weight)
  tagDialogOpen.value = true
}

async function saveTag() {
  if (!tagForm.userId || !tagForm.name) {
    ElNotification({ title: '提示', message: '请选择用户并填写标签名称', type: 'warning', duration: 2000 })
    return
  }

  if (tagDialogMode.value === 'create') {
    await api.post('/actions/admin/user-tags', {
      userId: tagForm.userId,
      name: tagForm.name,
      category: tagForm.category,
      weight: safeNumber(tagForm.weight),
    })
  } else {
    await api.put(`/actions/admin/user-tags/${editingTagId.value}`, {
      name: tagForm.name,
      category: tagForm.category,
      weight: safeNumber(tagForm.weight),
    })
  }

  tagDialogOpen.value = false
  await refresh()
}

async function deleteTag(row) {
  await ElMessageBox.confirm('确认删除该标签？', '删除确认', { type: 'warning' })
  await api.delete(`/actions/admin/user-tags/${row.tagId}`)
  await refresh()
}

async function toggleActive(row) {
  await api.post(`/actions/admin/users/${row.userId}/status`, { active: row.active })
  await refresh()
}
</script>

<template>
  <div class="admin-users-page">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard class="panel-card header-card">
          <div class="header-main">
            <div>
              <div class="page-title">用户管理（管理员端）</div>
              <div class="page-subtitle">用户全生命周期管理与画像分析</div>
            </div>
            <ElButton type="primary" plain :loading="loading" @click="refresh">刷新数据</ElButton>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" class="section-row">
      <ElCol v-for="item in summaryCards" :key="item.label" :xs="12" :sm="12" :lg="6">
        <ElCard class="panel-card stat-card" shadow="hover">
          <div class="stat-label">{{ item.label }}</div>
          <div class="stat-value">{{ item.value }}</div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" class="section-row">
      <ElCol :xs="24" :xl="13">
        <ElCard class="panel-card">
          <div class="card-title">用户画像分布（热力图）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="heatmapOption" :height="336" />
          </ElSkeleton>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :xl="11">
        <ElCard class="panel-card">
          <div class="card-title">用户行为分析（学段/活跃度 Top10）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="behaviorBarOption" :height="336" />
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" class="section-row">
      <ElCol :xs="24" :xl="14">
        <ElCard class="panel-card">
          <div class="card-title">用户列表</div>
          <ElSkeleton :loading="loading" animated>
            <div class="scroll-wrap">
              <el-scrollbar height="380px">
                <ElTable :data="pageData.userList" size="small" class="data-table" empty-text="暂无用户数据">
                  <ElTableColumn prop="userId" label="用户ID" width="80" />
                  <ElTableColumn prop="name" label="姓名" width="96" />
                  <ElTableColumn prop="stage" label="学段" width="76" />
                  <ElTableColumn prop="coreTags" label="核心标签" min-width="180">
                    <template #default="{ row }">
                      <div class="tag-chip-row">
                        <ElTag v-for="tag in row.coreTags" :key="tag" type="info" effect="plain">{{ tag }}</ElTag>
                      </div>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn prop="createdAt" label="注册时间" min-width="150" />
                  <ElTableColumn prop="activity" label="活跃度" width="76" />
                  <ElTableColumn label="启用" width="80">
                    <template #default="{ row }">
                      <ElSwitch v-model="row.active" @change="() => toggleActive(row)" />
                    </template>
                  </ElTableColumn>
                  <ElTableColumn label="操作" width="180" fixed="right">
                    <template #default="{ row }">
                      <div class="actions-row">
                        <ElButton size="small" @click="openUserDetail(row)">查看详情</ElButton>
                        <ElButton size="small" type="primary" plain @click="openUserEdit(row)">编辑</ElButton>
                      </div>
                    </template>
                  </ElTableColumn>
                </ElTable>
              </el-scrollbar>
            </div>
          </ElSkeleton>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :xl="10">
        <ElCard class="panel-card full-height">
          <div class="card-title">行为明细表</div>
          <ElSkeleton :loading="loading" animated>
            <div class="scroll-wrap">
              <el-scrollbar height="380px">
                <ElTable :data="pageData.behaviorTable" size="small" class="data-table" empty-text="暂无行为数据">
                  <ElTableColumn prop="userId" label="用户ID" width="80" />
                  <ElTableColumn prop="type" label="行为类型" width="88" />
                  <ElTableColumn prop="resourceId" label="资源ID" width="114" />
                  <ElTableColumn prop="occurredAt" label="操作时间" min-width="150" />
                  <ElTableColumn prop="dwellSeconds" label="停留(s)" width="86" />
                </ElTable>
              </el-scrollbar>
            </div>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" class="section-row">
      <ElCol :xs="24" :xl="12">
        <ElCard class="panel-card">
          <div class="card-title">用户标签管理（散点图：权重分布）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="tagScatterOption" :height="332" />
          </ElSkeleton>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :xl="12">
        <ElCard class="panel-card full-height">
          <div class="card-title-row">
            <div class="card-title no-margin">标签管理表</div>
            <ElButton size="small" type="primary" plain @click="openCreateTag">新增标签</ElButton>
          </div>
          <ElSkeleton :loading="loading" animated>
            <div class="scroll-wrap">
              <el-scrollbar height="332px">
                <ElTable :data="pageData.tagManageTable" size="small" class="data-table" empty-text="暂无标签数据">
                  <ElTableColumn prop="tagId" label="标签ID" width="80" />
                  <ElTableColumn prop="tagName" label="标签名称" min-width="120" />
                  <ElTableColumn prop="audience" label="适用人群" min-width="140" />
                  <ElTableColumn prop="relatedBehavior" label="关联行为" width="98" />
                  <ElTableColumn prop="weight" label="权重值" width="84">
                    <template #default="{ row }">
                      <ElTag type="success" effect="plain">{{ Number(row.weight).toFixed(3) }}</ElTag>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn label="操作" width="140" fixed="right">
                    <template #default="{ row }">
                      <div class="actions-row">
                        <ElButton size="small" @click="openEditTag(row)">编辑</ElButton>
                        <ElButton size="small" type="danger" plain @click="deleteTag(row)">删除</ElButton>
                      </div>
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

  <ElDialog v-model="userDetailOpen" title="用户详情" width="520px">
    <div v-if="currentUser" class="detail-content">
      <div>用户ID：{{ currentUser.userId }}</div>
      <div>姓名：{{ currentUser.name }}</div>
      <div>学段：{{ currentUser.stage }}</div>
      <div>学习风格：{{ currentUser.learningStyle }}</div>
      <div>
        学科偏好：
        <span v-if="(currentUser.subjectPreference || []).length === 0">-</span>
        <ElTag v-for="subject in currentUser.subjectPreference || []" :key="subject" type="info" effect="plain" style="margin-right: 6px">
          {{ subject }}
        </ElTag>
      </div>
    </div>
    <template #footer>
      <ElButton @click="userDetailOpen = false">关闭</ElButton>
    </template>
  </ElDialog>

  <ElDialog v-model="userEditOpen" title="编辑用户" width="520px">
    <ElForm label-width="90px">
      <ElFormItem label="姓名">
        <ElInput v-model="userEditForm.name" />
      </ElFormItem>
      <ElFormItem label="学段">
        <ElInput v-model="userEditForm.stage" placeholder="如：小学/初中/高中" />
      </ElFormItem>
      <ElFormItem label="学习风格">
        <ElInput v-model="userEditForm.learningStyle" placeholder="如：视觉型/听觉型/动觉型" />
      </ElFormItem>
      <ElFormItem label="学科偏好">
        <ElSelect v-model="userEditForm.subjectPreference" multiple filterable style="width: 100%">
          <ElOption label="语文" value="语文" />
          <ElOption label="数学" value="数学" />
          <ElOption label="英语" value="英语" />
          <ElOption label="物理" value="物理" />
          <ElOption label="化学" value="化学" />
          <ElOption label="生物" value="生物" />
        </ElSelect>
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="userEditOpen = false">取消</ElButton>
      <ElButton type="primary" @click="saveUserEdit">保存</ElButton>
    </template>
  </ElDialog>

  <ElDialog v-model="tagDialogOpen" :title="tagDialogMode === 'create' ? '新增标签' : '编辑标签'" width="520px">
    <ElForm label-width="90px">
      <ElFormItem label="用户">
        <ElSelect v-model="tagForm.userId" filterable style="width: 100%">
          <ElOption
            v-for="user in pageData.userList"
            :key="user.userId"
            :label="`${user.userId} · ${user.name} · ${user.stage}`"
            :value="user.userId"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="标签名称">
        <ElInput v-model="tagForm.name" placeholder="如：函数/阅读理解/视觉型" />
      </ElFormItem>
      <ElFormItem label="关联行为">
        <ElInput v-model="tagForm.category" placeholder="如：学习阶段/学科偏好/学习风格/行为标签" />
      </ElFormItem>
      <ElFormItem label="权重">
        <ElInputNumber v-model="tagForm.weight" :min="0" :max="1" :step="0.01" style="width: 100%" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="tagDialogOpen = false">取消</ElButton>
      <ElButton type="primary" @click="saveTag">保存</ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.admin-users-page {
  padding: 16px 16px 22px;
}

.section-row {
  margin-top: 16px;
}

.panel-card {
  border-radius: 14px;
  border: 1px solid #e7edf5;
}

.header-card :deep(.el-card__body) {
  padding: 16px 18px;
}

.header-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
}

.page-subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
}

.stat-card :deep(.el-card__body) {
  padding: 14px 16px;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
}

.stat-value {
  margin-top: 8px;
  font-size: 24px;
  line-height: 1;
  font-weight: 700;
  color: #0f172a;
}

.card-title {
  margin-bottom: 10px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.no-margin {
  margin-bottom: 0;
}

.full-height {
  height: 100%;
}

.scroll-wrap {
  border-radius: 10px;
  overflow: hidden;
}

.data-table :deep(.el-table__cell) {
  padding-top: 8px;
  padding-bottom: 8px;
}

.actions-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag-chip-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.detail-content {
  display: grid;
  gap: 8px;
}

@media (max-width: 992px) {
  .admin-users-page {
    padding: 12px 12px 20px;
  }

  .stat-value {
    font-size: 20px;
  }
}
</style>
