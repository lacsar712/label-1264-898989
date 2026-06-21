<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ElButton,
  ElCard,
  ElCol,
  ElCheckbox,
  ElMessage,
  ElProgress,
  ElRow,
  ElSkeleton,
  ElTag,
  ElTooltip,
} from 'element-plus'
import { ArrowLeft, Check, CircleCheck, CircleClose, Document } from '@element-plus/icons-vue'
import { api } from '../lib/api'

const route = useRoute()
const router = useRouter()

const resourceId = computed(() => route.params.resourceId)

const loading = ref(false)
const outline = ref(null)

const expandedChapters = ref(new Set())
const expandedSections = ref(new Set())

async function loadOutline() {
  if (!resourceId.value) return
  loading.value = true
  try {
    const resp = await api.get(`/actions/course-outlines/${resourceId.value}`)
    outline.value = resp.data.data
    if (outline.value?.chapters?.length) {
      outline.value.chapters.forEach((ch, idx) => {
        if (idx < 2) expandedChapters.value.add(ch.id)
      })
    }
  } finally {
    loading.value = false
  }
}

onMounted(loadOutline)
watch(resourceId, loadOutline)

function goBack() {
  router.back()
}

function goToResources() {
  router.push('/resources')
}

function toggleChapter(chapterId) {
  if (expandedChapters.value.has(chapterId)) {
    expandedChapters.value.delete(chapterId)
  } else {
    expandedChapters.value.add(chapterId)
  }
  expandedChapters.value = new Set(expandedChapters.value)
}

function toggleSection(sectionId) {
  if (expandedSections.value.has(sectionId)) {
    expandedSections.value.delete(sectionId)
  } else {
    expandedSections.value.add(sectionId)
  }
  expandedSections.value = new Set(expandedSections.value)
}

async function toggleLearned(kp) {
  try {
    await api.post(`/actions/course-knowledge-points/${kp.id}/toggle-learned`, {
      learned: !kp.learned,
    })
    await loadOutline()
    ElMessage.success(kp.learned ? '已取消标记' : '已标记为已学')
  } catch (e) {
    //
  }
}

function expandAll() {
  if (!outline.value?.chapters) return
  const newChapters = new Set()
  const newSections = new Set()
  outline.value.chapters.forEach((ch) => {
    newChapters.add(ch.id)
    ch.sections.forEach((se) => newSections.add(se.id))
  })
  expandedChapters.value = newChapters
  expandedSections.value = newSections
}

function collapseAll() {
  expandedChapters.value = new Set()
  expandedSections.value = new Set()
}

const progressColor = (percent) => {
  if (percent >= 100) return '#10b981'
  if (percent >= 60) return '#2563eb'
  if (percent > 0) return '#f59e0b'
  return '#cbd5e1'
}
</script>

