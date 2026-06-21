<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import {
  ElButton,
  ElCard,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElSelect,
  ElTag,
  ElMessageBox,
} from 'element-plus'
import { api } from '../lib/api'

const props = defineProps({
  resourceId: { type: Number, default: null },
  resourceName: { type: String, default: '' },
})

const emit = defineEmits(['session-end', 'session-start'])

const presets = ref([])
const selectedPresetId = ref(null)

const timerPhase = ref('idle')
const remainingSeconds = ref(0)
const totalSeconds = ref(0)
let timerInterval = null

const currentSessionId = ref(null)
const startTimestamp = ref(0)
const accumulatedSeconds = ref(0)

const presetDialog = ref(false)
const summaryDialog = ref(false)
const summaryText = ref('')

const newPreset = ref({
  name: '',
  focusMinutes: 25,
  breakMinutes: 5,
})

async function loadPresets() {
  try {
    const resp = await api.get('/focus/presets')
    presets.value = resp.data?.data || []
    const defaultPreset = presets.value.find((p) => p.isDefault)
    if (defaultPreset && !selectedPresetId.value) {
      selectedPresetId.value = defaultPreset.id
    }
  } catch (e) {
    console.error('加载预设失败', e)
  }
}

const currentPreset = computed(() => {
  return presets.value.find((p) => p.id === selectedPresetId.value) || null
})

const displayTime = computed(() => {
  const mins = Math.floor(remainingSeconds.value / 60)
  const secs = remainingSeconds.value % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

const progressPercent = computed(() => {
  if (totalSeconds.value === 0) return 0
  return ((totalSeconds.value - remainingSeconds.value) / totalSeconds.value) * 100
})

const phaseLabel = computed(() => {
  if (timerPhase.value === 'idle') return '准备开始'
  if (timerPhase.value === 'focus') return '专注中'
  if (timerPhase.value === 'break') return '休息中'
  return '已暂停'
})

const phaseColor = computed(() => {
  if (timerPhase.value === 'focus') return '#2563eb'
  if (timerPhase.value === 'break') return '#10b981'
  return '#64748b'
})

function startFocus() {
  if (!currentPreset.value) {
    ElMessage.warning('请先选择一个预设方案')
    return
  }
  if (timerPhase.value === 'idle') {
    startNewSession()
  } else if (timerPhase.value === 'paused') {
    resumeTimer()
  }
}

async function startNewSession() {
  try {
    const resp = await api.post('/focus/sessions/start', {
      presetId: selectedPresetId.value,
      resourceId: props.resourceId,
    })
    currentSessionId.value = resp.data?.data?.id
    startTimestamp.value = Date.now()
    accumulatedSeconds.value = 0
    totalSeconds.value = currentPreset.value.focusMinutes * 60
    remainingSeconds.value = totalSeconds.value
    timerPhase.value = 'focus'
    startTimer()
    emit('session-start', resp.data?.data)
  } catch (e) {
    ElMessage.error('开始专注失败')
  }
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    if (remainingSeconds.value > 0) {
      remainingSeconds.value -= 1
      accumulatedSeconds.value += 1
    } else {
      handlePhaseComplete()
    }
  }, 1000)
}

function pauseTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  timerPhase.value = 'paused'
}

function resumeTimer() {
  timerPhase.value = 'focus'
  startTimer()
}

function handlePhaseComplete() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }

  if (timerPhase.value === 'focus') {
    playNotification()
    showBreakReminder()
  } else if (timerPhase.value === 'break') {
    playNotification()
    ElMessage.success('休息结束，准备好继续专注了吗？')
    resetTimer()
  }
}

function playNotification() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    gainNode.gain.value = 0.1
    oscillator.start()
    setTimeout(() => {
      oscillator.stop()
      audioContext.close()
    }, 300)
  } catch (e) {}
}

function showBreakReminder() {
  summaryText.value = ''
  summaryDialog.value = true
}

async function confirmEndSession() {
  if (!currentSessionId.value) return

  try {
    await api.post(`/focus/sessions/${currentSessionId.value}/end`, {
      summary: summaryText.value,
      actualFocusSeconds: accumulatedSeconds.value,
    })
    ElMessage.success('专注记录已保存')
    emit('session-end', {
      sessionId: currentSessionId.value,
      focusSeconds: accumulatedSeconds.value,
      summary: summaryText.value,
    })
  } catch (e) {
    ElMessage.error('保存记录失败')
  }

  summaryDialog.value = false
  startBreak()
}

function startBreak() {
  if (!currentPreset.value) return
  timerPhase.value = 'break'
  totalSeconds.value = currentPreset.value.breakMinutes * 60
  remainingSeconds.value = totalSeconds.value
  startTimer()
}

function skipBreak() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  resetTimer()
  ElMessage.info('已跳过休息')
}

function resetTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  timerPhase.value = 'idle'
  remainingSeconds.value = 0
  totalSeconds.value = 0
  currentSessionId.value = null
  startTimestamp.value = 0
  accumulatedSeconds.value = 0
}

