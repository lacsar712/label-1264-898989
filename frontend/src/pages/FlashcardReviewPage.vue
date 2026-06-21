<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  ElButton,
  ElCard,
  ElCol,
  ElDialog,
  ElEmpty,
  ElMessage,
  ElRow,
  ElSkeleton,
  ElTag,
} from 'element-plus'
import { api } from '../lib/api'
import { useBadges } from '../stores/badges'

const { updateProgress } = useBadges()

const phase = ref('list')
const dueCards = ref([])
const allCards = ref([])
const loading = ref(false)
const currentIndex = ref(0)
const flipped = ref(false)
const sessionStart = ref(null)
const rememberedCount = ref(0)
const forgotCount = ref(0)
const summaryData = ref(null)
const summaryLoading = ref(false)

async function loadDueCards() {
  loading.value = true
  try {
    const resp = await api.get('/flashcards/due')
    dueCards.value = resp.data?.data || []
  } catch (e) {
    ElMessage.error('加载待复习闪卡失败')
  } finally {
    loading.value = false
  }
}

async function loadAllCards() {
  loading.value = true
  try {
    const resp = await api.get('/flashcards', { params: { status: 'all', pageSize: 100 } })
    allCards.value = resp.data?.data?.list || []
  } catch (e) {
    ElMessage.error('加载闪卡列表失败')
  } finally {
    loading.value = false
  }
}

function startReview() {
  if (dueCards.value.length === 0) {
    ElMessage.info('暂无待复习的闪卡')
    return
  }
  phase.value = 'review'
  currentIndex.value = 0
  flipped.value = false
  sessionStart.value = new Date().toISOString()
  rememberedCount.value = 0
  forgotCount.value = 0
}

const currentCard = computed(() => {
  if (phase.value !== 'review') return null
  return dueCards.value[currentIndex.value] || null
})

const progressText = computed(() => {
  if (phase.value !== 'review') return ''
  return `${currentIndex.value + 1} / ${dueCards.value.length}`
})

const progressPercent = computed(() => {
  if (dueCards.value.length === 0) return 0
  return ((currentIndex.value) / dueCards.value.length) * 100
})

function flipCard() {
  flipped.value = true
}

async function markResult(result) {
  if (!currentCard.value) return

  try {
    await api.post(`/flashcards/${currentCard.value.id}/review`, { result })
    updateProgress('flashcard_reviews', 1)
    updateProgress('study_date')
    if (result === 'remembered') {
      rememberedCount.value += 1
    } else {
      forgotCount.value += 1
    }
  } catch (e) {
    ElMessage.error('提交复习结果失败')
    return
  }

  if (currentIndex.value < dueCards.value.length - 1) {
    currentIndex.value += 1
    flipped.value = false
  } else {
    await showSummary()
  }
}

async function showSummary() {
  phase.value = 'summary'
  summaryLoading.value = true
  try {
    const resp = await api.get('/flashcards/review-summary', {
      params: { sessionStart: sessionStart.value },
    })
    summaryData.value = resp.data?.data || null
  } catch (e) {
    ElMessage.error('获取复习总结失败')
  } finally {
    summaryLoading.value = false
  }
}

function backToList() {
  phase.value = 'list'
  loadDueCards()
  loadAllCards()
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString()
}

function getSourceLabel(type) {
  if (type === 'wrong_question') return '错题'
  if (type === 'resource_tag') return '资源标签'
  return type
}

function getSourceTagType(type) {
  if (type === 'wrong_question') return 'danger'
  if (type === 'resource_tag') return 'primary'
  return 'info'
}