<template>
  <div style="padding: 16px 16px 22px">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap">
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
              <ElButton circle @click="goBack">
                <ArrowLeft />
              </ElButton>
              <div>
                <div style="font-weight: 800; font-size: 18px">
                  {{ outline?.resource?.name || '课程大纲' }}
                </div>
                <div style="font-size: 12px; color: #64748b; display: flex; gap: 8px; align-items: center; margin-top: 4px; flex-wrap: wrap">
                  <ElTag size="small" type="primary" effect="light">{{ outline?.resource?.subject }}</ElTag>
                  <ElTag size="small" effect="plain">{{ outline?.resource?.type }}</ElTag>
                  <ElTag size="small" type="warning" effect="light">{{ outline?.resource?.difficulty }}</ElTag>
                  <span v-if="outline?.resource?.estimatedHours">预计学时：{{ outline.resource.estimatedHours }}h</span>
                </div>
              </div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap">
              <ElButton size="small" @click="expandAll">全部展开</ElButton>
              <ElButton size="small" @click="collapseAll">全部收起</ElButton>
              <ElButton size="small" @click="loadOutline">刷新</ElButton>
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px" v-if="outline">
      <ElCol :xs="24" :lg="8">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="font-weight: 700; margin-bottom: 14px">总体进度</div>
          <div style="text-align: center; padding: 8px 0 16px">
            <ElProgress
              type="circle"
              :percentage="outline.overallProgress || 0"
              :width="140"
              :stroke-width="10"
              :color="progressColor(outline.overallProgress)"
            />
            <div style="margin-top: 14px; font-size: 13px; color: #475569">
              已学 <span style="font-weight: 700; color: #1e293b">{{ outline.learnedKps || 0 }}</span>
              / {{ outline.totalKps || 0 }} 个知识点
            </div>
          </div>
          <div v-if="outline.overallProgress >= 100" style="text-align: center; padding: 8px; background: #ecfdf5; border-radius: 10px; color: #059669; font-weight: 600">
            <Check style="width: 16px; height: 16px; margin-right: 4px; vertical-align: -3px" />
            恭喜！已完成全部学习
          </div>
        </ElCard>

        <ElCard style="border-radius: 14px; margin-top: 16px; height: 100%">
          <div style="font-weight: 700; margin-bottom: 12px">章节进度</div>
          <el-scrollbar style="max-height: 340px">
            <div v-if="outline.chapters?.length === 0" style="text-align: center; padding: 24px 0; color: #94a3b8; font-size: 13px">
              暂无章节内容
            </div>
            <div v-for="(ch, idx) in outline.chapters" :key="ch.id" style="margin-bottom: 14px">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px">
                <span style="font-size: 13px; font-weight: 600; color: #334155">
                  第{{ idx + 1 }}章 · {{ ch.title }}
                </span>
                <span style="font-size: 12px; color: #64748b">{{ ch.progressPercent || 0 }}%</span>
              </div>
              <ElProgress
                :percentage="ch.progressPercent || 0"
                :stroke-width="6"
                :show-text="false"
                :color="progressColor(ch.progressPercent)"
              />
            </div>
          </el-scrollbar>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :lg="16">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between">
            <span>课程大纲</span>
            <span style="font-size: 12px; color: #64748b; font-weight: normal">
              勾选知识点标记「已学」
            </span>
          </div>
          <el-scrollbar style="max-height: 72vh">
            <div v-loading="loading" style="min-height: 300px">
              <div v-if="!outline.chapters || outline.chapters.length === 0" style="text-align: center; padding: 60px 0; color: #94a3b8; font-size: 13px">
                <Document style="width: 48px; height: 48px; margin: 0 auto 12px; color: #cbd5e1" />
                <div>该课程暂未编排大纲</div>
                <ElButton plain style="margin-top: 12px" @click="goToResources">返回资源库</ElButton>
              </div>
              <div v-else>
                <div
                  v-for="(chapter, chIdx) in outline.chapters"
                  :key="chapter.id"
                  style="border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 14px; overflow: hidden"
                  :style="chapter.progressPercent >= 100 ? 'border-color: #10b98166; background: #f0fdf4' : ''"
                >
                  <div
                    style="display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #f8fafc; cursor: pointer; user-select: none; flex-wrap: wrap"
                    :style="expandedChapters.has(chapter.id) ? 'background: #eff6ff' : ''"
                    @click="toggleChapter(chapter.id)"
                  >
                    <span style="font-size: 16px; font-weight: 800; color: #2563eb">
                      {{ expandedChapters.has(chapter.id) ? '▾' : '▸' }}
                    </span>
                    <ElTag v-if="chapter.progressPercent >= 100" type="success" size="small" effect="dark">
                      <Check style="width: 12px; height: 12px" />
                    </ElTag>
                    <ElTag type="primary" size="small" effect="light">第{{ chIdx + 1 }}章</ElTag>
                    <span style="font-weight: 700; font-size: 15px; flex: 1; min-width: 140px">{{ chapter.title }}</span>
                    <div style="display: flex; align-items: center; gap: 12px; min-width: 180px">
                      <div style="flex: 1; min-width: 100px">
                        <ElProgress
                          :percentage="chapter.progressPercent || 0"
                          :stroke-width="6"
                          :show-text="false"
                          :color="progressColor(chapter.progressPercent)"
                        />
                      </div>
                      <ElTag size="small" :type="chapter.progressPercent >= 100 ? 'success' : 'info'" effect="plain">
                        {{ chapter.progressPercent || 0 }}%
                      </ElTag>
                    </div>
                  </div>
                  <div v-if="chapter.description" style="padding: 0 16px 10px; font-size: 12px; color: #64748b">
                    {{ chapter.description }}
                  </div>

                  <div v-show="expandedChapters.has(chapter.id)" style="padding: 4px 16px 14px">
                    <div
                      v-for="(section, seIdx) in chapter.sections"
                      :key="section.id"
                      style="border: 1px solid #e2e8f0; border-radius: 10px; margin-top: 10px; overflow: hidden"
                      :style="section.progressPercent >= 100 ? 'border-color: #2563eb44' : ''"
                    >
                      <div
                        style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #fafbfc; cursor: pointer; user-select: none; flex-wrap: wrap"
                        :style="expandedSections.has(section.id) ? 'background: #f1f5f9' : ''"
                        @click="toggleSection(section.id)"
                      >
                        <span style="font-size: 14px; font-weight: 700; color: #475569">
                          {{ expandedSections.has(section.id) ? '▾' : '▸' }}
                        </span>
                        <ElTag type="success" size="small" effect="light">{{ chIdx + 1 }}.{{ seIdx + 1 }}</ElTag>
                        <span style="font-weight: 600; flex: 1; min-width: 120px">{{ section.title }}</span>
                        <div style="display: flex; align-items: center; gap: 10px; min-width: 160px">
                          <div style="flex: 1; min-width: 80px">
                            <ElProgress
                              :percentage="section.progressPercent || 0"
                              :stroke-width="5"
                              :show-text="false"
                              :color="progressColor(section.progressPercent)"
                            />
                          </div>
                          <ElTag size="small" effect="plain" :type="section.progressPercent >= 100 ? 'success' : 'info'">
                            {{ section.progressPercent || 0 }}%
                          </ElTag>
                        </div>
                      </div>
                      <div v-if="section.description" style="padding: 0 14px 8px; font-size: 12px; color: #64748b">
                        {{ section.description }}
                      </div>

                      <div v-show="expandedSections.has(section.id)" style="padding: 2px 14px 12px">
                        <div
                          v-for="(kp, kpIdx) in section.knowledgePoints"
                          :key="kp.id"
                          style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; margin-top: 6px; transition: all 0.15s"
                          :style="kp.learned ? 'background: #ecfdf5' : 'background: #f8fafc; border: 1px solid #e2e8f0'"
                        >
                          <ElCheckbox
                            :model-value="kp.learned"
                            @change="toggleLearned(kp)"
                            :style="kp.learned ? 'opacity: 1' : ''"
                          />
                          <span style="font-size: 12px; color: #94a3b8; min-width: 32px">
                            {{ chIdx + 1 }}.{{ seIdx + 1 }}.{{ kpIdx + 1 }}
                          </span>
                          <span
                            style="flex: 1; color: #334155"
                            :style="kp.learned ? 'text-decoration: line-through; color: #94a3b8' : ''"
                          >
                            {{ kp.title }}
                          </span>
                          <ElTooltip v-if="kp.description" :content="kp.description" placement="top">
                            <span style="font-size: 12px; color: #94a3b8; cursor: help">ⓘ</span>
                          </ElTooltip>
                          <ElTag v-if="kp.learned" type="success" size="small" effect="dark">
                            <CircleCheck style="width: 12px; height: 12px; margin-right: 2px" />
                            已学
                          </ElTag>
                        </div>
                        <div
                          v-if="!section.knowledgePoints || section.knowledgePoints.length === 0"
                          style="text-align: center; padding: 14px 0; font-size: 12px; color: #94a3b8"
                        >
                          暂无知识点
                        </div>
                      </div>
                    </div>
                    <div
                      v-if="!chapter.sections || chapter.sections.length === 0"
                      style="text-align: center; padding: 16px 0; font-size: 12px; color: #94a3b8"
                    >
                      暂无小节
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-scrollbar>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElSkeleton v-if="loading" :loading="loading" animated style="margin-top: 16px">
      <div />
    </ElSkeleton>
  </div>
</template>