async function stopSession() {
  if (timerPhase.value === 'idle') return

  try {
    await ElMessageBox.confirm('确定要结束本次专注吗？', '提示', {
      confirmButtonText: '确定结束',
      cancelButtonText: '继续专注',
      type: 'warning',
    })
  } catch {
    return
  }

  if (timerPhase.value === 'focus' && currentSessionId.value) {
    try {
      await api.post(`/focus/sessions/${currentSessionId.value}/end`, {
        summary: '中途结束',
        actualFocusSeconds: accumulatedSeconds.value,
      })
      emit('session-end', {
        sessionId: currentSessionId.value,
        focusSeconds: accumulatedSeconds.value,
        summary: '中途结束',
      })
    } catch (e) {
      console.error('保存记录失败', e)
    }
  }

  resetTimer()
}

function openPresetDialog() {
  newPreset.value = {
    name: '',
    focusMinutes: 25,
    breakMinutes: 5,
  }
  presetDialog.value = true
}

async function createPreset() {
  if (!newPreset.value.name || !newPreset.value.name.trim()) {
    ElMessage.warning('请输入预设名称')
    return
  }
  try {
    const resp = await api.post('/focus/presets', {
      name: newPreset.value.name.trim(),
      focusMinutes: newPreset.value.focusMinutes,
      breakMinutes: newPreset.value.breakMinutes,
    })
    ElMessage.success('创建成功')
    selectedPresetId.value = resp.data?.data?.id
    presetDialog.value = false
    await loadPresets()
  } catch (e) {
    ElMessage.error('创建失败')
  }
}

async function deletePreset(presetId) {
  const preset = presets.value.find((p) => p.id === presetId)
  if (!preset || preset.isDefault) {
    ElMessage.warning('默认预设不可删除')
    return
  }
  try {
    await ElMessageBox.confirm(`确定要删除预设「${preset.name}」吗？`, '提示', {
      type: 'warning',
    })
    await api.delete(`/focus/presets/${presetId}`)
    ElMessage.success('删除成功')
    if (selectedPresetId.value === presetId) {
      const defaultPreset = presets.value.find((p) => p.isDefault && p.id !== presetId)
      selectedPresetId.value = defaultPreset?.id || null
    }
    await loadPresets()
  } catch {
  }
}

async function setDefaultPreset(presetId) {
  try {
    await api.post(`/focus/presets/${presetId}/set-default`)
    ElMessage.success('已设为默认')
    await loadPresets()
  } catch (e) {
    ElMessage.error('设置失败')
  }
}

function handleBeforeUnload(e) {
  if (timerPhase.value === 'focus' || timerPhase.value === 'paused') {
    e.preventDefault()
    e.returnValue = '专注进行中，确定要离开吗？'
    return e.returnValue
  }
}

watch(selectedPresetId, () => {
  if (timerPhase.value === 'idle' && currentPreset.value) {
    remainingSeconds.value = currentPreset.value.focusMinutes * 60
    totalSeconds.value = currentPreset.value.focusMinutes * 60
  }
})

