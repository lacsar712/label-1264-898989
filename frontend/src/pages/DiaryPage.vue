<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  ElButton,
  ElCard,
  ElCol,
  ElDialog,
  ElEmpty,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElRow,
  ElSelect,
  ElSkeleton,
  ElTag,
} from 'element-plus'

import { api } from '../lib/api'

const moodOptions = [
  { value: 1, emoji: '😢', label: '很低落' },
  { value: 2, emoji: '😔', label: '有点丧' },
  { value: 3, emoji: '😐', label: '一般般' },
  { value: 4, emoji: '😊', label: '挺不错' },
  { value: 5, emoji: '🤩', label: '超开心' },
]

const todayEntry = ref(null)
const todayLoading = ref(false)
const saving = ref(false)

const formMood = ref(3)
const formHarvest = ref('')
const formPlan = ref('')
const hasTodayEntry = ref(false)

const historyList = ref([])
const historyTotal = ref(0)
const historyPage = ref(1)
const historyPageSize = 10
const historyLoading = ref(false)

const filterYear = ref(new Date().getFullYear())
const filterMonth = ref(new Date().getMonth() + 1)
const filterKeyword = ref('')

const streak = ref(0)
const maxStreak = ref(0)

const archiveMonths = ref([])
const archiveYear = ref(new Date().getFullYear())

const viewDialog = ref(false)
const viewEntry = ref(null)