async function deleteCard(cardId) {
  try {
    await api.delete(`/flashcards/${cardId}`)
    ElMessage.success('已删除')
    loadAllCards()
    loadDueCards()
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

onMounted(() => {
  loadDueCards()
  loadAllCards()
})
</script>

<template>
  <div style="padding: 16px 16px 22px">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px">
            <div>
              <div style="font-weight: 800">🃏 闪卡复习</div>
              <div style="font-size: 12px; color: #64748b">间隔重复 · 高效记忆 · 个性化复习</div>
            </div>
            <div style="display: flex; gap: 8px">
              <ElTag type="danger" effect="dark" size="large" v-if="dueCards.length > 0">
                待复习 {{ dueCards.length }} 张
              </ElTag>
              <ElButton v-if="phase === 'list'" type="primary" :disabled="dueCards.length === 0" @click="startReview">
                开始复习
              </ElButton>
              <ElButton v-if="phase !== 'list'" @click="backToList">返回列表</ElButton>
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <template v-if="phase === 'list'">
      <ElRow :gutter="16" style="margin-top: 16px">
        <ElCol :xs="24" :lg="8">
          <ElCard shadow="never" style="border-radius: 12px; background: #fef3c7; cursor: pointer" @click="startReview">
            <div style="font-size: 12px; color: #92400e; margin-bottom: 4px">📋 今日待复习</div>
            <div style="font-size: 28px; font-weight: 800; color: #78350f">
              {{ dueCards.length }}
              <span style="font-size: 13px; font-weight: 500">张</span>
            </div>
            <div style="font-size: 12px; color: #a16207; margin-top: 4px">点击开始今日复习</div>
          </ElCard>
        </ElCol>
        <ElCol :xs="24" :lg="8">
          <ElCard shadow="never" style="border-radius: 12px; background: #dcfce7">
            <div style="font-size: 12px; color: #166534; margin-bottom: 4px">📚 闪卡总数</div>
            <div style="font-size: 28px; font-weight: 800; color: #14532d">
              {{ allCards.length }}
              <span style="font-size: 13px; font-weight: 500">张</span>
            </div>
          </ElCard>
        </ElCol>
        <ElCol :xs="24" :lg="8">
          <ElCard shadow="never" style="border-radius: 12px; background: #e0e7ff">
            <div style="font-size: 12px; color: #3730a3; margin-bottom: 4px">📖 算法说明</div>
            <div style="font-size: 13px; color: #4338ca; line-height: 1.6">
              基于间隔重复算法，根据「记得/忘了」自动调整下次复习时间，遗忘则重置间隔，记住则逐步拉长周期。
            </div>
          </ElCard>
        </ElCol>
      </ElRow>

      <ElRow :gutter="16" style="margin-top: 16px">
        <ElCol :span="24">
          <ElCard style="border-radius: 14px">
            <div style="font-weight: 700; margin-bottom: 12px">待复习闪卡</div>
            <ElSkeleton :loading="loading" animated>
              <ElEmpty v-if="dueCards.length === 0" description="暂无待复习闪卡，做得好！🎉" />
              <div v-else style="display: flex; flex-wrap: wrap; gap: 12px">
                <div
                  v-for="card in dueCards"
                  :key="card.id"
                  style="
                    padding: 14px 16px;
                    background: #f8fafc;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    min-width: 260px;
                    flex: 1;
                    max-width: 400px;
                  "
                >
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px">
                    <ElTag :type="getSourceTagType(card.sourceType)" size="small">
                      {{ getSourceLabel(card.sourceType) }}
                    </ElTag>
                    <span style="font-size: 12px; color: #94a3b8">
                      间隔 {{ card.intervalDays }}天
                    </span>
                  </div>
                  <div style="font-size: 14px; color: #1e293b; font-weight: 500; line-height: 1.5">
                    {{ card.front }}
                  </div>
                  <div style="font-size: 12px; color: #94a3b8; margin-top: 6px">
                    已复习 {{ card.reviewCount }} 次 · 正确 {{ card.correctCount }} 次
                  </div>
                </div>
              </div>
            </ElSkeleton>
          </ElCard>
        </ElCol>
      </ElRow>

      <ElRow :gutter="16" style="margin-top: 16px">
        <ElCol :span="24">
          <ElCard style="border-radius: 14px">
            <div style="font-weight: 700; margin-bottom: 12px">全部闪卡</div>
            <ElSkeleton :loading="loading" animated>
              <ElEmpty v-if="allCards.length === 0" description="暂无闪卡，可从错题本添加" />
              <div v-else style="display: flex; flex-direction: column; gap: 8px">
                <div
                  v-for="card in allCards"
                  :key="card.id"
                  style="
                    padding: 12px 16px;
                    background: #f8fafc;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                  "
                >
                  <div style="flex: 1; min-width: 0">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px">
                      <ElTag :type="getSourceTagType(card.sourceType)" size="small">
                        {{ getSourceLabel(card.sourceType) }}
                      </ElTag>
                      <span style="font-size: 12px; color: #94a3b8">
                        下次：{{ formatDate(card.nextReviewAt) }}
                      </span>
                    </div>
                    <div style="font-size: 14px; color: #1e293b; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
                      {{ card.front }}
                    </div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px; margin-left: 12px; flex-shrink: 0">
                    <span style="font-size: 12px; color: #94a3b8">
                      {{ card.reviewCount }}次 · {{ card.correctCount }}对
                    </span>
                    <ElButton type="danger" text size="small" @click="deleteCard(card.id)">删除</ElButton>
                  </div>
                </div>
              </div>
            </ElSkeleton>
          </ElCard>
        </ElCol>
      </ElRow>
    </template>

    <template v-if="phase === 'review' && currentCard">
      <ElRow :gutter="16" style="margin-top: 16px">
        <ElCol :span="24">
          <ElCard style="border-radius: 14px">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px">
              <div style="display: flex; align-items: center; gap: 12px">
                <ElTag :type="getSourceTagType(currentCard.sourceType)" size="small">
                  {{ getSourceLabel(currentCard.sourceType) }}
                </ElTag>
                <span style="font-size: 14px; font-weight: 600; color: #334155">
                  {{ progressText }}
                </span>
              </div>
              <div style="font-size: 12px; color: #94a3b8">
                已复习 {{ currentIndex }} 张
              </div>
            </div>

            <div style="width: 100%; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-bottom: 24px">
              <div
                :style="{ width: progressPercent + '%' }"
                style="height: 100%; background: #2563eb; transition: width 0.4s ease; border-radius: 3px"
              ></div>
            </div>

            <div
              style="
                perspective: 1000px;
                display: flex;
                justify-content: center;
                margin-bottom: 24px;
              "
            >
              <div
                :style="{
                  transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.6s ease',
                }"
                style="width: 100%; max-width: 520px; min-height: 280px; position: relative"
              >
                <div
                  style="
                    backface-visibility: hidden;
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                    border: 2px solid #93c5fd;
                    border-radius: 16px;
                    padding: 32px 28px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                  "
                >
                  <div style="font-size: 12px; color: #3b82f6; font-weight: 600; margin-bottom: 16px; letter-spacing: 1px">
                    正 面 · 题 干
                  </div>
                  <div style="font-size: 18px; color: #1e293b; font-weight: 600; text-align: center; line-height: 1.6; white-space: pre-wrap">
                    {{ currentCard.front }}
                  </div>
                  <div style="margin-top: 24px; font-size: 13px; color: #64748b">
                    点击下方「翻转」查看解析
                  </div>
                </div>

                <div
                  style="
                    backface-visibility: hidden;
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                    border: 2px solid #86efac;
                    border-radius: 16px;
                    padding: 32px 28px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    transform: rotateY(180deg);
                  "
                >
                  <div style="font-size: 12px; color: #16a34a; font-weight: 600; margin-bottom: 16px; letter-spacing: 1px">
                    背 面 · 解 析
                  </div>
                  <div style="font-size: 16px; color: #1e293b; text-align: center; line-height: 1.7; white-space: pre-wrap">
                    {{ currentCard.back }}
                  </div>
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: center; gap: 12px">
              <ElButton v-if="!flipped" type="primary" size="large" @click="flipCard" style="min-width: 120px">
                🔄 翻转
              </ElButton>
              <template v-if="flipped">
                <ElButton
                  type="danger"
                  size="large"
                  @click="markResult('forgot')"
                  style="min-width: 140px; font-weight: 600"
                >
                  😔 忘了
                </ElButton>
                <ElButton
                  type="success"
                  size="large"
                  @click="markResult('remembered')"
                  style="min-width: 140px; font-weight: 600"
                >
                  ✅ 记得
                </ElButton>
              </template>
            </div>
          </ElCard>
        </ElCol>
      </ElRow>
    </template>

    <template v-if="phase === 'review' && !currentCard && dueCards.length > 0">
      <ElRow :gutter="16" style="margin-top: 16px">
        <ElCol :span="24">
          <ElCard style="border-radius: 14px; text-align: center; padding: 40px 0">
            <div style="font-size: 48px; margin-bottom: 16px">🎉</div>
            <div style="font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 8px">
              本轮复习完成！
            </div>
            <ElButton type="primary" @click="showSummary" style="margin-top: 16px">
              查看复习总结
            </ElButton>
          </ElCard>
        </ElCol>
      </ElRow>
    </template>

    <template v-if="phase === 'summary'">
      <ElRow :gutter="16" style="margin-top: 16px">
        <ElCol :span="24">
          <ElCard style="border-radius: 14px; text-align: center; padding: 20px 0">
            <div style="font-size: 48px; margin-bottom: 16px">🏆</div>
            <div style="font-size: 22px; font-weight: 800; color: #1e293b; margin-bottom: 4px">
              本轮复习总结
            </div>
            <div style="font-size: 14px; color: #64748b; margin-bottom: 24px">
              {{ formatDateTime(sessionStart) }} 开始的复习
            </div>

            <ElSkeleton :loading="summaryLoading" animated>
              <template v-if="summaryData">
                <ElRow :gutter="16" style="max-width: 600px; margin: 0 auto">
                  <ElCol :span="8">
                    <ElCard shadow="never" style="border-radius: 12px; background: #dcfce7">
                      <div style="font-size: 12px; color: #166534; margin-bottom: 4px">✅ 记得</div>
                      <div style="font-size: 28px; font-weight: 800; color: #14532d">
                        {{ summaryData.remembered }}
                      </div>
                    </ElCard>
                  </ElCol>
                  <ElCol :span="8">
                    <ElCard shadow="never" style="border-radius: 12px; background: #fef3c7">
                      <div style="font-size: 12px; color: #92400e; margin-bottom: 4px">😅 忘了</div>
                      <div style="font-size: 28px; font-weight: 800; color: #78350f">
                        {{ summaryData.forgot }}
                      </div>
                    </ElCard>
                  </ElCol>
                  <ElCol :span="8">
                    <ElCard shadow="never" style="border-radius: 12px; background: #e0e7ff">
                      <div style="font-size: 12px; color: #3730a3; margin-bottom: 4px">📊 正确率</div>
                      <div style="font-size: 28px; font-weight: 800; color: #312e81">
                        {{ summaryData.accuracy }}%
                      </div>
                    </ElCard>
                  </ElCol>
                </ElRow>

                <div style="margin-top: 24px; max-width: 600px; margin-left: auto; margin-right: auto">
                  <ElCard shadow="never" style="border-radius: 12px; text-align: left">
                    <div style="font-weight: 700; margin-bottom: 12px">📅 下次复习预告</div>
                    <div v-if="summaryData.tomorrowDue > 0" style="font-size: 14px; color: #1e293b; margin-bottom: 8px">
                      明日预计待复习：<span style="font-weight: 700; color: #2563eb">{{ summaryData.tomorrowDue }} 张</span>
                    </div>
                    <div v-else style="font-size: 14px; color: #64748b; margin-bottom: 8px">
                      明日暂无待复习闪卡
                    </div>
                    <div v-if="summaryData.nextReviews && summaryData.nextReviews.length > 0">
                      <div style="font-size: 12px; color: #64748b; margin-bottom: 8px">各闪卡下次复习时间：</div>
                      <div style="display: flex; flex-direction: column; gap: 6px">
                        <div
                          v-for="nr in summaryData.nextReviews.slice(0, 10)"
                          :key="nr.id"
                          style="display: flex; align-items: center; gap: 8px; font-size: 13px"
                        >
                          <ElTag size="small" type="info">{{ formatDate(nr.nextReviewAt) }}</ElTag>
                          <span style="color: #334155; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
                            {{ nr.front }}
                          </span>
                        </div>
                        <div v-if="summaryData.nextReviews.length > 10" style="font-size: 12px; color: #94a3b8">
                          ……还有 {{ summaryData.nextReviews.length - 10 }} 张
                        </div>
                      </div>
                    </div>
                  </ElCard>
                </div>

                <div style="margin-top: 24px">
                  <ElButton type="primary" size="large" @click="backToList">
                    返回闪卡列表
                  </ElButton>
                </div>
              </template>
            </ElSkeleton>
          </ElCard>
        </ElCol>
      </ElRow>
    </template>
  </div>
</template>