onMounted(async () => {
  await loadPresets()
  if (currentPreset.value) {
    remainingSeconds.value = currentPreset.value.focusMinutes * 60
    totalSeconds.value = currentPreset.value.focusMinutes * 60
  }
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeRouteLeave(async (to, from, next) => {
  if (timerPhase.value === 'focus' || timerPhase.value === 'paused') {
    try {
      await ElMessageBox.confirm('专注进行中，确定要离开页面吗？离开会中断当前专注。', '提示', {
        confirmButtonText: '确定离开',
        cancelButtonText: '继续专注',
        type: 'warning',
      })
      next()
    } catch {
      next(false)
    }
  } else {
    next()
  }
})

onBeforeUnmount(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

defineExpose({
  isRunning: computed(() => timerPhase.value === 'focus' || timerPhase.value === 'break'),
  currentPhase: timerPhase,
})
</script>

<template>
  <ElCard style="border-radius: 14px">
    <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16px">
      <div style="font-weight: 700">🍅 专注计时</div>
      <div style="font-size: 12px; color: #64748b">番茄钟工作流</div>
    </div>

    <div style="text-align: center; margin-bottom: 20px">
      <ElTag :color="phaseColor" effect="dark" size="large" style="margin-bottom: 12px">
        {{ phaseLabel }}
      </ElTag>
      <div
        style="font-size: 56px; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: 2px; color: #1e293b"
      >
        {{ displayTime }}
      </div>
      <div style="margin-top: 12px">
        <div
          style="
            width: 100%;
            height: 6px;
            background: #e2e8f0;
            border-radius: 3px;
            overflow: hidden;
          "
        >
          <div
            :style="{ width: progressPercent + '%', backgroundColor: phaseColor }"
            style="height: 100%; transition: width 0.3s ease"
          ></div>
        </div>
      </div>
      <div v-if="resourceName" style="margin-top: 12px; font-size: 13px; color: #64748b">
        当前学习：<span style="color: #334155; font-weight: 500">{{ resourceName }}</span>
      </div>
    </div>

    <div style="display: flex; gap: 8px; margin-bottom: 16px">
      <ElSelect
        v-model="selectedPresetId"
        placeholder="选择预设"
        size="small"
        style="flex: 1"
        :disabled="timerPhase !== 'idle'"
      >
        <ElOption v-for="p in presets" :key="p.id" :label="p.name + (p.isDefault ? '（默认）' : '')" :value="p.id">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
            <span>{{ p.name }}{{ p.isDefault ? '（默认）' : '' }}</span>
            <span style="font-size: 12px; color: #94a3b8">
              {{ p.focusMinutes }}/{{ p.breakMinutes }}分钟
            </span>
          </div>
        </ElOption>
      </ElSelect>
      <ElButton size="small" @click="openPresetDialog" :disabled="timerPhase !== 'idle'">
        新建
      </ElButton>
    </div>

    <div style="display: flex; flex-direction: column; gap: 8px">
      <div style="display: flex; gap: 8px">
        <ElButton
          v-if="timerPhase === 'idle' || timerPhase === 'paused'"
          type="primary"
          style="flex: 1"
          @click="startFocus"
        >
          {{ timerPhase === 'paused' ? '继续专注' : '开始专注' }}
        </ElButton>
        <ElButton v-if="timerPhase === 'focus'" style="flex: 1" @click="pauseTimer">
          暂停
        </ElButton>
        <ElButton v-if="timerPhase === 'break'" style="flex: 1" @click="skipBreak">
          跳过休息
        </ElButton>
        <ElButton v-if="timerPhase !== 'idle'" type="danger" plain @click="stopSession">
          结束
        </ElButton>
      </div>
    </div>

    <div v-if="presets.length > 0" style="margin-top: 16px">
      <div style="font-size: 12px; color: #64748b; margin-bottom: 8px">我的预设</div>
      <div style="display: flex; flex-wrap: wrap; gap: 8px">
        <div
          v-for="p in presets"
          :key="p.id"
          :style="{
            padding: '8px 12px',
            borderRadius: '8px',
            background: selectedPresetId === p.id ? '#eff6ff' : '#f8fafc',
            border: selectedPresetId === p.id ? '1px solid #2563eb' : '1px solid #e2e8f0',
            fontSize: '13px',
            cursor: timerPhase === 'idle' ? 'pointer' : 'default',
          }"
          @click="timerPhase === 'idle' && (selectedPresetId = p.id)"
        >
          <div style="font-weight: 500; color: #334155">
            {{ p.name }}
            <span v-if="p.isDefault" style="font-size: 11px; color: #2563eb">默认</span>
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 2px">
            专注 {{ p.focusMinutes }}分 · 休息 {{ p.breakMinutes }}分
          </div>
          <div v-if="!p.isDefault" style="display: flex; gap: 8px; margin-top: 6px">
            <a
              style="font-size: 11px; color: #64748b; cursor: pointer"
              @click.stop="setDefaultPreset(p.id)"
              >设为默认</a
            >
            <a style="font-size: 11px; color: #ef4444; cursor: pointer" @click.stop="deletePreset(p.id)"
              >删除</a
            >
          </div>
        </div>
      </div>
    </div>
  </ElCard>

  <ElDialog v-model="presetDialog" title="新建预设方案" width="420px">
    <ElForm :model="newPreset" label-width="80px">
      <ElFormItem label="预设名称">
        <ElInput v-model="newPreset.name" placeholder="输入预设名称" maxlength="64" />
      </ElFormItem>
      <ElFormItem label="专注时长">
        <ElInputNumber v-model="newPreset.focusMinutes" :min="1" :max="180" />
        <span style="margin-left: 8px; color: #64748b; font-size: 13px">分钟</span>
      </ElFormItem>
      <ElFormItem label="休息时长">
        <ElInputNumber v-model="newPreset.breakMinutes" :min="1" :max="60" />
        <span style="margin-left: 8px; color: #64748b; font-size: 13px">分钟</span>
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="presetDialog = false">取消</ElButton>
      <ElButton type="primary" @click="createPreset">创建</ElButton>
    </template>
  </ElDialog>

  <ElDialog v-model="summaryDialog" title="🎉 本轮专注完成！" width="480px" :close-on-click-modal="false">
    <div style="text-align: center; margin-bottom: 20px">
      <div style="font-size: 32px; margin-bottom: 8px">🍅</div>
      <div style="font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 4px">
        太棒了！完成了一个番茄钟
      </div>
      <div style="color: #64748b; font-size: 14px">
        专注时长：{{ Math.floor(accumulatedSeconds / 60) }}分{{ accumulatedSeconds % 60 }}秒
      </div>
    </div>

    <ElForm label-width="80px">
      <ElFormItem label="本轮小结">
        <ElInput
          v-model="summaryText"
          type="textarea"
          :rows="4"
          placeholder="记录一下这轮专注的收获..."
          maxlength="500"
          show-word-limit
        />
      </ElFormItem>
    </ElForm>

    <template #footer>
      <ElButton @click="skipBreak">跳过休息</ElButton>
      <ElButton type="primary" @click="confirmEndSession">开始休息</ElButton>
    </template>
  </ElDialog>
</template>
