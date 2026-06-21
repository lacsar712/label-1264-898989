<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElButton } from 'element-plus'
import { useBadges } from '../stores/badges'
import { RARITY_LABELS } from '../lib/badges'

const { state, closeCelebration } = useBadges()

const currentIndex = ref(0)
const particles = ref([])
const confettiActive = ref(false)

const currentBadge = computed(() => state.celebrationBadges[currentIndex.value] || null)
const hasMultiple = computed(() => state.celebrationBadges.length > 1)
const totalBadges = computed(() => state.celebrationBadges.length)

function createConfetti() {
  confettiActive.value = true
  particles.value = []

  const colors = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4']
  const emojis = ['🎉', '✨', '⭐', '🌟', '💫', '🎊', '🏆', '💎']

  for (let i = 0; i < 60; i++) {
    const isEmoji = Math.random() > 0.6
    particles.value.push({
      id: i,
      x: 50 + (Math.random() - 0.5) * 80,
      y: -10 - Math.random() * 20,
      size: isEmoji ? 16 + Math.random() * 14 : 6 + Math.random() * 6,
      color: isEmoji ? emojis[Math.floor(Math.random() * emojis.length)] : colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      speedX: (Math.random() - 0.5) * 4,
      speedY: 2 + Math.random() * 3,
      delay: Math.random() * 0.5,
      isEmoji,
      gravity: 0.15 + Math.random() * 0.1,
    })
  }

  setTimeout(() => {
    confettiActive.value = false
    particles.value = []
  }, 4000)
}

watch(
  () => state.showCelebration,
  (val) => {
    if (val) {
      currentIndex.value = 0
      setTimeout(() => createConfetti(), 100)
    }
  }
)

watch(
  () => currentIndex.value,
  () => {
    createConfetti()
  }
)

function nextBadge() {
  if (currentIndex.value < totalBadges.value - 1) {
    currentIndex.value++
  } else {
    closeCelebration()
  }
}

function handleClose() {
  closeCelebration()
}

function playSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12)
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.12 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4)
      osc.start(ctx.currentTime + i * 0.12)
      osc.stop(ctx.currentTime + i * 0.12 + 0.4)
    })
    setTimeout(() => ctx.close(), 2000)
  } catch (e) {}
}

onMounted(() => {
  if (state.showCelebration) {
    setTimeout(() => playSound(), 100)
  }
})

watch(
  () => state.showCelebration,
  (val) => {
    if (val) {
      setTimeout(() => playSound(), 100)
    }
  }
)

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="celebration-fade">
      <div
        v-if="state.showCelebration && currentBadge"
        class="celebration-overlay"
        @click.self="handleClose"
      >
        <div class="confetti-container">
          <div
            v-for="p in particles"
            :key="p.id"
            class="confetti-particle"
            :class="{ emoji: p.isEmoji }"
            :style="{
              '--x': p.x + '%',
              '--size': p.size + 'px',
              '--color': p.color,
              '--rot': p.rotation + 'deg',
              '--rot-speed': p.rotationSpeed + 'deg',
              '--speed-x': p.speedX + 'vmax',
              '--speed-y': p.speedY + 'vmax',
              '--delay': p.delay + 's',
              '--gravity': p.gravity + 'vmax',
              left: p.x + '%',
            }"
          >
            {{ p.isEmoji ? p.color : '' }}
          </div>
        </div>

        <div class="light-rays" :style="{ '--badge-color': currentBadge.color }"></div>

        <Transition name="badge-pop" appear>
          <div
            class="celebration-card"
            :key="currentIndex"
            :style="{
              '--badge-color': currentBadge.color,
              '--badge-bg': currentBadge.bgColor,
            }"
          >
            <div class="card-glow"></div>

            <div style="text-align: center">
              <div
                v-if="hasMultiple"
                style="font-size: 13px; color: #64748b; margin-bottom: 12px; font-weight: 500"
              >
                {{ currentIndex + 1 }} / {{ totalBadges }}
              </div>

              <div class="unlock-badge">🎉</div>
              <div class="unlock-text">徽章解锁！</div>

              <div class="badge-display">
                <div class="badge-ring-outer"></div>
                <div class="badge-ring-inner"></div>
                <div class="badge-icon-large">{{ currentBadge.icon }}</div>
              </div>

              <div class="badge-name">{{ currentBadge.name }}</div>

              <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 12px">
                <span
                  class="rarity-tag"
                  :style="{ background: currentBadge.bgColor, color: currentBadge.color }"
                >
                  {{ RARITY_LABELS[currentBadge.rarity] }}
                </span>
                <span class="category-tag">{{ currentBadge.category }}</span>
              </div>

              <div class="badge-desc">{{ currentBadge.description }}</div>
              <div class="unlock-time">解锁于 {{ formatDate(new Date().toISOString()) }}</div>

              <div class="progress-info">
                <span class="progress-current">{{ currentBadge.target }}</span>
                <span class="progress-sep">/</span>
                <span class="progress-target">{{ currentBadge.target }}</span>
                <span class="progress-label">达成目标</span>
              </div>
            </div>

            <div style="margin-top: 24px; display: flex; gap: 10px; justify-content: center">
              <ElButton @click="handleClose" size="large">
                关闭
              </ElButton>
              <ElButton type="primary" size="large" @click="nextBadge">
                {{ currentIndex < totalBadges - 1 ? '下一个' : '太棒了！' }}
              </ElButton>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.celebration-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.celebration-fade-enter-active,
