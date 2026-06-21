<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
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
  ElTag,
} from 'element-plus'
import { Clock, Document, Warning } from '@element-plus/icons-vue'

import { api } from '../lib/api'
import { usePageData } from '../lib/usePageData'

const router = useRouter()
const { data, loading, refresh } = usePageData('/pages/assignments')

const statusFilter = ref('')
const timeFilter = ref('')

const STATUS_LIST = ['待完成', '进行中', '已提交', '已逾期']

const STATUS_STYLE = {
  '待完成': { type: 'info', effect: 'plain' },
  '进行中': { type: 'warning', effect: 'plain' },
  '已提交': { type: 'success', effect: 'plain' },
  '已逾期': { type: 'danger', effect: 'dark' },
}

const filteredItems = computed(() => {
  let items = data.value?.items || []
  if (statusFilter.value) {
    items = items.filter((i) => i.status === statusFilter.value)
  }
  if (timeFilter.value) {
    const now = new Date()
    const cutoff = new Date()
    if (timeFilter.value === '7d') cutoff.setDate(now.getDate() - 7)
    else if (timeFilter.value === '30d') cutoff.setDate(now.getDate() - 30)
    else if (timeFilter.value === 'overdue') {
      items = items.filter((i) => i.isOverdue)
      return items
    }
    items = items.filter((i) => new Date(i.deadline) >= cutoff || new Date(i.createdAt) >= cutoff)
  }
  return items
})

const columns = computed(() => {
  const map = {}
  for (const s of STATUS_LIST) map[s] = []
  for (const item of filteredItems.value) {
    if (map[item.status]) map[item.status].push(item)
  }
  return map
})

const detailDialog = ref(false)
const currentItem = ref(null)
const detailResources = ref([])

function openDetail(item) {
  currentItem.value = item
  const rMap = data.value?.resourceMap || {}
  detailResources.value = (item.resourceIds || []).map((rid) => rMap[rid]).filter(Boolean)
  detailDialog.value = true
}