function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 周${weekDays[d.getDay()]}`
}

function getMoodEmoji(mood) {
  return moodOptions.find((m) => m.value === mood)?.emoji || '😐'
}

function getMoodLabel(mood) {
  return moodOptions.find((m) => m.value === mood)?.label || '一般般'
}

function getMoodColor(mood) {
  const colors = { 1: '#64748b', 2: '#94a3b8', 3: '#f59e0b', 4: '#10b981', 5: '#2563eb' }
  return colors[mood] || '#f59e0b'
}

async function loadToday() {
  todayLoading.value = true
  try {
    const resp = await api.get('/diary/today')
    todayEntry.value = resp.data?.data
    if (todayEntry.value) {
      hasTodayEntry.value = true
      formMood.value = todayEntry.value.mood
      formHarvest.value = todayEntry.value.harvest
      formPlan.value = todayEntry.value.plan
    } else {
      hasTodayEntry.value = false
      formMood.value = 3
      formHarvest.value = ''
      formPlan.value = ''
    }
  } catch (e) {
    console.error('加载今日日记失败', e)
  } finally {
    todayLoading.value = false
  }
}

async function saveToday() {
  saving.value = true
  try {
    const resp = await api.post('/diary', {
      date: todayStr(),
      mood: formMood.value,
      harvest: formHarvest.value,
      plan: formPlan.value,
    })
    todayEntry.value = resp.data?.data
    hasTodayEntry.value = true
    ElMessage.success(hasTodayEntry.value ? '日记已更新' : '日记已保存')
    await loadStreak()
    await loadHistory()
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function loadStreak() {
  try {
    const resp = await api.get('/diary/streak')
    streak.value = resp.data?.data?.currentStreak || 0
    maxStreak.value = resp.data?.data?.maxStreak || 0
  } catch (e) {
    console.error('加载打卡数据失败', e)
  }
}

async function loadHistory() {
  historyLoading.value = true
  try {
    const params = {
      page: historyPage.value,
      pageSize: historyPageSize,
    }
    if (filterYear.value && filterMonth.value) {
      params.year = filterYear.value
      params.month = filterMonth.value
    }
    if (filterKeyword.value.trim()) {
      params.keyword = filterKeyword.value.trim()
    }
    const resp = await api.get('/diary/list', { params })
    historyList.value = resp.data?.data?.list || []
    historyTotal.value = resp.data?.data?.total || 0
  } catch (e) {
    console.error('加载历史日记失败', e)
  } finally {
    historyLoading.value = false
  }
}

async function loadArchive() {
  try {
    const resp = await api.get(`/diary/archive/${archiveYear.value}`)
    archiveMonths.value = resp.data?.data?.months || []
  } catch (e) {
    console.error('加载归档失败', e)
  }
}

function onFilterSearch() {
  historyPage.value = 1
  loadHistory()
}

function onMonthArchiveClick(monthStr) {
  const [y, m] = monthStr.split('-').map(Number)
  filterYear.value = y
  filterMonth.value = m
  historyPage.value = 1
  loadHistory()
}

function onPageChange(page) {
  historyPage.value = page
  loadHistory()
}

function openViewDialog(entry) {
  viewEntry.value = entry
  viewDialog.value = true
}

async function deleteEntry(entry) {
  try {
    await ElMessageBox.confirm('确定要删除这篇日记吗？删除后无法恢复。', '提示', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await api.delete(`/diary/${entry.id}`)
    ElMessage.success('已删除')
    await loadHistory()
    await loadStreak()
    if (entry.date === todayStr()) {
      await loadToday()
    }
  } catch {}
}

watch([filterYear, filterMonth], () => {
  historyPage.value = 1
  loadHistory()
})

watch(archiveYear, () => {
  loadArchive()
})

onMounted(async () => {
  await Promise.all([loadToday(), loadStreak(), loadHistory(), loadArchive()])
})
</script>

<template>
  <div style="padding: 16px 16px 22px">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px">
            <div>
              <div style="font-weight: 800">📔 学习日记</div>
              <div style="font-size: 12px; color: #64748b">记录每日心境，沉淀成长足迹</div>
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="8">
        <ElCard style="border-radius: 14px; margin-bottom: 16px; background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border: 1px solid #bfdbfe">
          <div style="text-align: center">
            <div style="font-size: 14px; color: #475569; margin-bottom: 8px">🔥 连续打卡</div>
            <div style="font-size: 42px; font-weight: 800; color: #2563eb; line-height: 1.2">
              {{ streak }}
            </div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px">天</div>
            <div style="display: flex; justify-content: center; gap: 8px; margin-top: 12px; flex-wrap: wrap">
              <ElTag
                v-if="streak >= 3"
                type="warning"
                effect="dark"
                style="border-radius: 16px"
              >
                🥉 坚持三天
              </ElTag>
              <ElTag
                v-if="streak >= 7"
                type="success"
                effect="dark"
                style="border-radius: 16px"
              >
                🥈 一周达人
              </ElTag>
              <ElTag
                v-if="streak >= 30"
                type="danger"
                effect="dark"
                style="border-radius: 16px"
              >
                🥇 月度之星
              </ElTag>
              <ElTag
                v-if="streak >= 100"
                effect="dark"
                style="border-radius: 16px; background: linear-gradient(135deg, #7c3aed, #2563eb)"
              >
                💎 百日传奇
              </ElTag>
            </div>
            <div v-if="maxStreak > streak" style="font-size: 11px; color: #94a3b8; margin-top: 8px">
              最长连续 {{ maxStreak }} 天
            </div>
          </div>
        </ElCard>

        <ElCard style="border-radius: 14px; margin-bottom: 16px">
          <div style="font-weight: 700; margin-bottom: 12px">📦 月份归档</div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px">
            <ElSelect v-model="archiveYear" size="small" style="width: 110px">
              <ElOption v-for="y in [2024, 2025, 2026]" :key="y" :label="y + '年'" :value="y" />
            </ElSelect>
          </div>
          <div v-if="archiveMonths.length === 0" style="font-size: 13px; color: #94a3b8; text-align: center; padding: 16px 0">
            暂无归档
          </div>
          <div v-else style="display: flex; flex-wrap: wrap; gap: 8px">
            <ElTag
              v-for="m in archiveMonths"
              :key="m"
              style="cursor: pointer; border-radius: 8px"
              @click="onMonthArchiveClick(m)"
            >
              {{ m }}
            </ElTag>
          </div>
        </ElCard>

        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700; margin-bottom: 12px">🔍 关键词检索</div>
          <ElInput
            v-model="filterKeyword"
            placeholder="搜索收获或计划..."
            clearable
            @keyup.enter="onFilterSearch"
          >
            <template #append>
              <ElButton @click="onFilterSearch">搜索</ElButton>
            </template>
          </ElInput>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :lg="16">
        <ElCard style="border-radius: 14px; margin-bottom: 16px; border: 2px solid #bfdbfe">
          <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16px">
            <div style="font-weight: 700; font-size: 16px">
              ✏️ 今日日记 · {{ formatDate(todayStr()) }}
            </div>
            <ElTag v-if="hasTodayEntry" type="success" effect="plain" style="border-radius: 12px">
              已记录
            </ElTag>
            <ElTag v-else type="info" effect="plain" style="border-radius: 12px">
              待记录
            </ElTag>
          </div>

          <ElSkeleton :loading="todayLoading" animated>
            <div style="margin-bottom: 20px">
              <div style="font-size: 13px; color: #475569; margin-bottom: 10px; font-weight: 500">今天的心情</div>
              <div style="display: flex; gap: 12px">
                <div
                  v-for="m in moodOptions"
                  :key="m.value"
                  :style="{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    border: formMood === m.value ? '2px solid ' + getMoodColor(m.value) : '2px solid transparent',
                    background: formMood === m.value ? getMoodColor(m.value) + '12' : '#f8fafc',
                    transition: 'all 0.2s ease',
                    flex: '1',
                  }"
                  @click="formMood = m.value"
                >
                  <span style="font-size: 28px; line-height: 1">{{ m.emoji }}</span>
                  <span style="font-size: 11px; color: #64748b">{{ m.label }}</span>
                </div>
              </div>
            </div>

            <div style="margin-bottom: 16px">
              <div style="font-size: 13px; color: #475569; margin-bottom: 8px; font-weight: 500">🌟 今日收获</div>
              <ElInput
                v-model="formHarvest"
                type="textarea"
                :rows="4"
                placeholder="今天学到了什么？有什么感悟？"
                maxlength="5000"
                show-word-limit
              />
            </div>

            <div style="margin-bottom: 16px">
              <div style="font-size: 13px; color: #475569; margin-bottom: 8px; font-weight: 500">📋 明日计划</div>
              <ElInput
                v-model="formPlan"
                type="textarea"
                :rows="3"
                placeholder="明天打算做什么？有什么目标？"
                maxlength="5000"
                show-word-limit
              />
            </div>

            <div style="display: flex; justify-content: flex-end">
              <ElButton type="primary" :loading="saving" @click="saveToday">
                {{ hasTodayEntry ? '更新日记' : '保存日记' }}
              </ElButton>
            </div>
          </ElSkeleton>
        </ElCard>

        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16px">
            <div style="font-weight: 700">📜 日记时间线</div>
            <div style="display: flex; align-items: center; gap: 8px">
              <ElSelect v-model="filterYear" size="small" style="width: 90px" placeholder="年">
                <ElOption v-for="y in [2024, 2025, 2026]" :key="y" :label="y + '年'" :value="y" />
              </ElSelect>
              <ElSelect v-model="filterMonth" size="small" style="width: 90px" placeholder="月">
                <ElOption v-for="m in 12" :key="m" :label="m + '月'" :value="m" />
              </ElSelect>
            </div>
          </div>

          <ElSkeleton :loading="historyLoading" animated>
            <div v-if="historyList.length === 0" style="padding: 40px 0">
              <ElEmpty description="暂无日记记录" />
            </div>

            <div v-else style="position: relative; padding-left: 24px">
              <div
                style="
                  position: absolute;
                  left: 8px;
                  top: 0;
                  bottom: 0;
                  width: 2px;
                  background: linear-gradient(180deg, #2563eb, #10b981);
                  border-radius: 1px;
                "
              ></div>

              <div
                v-for="entry in historyList"
                :key="entry.id"
                style="
                  position: relative;
                  margin-bottom: 20px;
                  padding: 16px;
                  background: #f8fafc;
                  border-radius: 12px;
                  border: 1px solid #e2e8f0;
                  cursor: pointer;
                  transition: all 0.2s ease;
                "
                @click="openViewDialog(entry)"
              >
                <div
                  style="
                    position: absolute;
                    left: -20px;
                    top: 20px;
                    width: 12px;
                    height: 12px;
                    background: #fff;
                    border: 2px solid #2563eb;
                    border-radius: 50%;
                  "
                ></div>

                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px">
                  <div style="display: flex; align-items: center; gap: 8px">
                    <span style="font-size: 20px">{{ getMoodEmoji(entry.mood) }}</span>
                    <span style="font-weight: 600; color: #1e293b; font-size: 14px">{{ formatDate(entry.date) }}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px">
                    <ElTag :color="getMoodColor(entry.mood)" effect="dark" size="small" style="border-radius: 8px">
                      {{ getMoodLabel(entry.mood) }}
                    </ElTag>
                  </div>
                </div>

                <div v-if="entry.harvest" style="margin-bottom: 6px">
                  <span style="font-size: 12px; color: #94a3b8; margin-right: 6px">🌟 收获</span>
                  <span style="font-size: 13px; color: #334155; line-height: 1.6">{{ entry.harvest.slice(0, 120) }}{{ entry.harvest.length > 120 ? '...' : '' }}</span>
                </div>

                <div v-if="entry.plan">
                  <span style="font-size: 12px; color: #94a3b8; margin-right: 6px">📋 计划</span>
                  <span style="font-size: 13px; color: #475569; line-height: 1.6">{{ entry.plan.slice(0, 100) }}{{ entry.plan.length > 100 ? '...' : '' }}</span>
                </div>
              </div>
            </div>

            <div v-if="historyTotal > historyPageSize" style="display: flex; justify-content: center; gap: 8px; margin-top: 12px">
              <ElButton
                size="small"
                :disabled="historyPage <= 1"
                @click="onPageChange(historyPage - 1)"
              >
                上一页
              </ElButton>
              <span style="font-size: 13px; color: #64748b; line-height: 32px">
                {{ historyPage }} / {{ Math.ceil(historyTotal / historyPageSize) }}
              </span>
              <ElButton
                size="small"
                :disabled="historyPage >= Math.ceil(historyTotal / historyPageSize)"
                @click="onPageChange(historyPage + 1)"
              >
                下一页
              </ElButton>
            </div>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElDialog v-model="viewDialog" :title="viewEntry ? formatDate(viewEntry.date) : ''" width="520px">
      <div v-if="viewEntry">
        <div style="text-align: center; margin-bottom: 20px">
          <span style="font-size: 48px">{{ getMoodEmoji(viewEntry.mood) }}</span>
          <div style="margin-top: 8px">
            <ElTag :color="getMoodColor(viewEntry.mood)" effect="dark" style="border-radius: 12px">
              {{ getMoodLabel(viewEntry.mood) }}
            </ElTag>
          </div>
        </div>

        <div style="margin-bottom: 16px">
          <div style="font-weight: 600; color: #1e293b; margin-bottom: 8px">🌟 今日收获</div>
          <div style="background: #f0fdf4; padding: 12px 16px; border-radius: 10px; font-size: 14px; color: #334155; line-height: 1.8; white-space: pre-wrap">{{ viewEntry.harvest || '（未填写）' }}</div>
        </div>

        <div style="margin-bottom: 16px">
          <div style="font-weight: 600; color: #1e293b; margin-bottom: 8px">📋 明日计划</div>
          <div style="background: #eff6ff; padding: 12px 16px; border-radius: 10px; font-size: 14px; color: #334155; line-height: 1.8; white-space: pre-wrap">{{ viewEntry.plan || '（未填写）' }}</div>
        </div>
      </div>

      <template #footer>
        <ElButton type="danger" plain @click="deleteEntry(viewEntry); viewDialog = false">删除日记</ElButton>
        <ElButton @click="viewDialog = false">关闭</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
