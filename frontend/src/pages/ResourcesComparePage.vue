<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ElButton,
  ElCard,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTooltip,
  ElMessage,
  ElMessageBox,
  ElSkeleton,
  ElRate,
} from 'element-plus'
import { ArrowLeft, Share2, Trash, Scale } from '@element-plus/icons-vue'
import { api } from '../lib/api'
import { useCompare } from '../stores/compare'

const route = useRoute()
const router = useRouter()
const { selectedResources, setResources, removeFromCompare, clearCompare, decodeFromUrl, canCompare, MAX_COMPARE, MIN_COMPARE } = useCompare()

const loading = ref(false)
const resources = ref([])

const compareFields = [
  { key: 'subject', label: '学科' },
  { key: 'type', label: '类型' },
  { key: 'difficulty', label: '难度' },
  { key: 'heat', label: '热度' },
  { key: 'rating', label: '评分' },
  { key: 'estimatedHours', label: '预计学时' },
  { key: 'tags', label: '标签' },
]

const diffMap = computed(() => {
  const result = {}
  compareFields.forEach((field) => {
    const values = resources.value.map((r) => {
      const v = r[field.key]
      return Array.isArray(v) ? v.sort().join(',') : String(v)
    })
    const unique = [...new Set(values)]
    result[field.key] = unique.length > 1
  })
  return result
})

function isDiff(fieldKey) {
  return diffMap.value[fieldKey]
}

function formatValue(resource, fieldKey) {
  const v = resource[fieldKey]
  if (fieldKey === 'rating') {
    return Number(v).toFixed(1)
  }
  if (fieldKey === 'estimatedHours') {
    return `${Number(v).toFixed(1)} 小时`
  }
  if (fieldKey === 'heat') {
    return Number(v).toLocaleString()
  }
  return v
}

function getDifficultyColor(d) {
  if (d === '基础') return '#10b981'
  if (d === '提高') return '#f59e0b'
  if (d === '挑战') return '#ef4444'
  return '#64748b'
}

function getTypeColor(t) {
  if (t === '课程') return '#3b82f6'
  if (t === '课件') return '#8b5cf6'
  if (t === '题库') return '#f59e0b'
  if (t === '视频') return '#ec4899'
  return '#64748b'
}

async function loadFromUrl(codes) {
  if (!codes || codes.length === 0) return
  if (codes.length < MIN_COMPARE || codes.length > MAX_COMPARE) {
    ElMessage.warning(`请选择 ${MIN_COMPARE}-${MAX_COMPARE} 个资源进行对比`)
    return
  }
  loading.value = true
  try {
    const resp = await api.get(`/actions/resources/detail?codes=${encodeURIComponent(codes.join(','))}`)
    if (resp.data?.ok) {
      const data = resp.data.data
      if (data.length >= MIN_COMPARE) {
        resources.value = data
        setResources(data)
      } else {
        ElMessage.warning('未找到足够的资源进行对比')
        setTimeout(() => router.push('/resources'), 1500)
      }
    }
  } catch (e) {
    ElMessage.error('加载资源详情失败')
  } finally {
    loading.value = false
  }
}

function loadFromStore() {
  if (canCompare.value) {
    resources.value = [...selectedResources.value]
  }
}

async function copyShareLink() {
  const codes = resources.value.map((r) => r.resourceId).join(',')
  const url = `${window.location.origin}${router.resolve('/resources/compare').href}?codes=${encodeURIComponent(codes)}`
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success('分享链接已复制到剪贴板')
  } catch {
    const input = document.createElement('textarea')
    input.value = url
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    ElMessage.success('分享链接已复制')
  }
}

function handleRemove(resourceId) {
  removeFromCompare(resourceId)
  resources.value = resources.value.filter((r) => r.resourceId !== resourceId)
  if (resources.value.length < MIN_COMPARE) {
    ElMessage.info(`至少需要 ${MIN_COMPARE} 个资源才能对比，即将返回资源库`)
    setTimeout(() => router.push('/resources'), 1500)
  }
}

function handleClear() {
  ElMessageBox.confirm('确定清空所有对比资源？', '提示', { type: 'warning' }).then(() => {
    clearCompare()
    resources.value = []
    router.push('/resources')
  }).catch(() => {})
}

onMounted(() => {
  const codesParam = route.query.codes
  if (codesParam) {
    const codes = decodeFromUrl(codesParam)
    if (codes.length >= MIN_COMPARE) {
      loadFromUrl(codes)
      return
    }
  }
  loadFromStore()
  if (resources.value.length < MIN_COMPARE) {
    ElMessage.warning(`请先选择至少 ${MIN_COMPARE} 个资源`)
    setTimeout(() => router.push('/resources'), 1500)
  }
})
</script>

