<script setup>
import { computed, ref, watch } from 'vue'
import {
  ElButton,
  ElCard,
  ElCol,
  ElCollapse,
  ElCollapseItem,
  ElDialog,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElPopconfirm,
  ElRow,
  ElSelect,
  ElSkeleton,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTooltip,
} from 'element-plus'
import { Folder, FolderAdd, Edit, Delete, Sort, SetUp } from '@element-plus/icons-vue'

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

const activeCollapse = ref([])

const createFolderDialog = ref(false)
const newFolderName = ref('')
const newFolderParentId = ref(null)

const renameDialog = ref(false)
const renamingFolderId = ref(null)
const renamingFolderName = ref('')

const moveDialog = ref(false)
const movingRowId = ref(null)
const moveTargetFolderId = ref(null)

const favoriteFolders = computed(() => data.value?.favoriteFolders || [])
const favoriteGroups = computed(() => data.value?.favoriteGroups || [])

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

function openCreateFolder() {
  newFolderName.value = ''
  newFolderParentId.value = null
  createFolderDialog.value = true
}

async function confirmCreateFolder() {
  if (!newFolderName.value.trim()) {
    ElMessage.warning('请输入收藏夹名称')
    return
  }
  await api.post('/actions/favorite-folders', {
    name: newFolderName.value.trim(),
    parentId: newFolderParentId.value || null,
  })
  createFolderDialog.value = false
  ElMessage.success('创建成功')
  await refresh()
}

function openRenameFolder(folder) {
  renamingFolderId.value = folder.id
  renamingFolderName.value = folder.name
  renameDialog.value = true
}

async function confirmRenameFolder() {
  if (!renamingFolderName.value.trim()) {
    ElMessage.warning('请输入收藏夹名称')
    return
  }
  await api.put(`/actions/favorite-folders/${renamingFolderId.value}/rename`, {
    name: renamingFolderName.value.trim(),
  })
  renameDialog.value = false
  ElMessage.success('重命名成功')
  await refresh()
}

async function deleteFolder(folder) {
  await ElMessageBox.confirm(
    `确认删除收藏夹「${folder.name}」？夹内资源将移至默认收藏夹。`,
    '删除收藏夹',
    { type: 'warning' }
  )
  await api.delete(`/actions/favorite-folders/${folder.id}`)
  ElMessage.success('删除成功，资源已迁移至默认收藏夹')
  await refresh()
}

function openMoveDialog(row) {
  movingRowId.value = row.id
  moveTargetFolderId.value = row.folderId || null
  moveDialog.value = true
}