async function startAssignment(item) {
  try {
    await api.post(`/actions/assignments/${item.assignmentId}/start`)
    ElMessage.success('已开始作业')
    await refresh()
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

async function submitAssignment(item) {
  try {
    await api.post(`/actions/assignments/${item.assignmentId}/submit`)
    ElMessage.success('已提交作业')
    detailDialog.value = false
    await refresh()
  } catch (e) {
    ElMessage.error('提交失败')
  }
}

function goToResource(resourceId) {
  detailDialog.value = false
  router.push({ path: '/resources', query: { id: resourceId } })
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
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap">
            <div>
              <div style="font-weight: 800">我的作业</div>
              <div style="font-size: 12px; color: #64748b">按状态分栏浏览，逾期项醒目标注</div>
            </div>
            <div style="display: flex; gap: 10px; align-items: center">
              <ElSelect v-model="statusFilter" placeholder="状态筛选" clearable style="width: 130px">
                <ElOption v-for="s in STATUS_LIST" :key="s" :label="s" :value="s" />
              </ElSelect>
              <ElSelect v-model="timeFilter" placeholder="时间筛选" clearable style="width: 130px">
                <ElOption label="近7天" value="7d" />
                <ElOption label="近30天" value="30d" />
                <ElOption label="已逾期" value="overdue" />
              </ElSelect>
              <ElButton :loading="loading" @click="refresh">刷新</ElButton>
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElSkeleton :loading="loading" animated>
      <div style="display: flex; gap: 14px; margin-top: 16px; min-height: 500px">
        <div v-for="status in STATUS_LIST" :key="status" style="flex: 1; min-width: 0">
          <div
            :style="{
              fontWeight: 700,
              fontSize: '14px',
              padding: '10px 14px',
              borderRadius: '10px 10px 0 0',
              background: status === '已逾期' ? '#fef2f2' : status === '已提交' ? '#f0fdf4' : status === '进行中' ? '#fffbeb' : '#f8fafc',
              color: status === '已逾期' ? '#dc2626' : status === '已提交' ? '#16a34a' : status === '进行中' ? '#d97706' : '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }"
          >
            <el-icon v-if="status === '已逾期'" style="font-size: 16px"><Warning /></el-icon>
            <el-icon v-else-if="status === '进行中'" style="font-size: 16px"><Clock /></el-icon>
            <el-icon v-else style="font-size: 16px"><Document /></el-icon>
            {{ status }}
            <span style="font-weight: 400; font-size: 12px; margin-left: auto">({{ columns[status]?.length || 0 }})</span>
          </div>
          <div style="padding: 8px 6px; display: flex; flex-direction: column; gap: 10px; min-height: 200px">
            <ElCard
              v-for="item in columns[status] || []"
              :key="item.submissionId"
              shadow="hover"
              :style="{
                borderRadius: '10px',
                cursor: 'pointer',
                border: item.isOverdue ? '2px solid #fca5a5' : undefined,
                background: item.isOverdue ? '#fef2f2' : '#fff',
              }"
              @click="openDetail(item)"
            >
              <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px">{{ item.title }}</div>
              <div style="font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 4px">
                <el-icon style="font-size: 12px"><Clock /></el-icon>
                截止：{{ fmtDate(item.deadline) }}
              </div>
              <div v-if="item.isOverdue && item.status !== '已提交'" style="margin-top: 6px">
                <ElTag type="danger" effect="dark" size="small">已逾期</ElTag>
              </div>
              <div style="margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap">
                <ElTag v-for="rid in item.resourceIds?.slice(0, 2)" :key="rid" size="small" type="info" effect="plain">
                  {{ (data?.resourceMap?.[rid]?.name || '资源').slice(0, 8) }}
                </ElTag>
                <ElTag v-if="item.resourceIds?.length > 2" size="small" type="info" effect="plain">
                  +{{ item.resourceIds.length - 2 }}
                </ElTag>
              </div>
            </ElCard>
            <div v-if="!(columns[status] || []).length" style="text-align: center; padding: 30px 0; color: #94a3b8; font-size: 13px">
              暂无作业
            </div>
          </div>
        </div>
      </div>
    </ElSkeleton>

    <ElDialog v-model="detailDialog" :title="currentItem?.title || '作业详情'" width="560px">
      <div v-if="currentItem" style="display: flex; flex-direction: column; gap: 14px">
        <div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 4px">状态</div>
          <ElTag v-bind="STATUS_STYLE[currentItem.status]">{{ currentItem.status }}</ElTag>
        </div>
        <div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 4px">描述</div>
          <div style="font-size: 14px">{{ currentItem.description || '暂无描述' }}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 4px">截止日期</div>
          <div :style="{ color: currentItem.isOverdue ? '#dc2626' : '#1e293b', fontWeight: 600 }">{{ fmtDate(currentItem.deadline) }}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 4px">关联资源</div>
          <div style="display: flex; flex-direction: column; gap: 6px">
            <div
              v-for="r in detailResources"
              :key="r.id"
              style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 8px; background: #f8fafc; cursor: pointer"
              @click="goToResource(r.id)"
            >
              <div>
                <div style="font-weight: 600; font-size: 13px">{{ r.name }}</div>
                <div style="font-size: 12px; color: #94a3b8">{{ r.subject }} · {{ r.type }}</div>
              </div>
              <ElButton size="small" type="primary" plain>前往</ElButton>
            </div>
            <div v-if="!detailResources.length" style="color: #94a3b8; font-size: 13px">暂无关联资源</div>
          </div>
        </div>
        <div v-if="currentItem.submittedAt">
          <div style="font-size: 12px; color: #64748b; margin-bottom: 4px">提交时间</div>
          <div style="font-size: 14px">{{ fmtDate(currentItem.submittedAt) }}</div>
        </div>
      </div>
      <template #footer>
        <ElButton @click="detailDialog = false">关闭</ElButton>
        <ElButton
          v-if="currentItem?.status === '待完成' || currentItem?.status === '已逾期'"
          type="warning"
          @click="startAssignment(currentItem); detailDialog = false"
        >
          开始作业
        </ElButton>
        <ElButton
          v-if="currentItem?.status === '进行中' || currentItem?.status === '已逾期'"
          type="success"
          @click="submitAssignment(currentItem)"
        >
          提交作业
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>