<template>
  <div style="padding: 16px 16px 22px">
    <ElCard style="border-radius: 14px; margin-bottom: 16px">
      <div style="display: flex; align-items: center; justify-content: space-between">
        <div style="display: flex; align-items: center; gap: 12px">
          <ElButton :icon="ArrowLeft" text @click="router.push('/resources')">
            返回资源库
          </ElButton>
          <div style="display: flex; align-items: center; gap: 8px">
            <Scale style="width: 20px; height: 20px; color: #2563eb" />
            <span style="font-weight: 700; font-size: 16px">资源对比</span>
            <ElTag size="small" type="info">
              {{ resources.length }} 个资源
            </ElTag>
          </div>
        </div>
        <div style="display: flex; gap: 8px">
          <ElTooltip content="复制分享链接">
            <ElButton :icon="Share2" @click="copyShareLink">
              分享
            </ElButton>
          </ElTooltip>
          <ElTooltip content="清空对比">
            <ElButton :icon="Trash" type="danger" plain @click="handleClear" />
          </ElTooltip>
        </div>
      </div>
    </ElCard>

    <ElSkeleton :loading="loading" animated>
      <ElCard v-if="resources.length > 0" style="border-radius: 14px">
        <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px">
          <span style="font-size: 12px; color: #64748b">
            <span style="display: inline-block; width: 12px; height: 12px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 3px; margin-right: 4px; vertical-align: middle"></span>
            黄色高亮表示该字段存在差异
          </span>
        </div>
        <el-scrollbar>
          <ElTable :data="compareFields" border size="default" style="width: 100%">
            <ElTableColumn label="对比项" width="120" fixed="left">
              <template #default="{ row }">
                <div style="font-weight: 600; color: #334155">
                  {{ row.label }}
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn
              v-for="(res, idx) in resources"
              :key="res.resourceId"
              :label="`资源 ${idx + 1}`"
              :min-width="200"
            >
              <template #header>
                <div style="display: flex; flex-direction: column; gap: 4px; padding: 8px 0">
                  <div style="display: flex; align-items: center; justify-content: space-between">
                    <span style="font-weight: 600; color: #2563eb">资源 {{ idx + 1 }}</span>
                    <ElButton
                      link
                      type="danger"
                      size="small"
                      @click.stop="handleRemove(res.resourceId)"
                    >
                      移除
                    </ElButton>
                  </div>
                  <div style="font-size: 12px; color: #64748b; font-weight: normal; text-align: left">
                    {{ res.resourceId }}
                  </div>
                  <div style="font-size: 13px; color: #1e293b; font-weight: 600; text-align: left; line-height: 1.4">
                    {{ res.name }}
                  </div>
                </div>
              </template>
              <template #default="{ row }">
                <div
                  :style="{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: isDiff(row.key) ? '#fef3c7' : 'transparent',
                    border: isDiff(row.key) ? '1px solid #f59e0b' : 'none',
                    minHeight: '40px',
                    display: 'flex',
                    alignItems: 'center',
                  }"
                >
                  <template v-if="row.key === 'tags'">
                    <div style="display: flex; gap: 4px; flex-wrap: wrap">
                      <ElTag
                        v-for="tag in (res.tags || [])"
                        :key="tag"
                        size="small"
                        type="info"
                        effect="plain"
                      >
                        {{ tag }}
                      </ElTag>
                    </div>
                  </template>
                  <template v-else-if="row.key === 'difficulty'">
                    <ElTag
                      :color="getDifficultyColor(res.difficulty) + '20'"
                      :style="{ color: getDifficultyColor(res.difficulty), borderColor: getDifficultyColor(res.difficulty), fontWeight: 600 }"
                      size="small"
                    >
                      {{ res.difficulty }}
                    </ElTag>
                  </template>
                  <template v-else-if="row.key === 'type'">
                    <ElTag
                      :color="getTypeColor(res.type) + '20'"
                      :style="{ color: getTypeColor(res.type), borderColor: getTypeColor(res.type), fontWeight: 600 }"
                      size="small"
                    >
                      {{ res.type }}
                    </ElTag>
                  </template>
                  <template v-else-if="row.key === 'rating'">
                    <div style="display: flex; align-items: center; gap: 6px">
                      <ElRate :model-value="Number(res.rating) / 1" disabled :max="5" size="small" />
                      <span :style="{ color: res.rating >= 4 ? '#10b981' : res.rating >= 3 ? '#f59e0b' : '#ef4444', fontWeight: 600 }">
                        {{ formatValue(res, row.key) }}
                      </span>
                    </div>
                  </template>
                  <template v-else-if="row.key === 'heat'">
                    <span style="font-weight: 600; color: #ef4444">
                      🔥 {{ formatValue(res, row.key) }}
                    </span>
                  </template>
                  <template v-else-if="row.key === 'estimatedHours'">
                    <span style="font-weight: 600; color: #3b82f6">
                      ⏱ {{ formatValue(res, row.key) }}
                    </span>
                  </template>
                  <template v-else>
                    <span style="font-weight: 500">
                      {{ formatValue(res, row.key) }}
                    </span>
                  </template>
                </div>
              </template>
            </ElTableColumn>
          </ElTable>
        </el-scrollbar>
      </ElCard>
    </ElSkeleton>

    <ElCard v-if="!loading && resources.length > 0" style="border-radius: 14px; margin-top: 16px">
      <div style="font-weight: 700; margin-bottom: 12px">📋 对比摘要</div>
      <div style="display: flex; flex-wrap: wrap; gap: 12px">
        <div
          v-for="field in compareFields.filter(f => isDiff(f.key))"
          :key="field.key"
          style="flex: 1; min-width: 200px; padding: 12px; background: #fef9c3; border-radius: 8px; border: 1px solid #facc15"
        >
          <div style="font-size: 12px; color: #854d0e; margin-bottom: 4px">「{{ field.label }}」存在差异</div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap">
            <ElTag
              v-for="(res, idx) in resources"
              :key="res.resourceId"
              size="small"
              type="warning"
              effect="dark"
            >
              资源{{ idx + 1 }}: {{ Array.isArray(res[field.key]) ? res[field.key].join(', ') : res[field.key] }}
            </ElTag>
          </div>
        </div>
        <div
          v-if="compareFields.filter(f => isDiff(f.key)).length === 0"
          style="width: 100%; padding: 20px; text-align: center; color: #64748b"
        >
          ✅ 所有对比字段值均相同
        </div>
      </div>
    </ElCard>
  </div>
</template>