async function confirmMoveResource() {
  await api.post(`/actions/user-resources/${movingRowId.value}/move-to-folder`, {
    folderId: moveTargetFolderId.value || null,
  })
  moveDialog.value = false
  ElMessage.success('移动成功')
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
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px">
            <div style="font-weight: 700">我的收藏 / 待学（按收藏夹分组）</div>
            <div style="display: flex; gap: 8px">
              <ElTooltip content="新建收藏夹">
                <ElButton size="small" type="primary" :icon="FolderAdd" @click="openCreateFolder">新建</ElButton>
              </ElTooltip>
            </div>
          </div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="420px">
              <ElCollapse v-model="activeCollapse">
                <ElCollapseItem
                  v-for="group in favoriteGroups"
                  :key="group.id"
                  :name="String(group.id)"
                >
                  <template #title>
                    <div style="display: flex; align-items: center; gap: 8px; width: 100%; padding-right: 12px">
                      <Folder style="color: #2563eb" />
                      <span style="font-weight: 600">{{ group.name }}</span>
                      <ElTag size="small" type="info" effect="plain">{{ group.resourceCount }} 条</ElTag>
                      <ElTag v-if="group.isDefault" size="small" type="warning" effect="plain">默认</ElTag>
                      <div style="margin-left: auto; display: flex; gap: 4px" @click.stop>
                        <ElTooltip v-if="!group.isDefault" content="重命名">
                          <ElButton link type="primary" size="small" :icon="Edit" @click.stop="openRenameFolder(group)" />
                        </ElTooltip>
                        <ElPopconfirm
                          v-if="!group.isDefault"
                          title="确认删除此收藏夹？资源将迁移至默认收藏夹"
                          confirm-button-text="删除"
                          cancel-button-text="取消"
                          @confirm="deleteFolder(group)"
                        >
                          <template #reference>
                            <ElTooltip content="删除">
                              <ElButton link type="danger" size="small" :icon="Delete" @click.stop />
                            </ElTooltip>
                          </template>
                        </ElPopconfirm>
                      </div>
                    </div>
                  </template>
                  <ElTable v-if="group.items.length > 0" :data="group.items" size="small" style="width: 100%">
                    <ElTableColumn prop="name" label="资源名称" min-width="140" />
                    <ElTableColumn prop="favoritedAt" label="收藏时间" min-width="130" />
                    <ElTableColumn prop="progressPercent" label="进度" width="60">
                      <template #default="{ row }">{{ row.progressPercent }}%</template>
                    </ElTableColumn>
                    <ElTableColumn prop="status" label="状态" width="60" />
                    <ElTableColumn label="操作" width="220" fixed="right">
                      <template #default="{ row }">
                        <div style="display: flex; gap: 6px; flex-wrap: wrap">
                          <ElButton size="small" plain @click="openMoveDialog(row)">移动</ElButton>
                          <ElButton size="small" type="primary" plain @click="moveToQueue(row)">移至待学</ElButton>
                          <ElButton size="small" type="danger" plain @click="removeRow(row)">删除</ElButton>
                        </div>
                      </template>
                    </ElTableColumn>
                  </ElTable>
                  <div v-else style="text-align: center; padding: 20px 0; color: #94a3b8; font-size: 13px">
                    暂无收藏资源
                  </div>
                </ElCollapseItem>
              </ElCollapse>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElDialog v-model="createFolderDialog" title="新建收藏夹" width="420px">
      <div style="display: flex; flex-direction: column; gap: 16px">
        <div>
          <div style="font-size: 13px; color: #475569; margin-bottom: 6px">收藏夹名称</div>
          <ElInput v-model="newFolderName" placeholder="如：期末复习、日常积累" maxlength="64" show-word-limit />
        </div>
        <div>
          <div style="font-size: 13px; color: #475569; margin-bottom: 6px">上级收藏夹（可选）</div>
          <ElSelect v-model="newFolderParentId" placeholder="无（根目录）" clearable style="width: 100%">
            <ElOption
              v-for="f in favoriteFolders.filter((x) => !x.isDefault)"
              :key="f.id"
              :label="f.name"
              :value="f.id"
            />
          </ElSelect>
        </div>
      </div>
      <template #footer>
        <ElButton @click="createFolderDialog = false">取消</ElButton>
        <ElButton type="primary" @click="confirmCreateFolder">创建</ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="renameDialog" title="重命名收藏夹" width="400px">
      <ElInput v-model="renamingFolderName" placeholder="请输入新名称" maxlength="64" show-word-limit />
      <template #footer>
        <ElButton @click="renameDialog = false">取消</ElButton>
        <ElButton type="primary" @click="confirmRenameFolder">确认</ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="moveDialog" title="移动到收藏夹" width="400px">
      <ElSelect v-model="moveTargetFolderId" placeholder="选择目标收藏夹" style="width: 100%">
        <ElOption v-for="f in favoriteFolders" :key="f.id" :label="f.name + (f.isDefault ? '（默认）' : '')" :value="f.id" />
      </ElSelect>
      <template #footer>
        <ElButton @click="moveDialog = false">取消</ElButton>
        <ElButton type="primary" @click="confirmMoveResource">移动</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
