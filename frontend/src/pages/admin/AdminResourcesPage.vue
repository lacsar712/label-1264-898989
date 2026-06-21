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
  ElTable,
  ElTableColumn,
  ElTag,
  ElTree,
} from 'element-plus'

import EChart from '../../components/EChart.vue'
import { api } from '../../lib/api'
import { usePageData } from '../../lib/usePageData'

const { data, loading, refresh } = usePageData('/pages/admin/resources')

const statusDonutOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { top: 8, left: 'center' },
  series: [
    {
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '56%'],
      label: { formatter: '{b} {d}%' },
      labelLine: { length: 14, length2: 12 },
      data: (data.value?.statusDonut || []).map((x) => ({ name: x.name, value: x.value })),
    },
  ],
}))

const effectTrendOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { top: 24, left: 44, right: 18, bottom: 28, containLabel: true },
  xAxis: { type: 'category', data: (data.value?.effectTrend || []).map((x) => x.date) },
  yAxis: { type: 'value', min: 0, max: 1 },
  series: [
    {
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 7,
      data: (data.value?.effectTrend || []).map((x) => Number(x.completionRate || 0)),
    },
  ],
}))

const resourceEditOpen = ref(false)
const currentResource = ref(null)
const resourceEditForm = reactive({
  name: '',
  subject: '',
  type: '课程',
  difficulty: '基础',
  status: '上架',
  heat: 0,
})

function openEdit(row) {
  currentResource.value = row
  resourceEditForm.name = row.name || ''
  resourceEditForm.subject = row.subject || ''
  resourceEditForm.type = row.type || '课程'
  resourceEditForm.difficulty = row.difficulty || '基础'
  resourceEditForm.status = row.status || '上架'
  resourceEditForm.heat = 0
  resourceEditOpen.value = true
}

async function saveEdit() {
  const r = currentResource.value
  if (!r) return
  await api.put(`/actions/admin/resources/${r.resourceId}`, {
    name: resourceEditForm.name,
    subject: resourceEditForm.subject,
    type: resourceEditForm.type,
    difficulty: resourceEditForm.difficulty,
    status: resourceEditForm.status,
    heat: Number(resourceEditForm.heat),
  })
  ElNotification({ title: '已保存', message: '资源信息已更新', type: 'success', duration: 2000 })
  resourceEditOpen.value = false
  await refresh()
}

async function takeDown(row) {
  await api.post(`/actions/admin/resources/${row.resourceId}/take-down`)
  await refresh()
}

async function review(row, status) {
  await api.post(`/actions/admin/resources/${row.resourceId}/review`, { status })
  await refresh()
}

async function remove(row) {
  await ElMessageBox.confirm('确认删除该资源？删除后将不再展示。', '删除确认', { type: 'warning' })
  await api.delete(`/actions/admin/resources/${row.resourceId}`)
  await refresh()
}

const categoryDialogOpen = ref(false)
const categoryDialogMode = ref('create')
const categoryForm = reactive({
  categoryId: '',
  categoryName: '',
  parentCategory: '课程',
  subject: '数学',
  type: '课程',
  sortOrder: 1,
  targetCategoryId: '',
})

function openCreateCategory() {
  categoryDialogMode.value = 'create'
  categoryForm.categoryId = ''
  categoryForm.categoryName = '数学'
  categoryForm.parentCategory = '课程'
  categoryForm.subject = '数学'
  categoryForm.type = '课程'
  categoryForm.sortOrder = 1
  categoryForm.targetCategoryId = ''
  categoryDialogOpen.value = true
}

function openEditCategory(row) {
  categoryDialogMode.value = 'edit'
  categoryForm.categoryId = row.categoryId
  categoryForm.categoryName = row.categoryName || row.subject || ''
  categoryForm.parentCategory = row.parentCategory || row.type || '课程'
  categoryForm.subject = row.subject || row.categoryName || ''
  categoryForm.type = row.type || row.parentCategory || '课程'
  categoryForm.sortOrder = Number(row.sortOrder || 0)
  categoryForm.targetCategoryId = ''
  categoryDialogOpen.value = true
}

function openMergeCategory(row) {
  const allRows = data.value?.categoryTable || []
  const target = allRows.find((x) => x.categoryId !== row.categoryId)
  if (!target) {
    ElNotification({ title: '提示', message: '暂无可合并目标分类', type: 'warning', duration: 2000 })
    return
  }
  categoryDialogMode.value = 'merge'
  categoryForm.categoryId = row.categoryId
  categoryForm.categoryName = row.categoryName || row.subject || ''
  categoryForm.parentCategory = row.parentCategory || row.type || '课程'
  categoryForm.subject = row.subject || row.categoryName || ''
  categoryForm.type = row.type || row.parentCategory || '课程'
  categoryForm.sortOrder = Number(row.sortOrder || 0)
  categoryForm.targetCategoryId = target.categoryId
  categoryDialogOpen.value = true
}