.celebration-fade-leave-active {
  transition: opacity 0.3s ease;
}
.celebration-fade-enter-from,
.celebration-fade-leave-to {
  opacity: 0;
}

.badge-pop-enter-active {
  animation: badge-pop-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.badge-pop-leave-active {
  animation: badge-pop-out 0.3s ease;
}

@keyframes badge-pop-in {
  0% {
    opacity: 0;
    transform: scale(0.5) translateY(30px);
  }
  60% {
    transform: scale(1.05) translateY(-5px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes badge-pop-out {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
}

.confetti-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.confetti-particle {
  position: absolute;
  top: -5%;
  width: var(--size);
  height: var(--size);
  background: var(--color);
  border-radius: 3px;
  animation: confetti-fall 3.5s ease-out forwards;
  animation-delay: var(--delay);
  transform: rotate(var(--rot));
}

.confetti-particle.emoji {
  background: transparent;
  font-size: var(--size);
  line-height: 1;
  width: auto;
  height: auto;
  border-radius: 0;
}

@keyframes confetti-fall {
  0% {
    transform: rotate(var(--rot)) translate(0, 0);
    opacity: 1;
  }
  100% {
    transform: rotate(calc(var(--rot) + 720deg)) translate(var(--speed-x), 110vh);
    opacity: 0;
  }
}

.light-rays {
  position: absolute;
  width: 800px;
  height: 800px;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    var(--badge-color) 10deg,
    transparent 20deg,
    transparent 40deg,
    var(--badge-color) 50deg,
    transparent 60deg,
    transparent 90deg,
    var(--badge-color) 100deg,
    transparent 110deg,
    transparent 140deg,
    var(--badge-color) 150deg,
    transparent 160deg,
    transparent 200deg,
    var(--badge-color) 210deg,
    transparent 220deg,
    transparent 260deg,
    var(--badge-color) 270deg,
    transparent 280deg,
    transparent 320deg,
    var(--badge-color) 330deg,
    transparent 340deg,
    transparent 360deg
  );
  opacity: 0.15;
  filter: blur(30px);
  animation: rays-spin 20s linear infinite;
  pointer-events: none;
}

@keyframes rays-spin {
  from {
    transform: rotate(0deg) scale(1.5);
  }
  to {
    transform: rotate(360deg) scale(1.5);
  }
}

.celebration-card {
  position: relative;
  background: white;
  border-radius: 24px;
  padding: 36px 44px 28px;
  max-width: 420px;
  width: calc(100% - 48px);
  box-shadow: 0 25px 80px -20px rgba(0, 0, 0, 0.4);
  border: 2px solid var(--badge-color);
  overflow: hidden;
}

.card-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, var(--badge-bg) 0%, transparent 60%);
  opacity: 0.5;
  pointer-events: none;
  animation: glow-pulse 3s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.05);
  }
}

.unlock-badge {
  font-size: 32px;
  margin-bottom: 4px;
  animation: bounce-in 0.8s ease-out 0.2s both;
}

@keyframes bounce-in {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.unlock-text {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 20px;
  font-weight: 500;
  letter-spacing: 2px;
}

.badge-display {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-ring-outer {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid var(--badge-color);
  animation: ring-pulse 2s ease-in-out infinite;
}

.badge-ring-inner {
  position: absolute;
  inset: 10px;
  border-radius: 50%;
  background: var(--badge-bg);
  border: 2px dashed var(--badge-color);
  opacity: 0.6;
}

@keyframes ring-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.7;
  }
}

.badge-icon-large {
  font-size: 56px;
  position: relative;
  z-index: 1;
  animation: icon-float 3s ease-in-out infinite;
  filter: drop-shadow(0 4px 12px var(--badge-color));
}

@keyframes icon-float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

.badge-name {
  font-size: 24px;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 10px;
  background: linear-gradient(135deg, var(--badge-color), #1e293b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.rarity-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
}

.category-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
  background: #f1f5f9;
  color: #475569;
}

.badge-desc {
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  margin-bottom: 8px;
  padding: 0 12px;
}

.unlock-time {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 14px;
}

.progress-info {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding: 8px 20px;
  background: var(--badge-bg);
  border-radius: 100px;
  color: var(--badge-color);
}

.progress-current {
  font-size: 20px;
  font-weight: 800;
}

.progress-sep {
  font-size: 14px;
  opacity: 0.5;
}

.progress-target {
  font-size: 14px;
  font-weight: 600;
}

.progress-label {
  font-size: 12px;
  margin-left: 6px;
  opacity: 0.8;
}
</style>