async function submitCategoryDialog() {
  if (categoryDialogMode.value === 'create') {
    await api.post('/actions/admin/resource-categories', {
      categoryName: categoryForm.categoryName,
      parentCategory: categoryForm.parentCategory,
      subject: categoryForm.subject,
      type: categoryForm.type,
      sortOrder: Number(categoryForm.sortOrder || 0),
    })
  } else if (categoryDialogMode.value === 'edit') {
    await api.put(`/actions/admin/resource-categories/${categoryForm.categoryId}`, {
      categoryName: categoryForm.categoryName,
      parentCategory: categoryForm.parentCategory,
      subject: categoryForm.subject,
      type: categoryForm.type,
      sortOrder: Number(categoryForm.sortOrder || 0),
    })
  } else {
    await api.post(`/actions/admin/resource-categories/${categoryForm.categoryId}/merge`, {
      targetCategoryId: categoryForm.targetCategoryId,
    })
  }
  categoryDialogOpen.value = false
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
              <div style="font-weight: 800">资源管理（管理员端）</div>
              <div style="font-size: 12px; color: #64748b">资源全流程管理 + 状态监控</div>
            </div>
            <ElButton :loading="loading" @click="refresh">刷新</ElButton>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="10">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700">资源状态分析（环形图）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="statusDonutOption" :height="320" />
          </ElSkeleton>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :lg="14">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700; margin-bottom: 10px">资源全量表</div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="320px">
              <ElTable :data="data?.resourceTable || []" size="small" style="width: 100%">
                <ElTableColumn prop="resourceId" label="资源ID" width="110" />
                <ElTableColumn prop="name" label="名称" min-width="180" />
                <ElTableColumn prop="subject" label="学科" width="70" />
                <ElTableColumn prop="type" label="类型" width="70" />
                <ElTableColumn prop="difficulty" label="难度" width="70" />
                <ElTableColumn prop="status" label="状态" width="80" />
                <ElTableColumn prop="uploadedAt" label="上传时间" min-width="150" />
                <ElTableColumn label="操作" width="260" fixed="right">
                  <template #default="{ row }">
                    <div style="display: flex; gap: 8px; flex-wrap: wrap">
                      <ElButton size="small" @click="openEdit(row)">编辑</ElButton>
                      <ElButton size="small" type="primary" plain @click="review(row, '上架')">审核通过</ElButton>
                      <ElButton size="small" type="warning" plain @click="review(row, '审核中')">转审核</ElButton>
                      <ElButton size="small" type="danger" plain @click="takeDown(row)">下架</ElButton>
                      <ElButton size="small" type="danger" @click="remove(row)">删除</ElButton>
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
          <div style="font-weight: 700">资源使用效果（近30天完成率）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="effectTrendOption" :height="240" />
          </ElSkeleton>
          <div style="margin-top: 12px">
            <div style="font-weight: 700; margin-bottom: 10px">效果分析表</div>
            <ElSkeleton :loading="loading" animated>
              <el-scrollbar height="240px">
                <ElTable :data="data?.effectTable || []" size="small" style="width: 100%">
                  <ElTableColumn prop="resourceId" label="资源ID" width="110" />
                  <ElTableColumn prop="name" label="名称" min-width="160" />
                  <ElTableColumn prop="learners" label="学习人数" width="80" />
                  <ElTableColumn prop="completionRate" label="完成率" width="80">
                    <template #default="{ row }">
                      <ElTag type="success" effect="plain">{{ (Number(row.completionRate) * 100).toFixed(1) }}%</ElTag>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn prop="goodRate" label="好评率" width="80">
                    <template #default="{ row }">
                      <ElTag type="info" effect="plain">{{ (Number(row.goodRate) * 100).toFixed(1) }}%</ElTag>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn prop="wrongRel" label="错题关联数" width="95" />
                  <ElTableColumn prop="suggestion" label="优化建议" min-width="160" />
                </ElTable>
              </el-scrollbar>
            </ElSkeleton>
          </div>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :lg="12">
        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px">
            <div style="font-weight: 700">资源分类管理（树状图 + 配置表）</div>
            <ElButton size="small" type="primary" plain @click="openCreateCategory">新增分类</ElButton>
          </div>
          <ElSkeleton :loading="loading" animated>
            <ElRow :gutter="12">
              <ElCol :span="10">
                <el-scrollbar height="240px">
                  <ElTree :data="data?.categoryTree || []" node-key="id" :default-expand-all="true" />
                </el-scrollbar>
              </ElCol>
              <ElCol :span="14">
                <el-scrollbar height="240px">
                  <ElTable :data="data?.categoryTable || []" size="small" style="width: 100%">
                    <ElTableColumn prop="categoryId" label="分类ID" min-width="130" />
                    <ElTableColumn prop="categoryName" label="分类名称" min-width="90" />
                    <ElTableColumn prop="parentCategory" label="上级分类" width="90" />
                    <ElTableColumn prop="resourceCount" label="资源数" width="70" />
                    <ElTableColumn prop="sortOrder" label="排序值" width="70" />
                    <ElTableColumn label="操作" width="140" fixed="right">
                      <template #default="{ row }">
                        <div style="display: flex; gap: 8px">
                          <ElButton size="small" @click="openEditCategory(row)">编辑</ElButton>
                          <ElButton size="small" type="warning" plain @click="openMergeCategory(row)">合并</ElButton>
                        </div>
                      </template>
                    </ElTableColumn>
                  </ElTable>
                </el-scrollbar>
              </ElCol>
            </ElRow>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>

  <ElDialog v-model="resourceEditOpen" title="编辑资源" width="560px">
    <ElForm label-width="90px">
      <ElFormItem label="名称">
        <ElInput v-model="resourceEditForm.name" />
      </ElFormItem>
      <ElFormItem label="学科">
        <ElInput v-model="resourceEditForm.subject" placeholder="如：数学/英语/物理" />
      </ElFormItem>
      <ElFormItem label="类型">
        <ElSelect v-model="resourceEditForm.type" style="width: 100%">
          <ElOption label="课程" value="课程" />
          <ElOption label="课件" value="课件" />
          <ElOption label="题库" value="题库" />
          <ElOption label="视频" value="视频" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="难度">
        <ElSelect v-model="resourceEditForm.difficulty" style="width: 100%">
          <ElOption label="基础" value="基础" />
          <ElOption label="提高" value="提高" />
          <ElOption label="挑战" value="挑战" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="状态">
        <ElSelect v-model="resourceEditForm.status" style="width: 100%">
          <ElOption label="上架" value="上架" />
          <ElOption label="下架" value="下架" />
          <ElOption label="审核中" value="审核中" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="热度">
        <ElInputNumber v-model="resourceEditForm.heat" :min="0" :max="99999" style="width: 100%" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="resourceEditOpen = false">取消</ElButton>
      <ElButton type="primary" @click="saveEdit">保存</ElButton>
    </template>
  </ElDialog>

  <ElDialog
    v-model="categoryDialogOpen"
    :title="categoryDialogMode === 'create' ? '新增分类' : categoryDialogMode === 'edit' ? '编辑分类' : '合并分类'"
    width="560px"
  >
    <ElForm label-width="90px">
      <template v-if="categoryDialogMode === 'merge'">
        <ElFormItem label="源分类">
          <ElInput :model-value="`${categoryForm.categoryId} · ${categoryForm.categoryName}/${categoryForm.parentCategory}`" disabled />
        </ElFormItem>
        <ElFormItem label="目标分类">
          <ElSelect v-model="categoryForm.targetCategoryId" style="width: 100%">
            <ElOption
              v-for="row in (data?.categoryTable || []).filter((x) => x.categoryId !== categoryForm.categoryId)"
              :key="row.categoryId"
              :label="`${row.categoryId} · ${row.categoryName}/${row.parentCategory}`"
              :value="row.categoryId"
            />
          </ElSelect>
        </ElFormItem>
      </template>
      <template v-else>
        <ElFormItem label="分类名称">
          <ElInput v-model="categoryForm.categoryName" placeholder="如：数学/英语/物理" />
        </ElFormItem>
        <ElFormItem label="上级分类">
          <ElSelect v-model="categoryForm.parentCategory" style="width: 100%">
            <ElOption label="课程" value="课程" />
            <ElOption label="课件" value="课件" />
            <ElOption label="题库" value="题库" />
            <ElOption label="视频" value="视频" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="学科字段">
          <ElInput v-model="categoryForm.subject" placeholder="与资源 subject 对齐" />
        </ElFormItem>
        <ElFormItem label="类型字段">
          <ElSelect v-model="categoryForm.type" style="width: 100%">
            <ElOption label="课程" value="课程" />
            <ElOption label="课件" value="课件" />
            <ElOption label="题库" value="题库" />
            <ElOption label="视频" value="视频" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="排序值">
          <ElInputNumber v-model="categoryForm.sortOrder" :min="0" :max="9999" style="width: 100%" />
        </ElFormItem>
      </template>
    </ElForm>
    <template #footer>
      <ElButton @click="categoryDialogOpen = false">取消</ElButton>
      <ElButton type="primary" @click="submitCategoryDialog">确认</ElButton>
    </template>
  </ElDialog>
</template>
