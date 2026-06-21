<script setup>
import { computed } from 'vue'
import { ElCard, ElProgress, ElTag, ElTooltip, ElEmpty } from 'element-plus'
import { useBadges } from '../stores/badges'
import { RARITY_LABELS, RARITY_ORDER, BADGE_DEFINITIONS } from '../lib/badges'

const emit = defineEmits(['view-all'])

const { recentBadges, unlockedCount, totalCount, completionRate, badgesWithStatus, state } =
  useBadges()

const rarityStats = computed(() => {
  const result = {}
  for (const rarity of RARITY_ORDER) {
    const total = BADGE_DEFINITIONS.filter((b) => b.rarity === rarity).length
    const unlocked = state.unlockedBadges.filter((ub) => {
      const badge = BADGE_DEFINITIONS.find((b) => b.id === ub.id)
      return badge?.rarity === rarity
    }).length
    result[rarity] = { total, unlocked }
  }
  return result
})

const nextMilestone = computed(() => {
  const sorted = [...badgesWithStatus.value]
    .filter((b) => !b.unlocked)
    .sort((a, b) => b.progress.percent - a.progress.percent)
  return sorted[0] || null
})

function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  return date.toLocaleDateString('zh-CN')
}
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 16px">
    <ElCard style="border-radius: 14px">
      <div
        style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16px"
      >
        <div style="display: flex; align-items: center; gap: 8px">
          <div style="font-weight: 800; font-size: 16px">🏆 我的成就</div>
          <el-tag
            v-if="state.newlyUnlocked.length > 0"
            type="danger"
            effect="dark"
            size="small"
            style="animation: pulse-badge 2s infinite"
          >
            {{ state.newlyUnlocked.length }} 新徽章
          </el-tag>
        </div>
        <el-button link type="primary" size="small" @click="emit('view-all')">
          查看全部 →
        </el-button>
      </div>

      <div style="margin-bottom: 18px">
        <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px">
          <div style="font-size: 13px; color: #64748b">总体完成度</div>
          <div style="font-weight: 700; color: #1e293b; font-size: 15px">
            {{ unlockedCount }}<span style="color: #94a3b8; font-weight: 500"> / {{ totalCount }}</span>
            <span style="margin-left: 6px; color: #22c55e">{{ completionRate }}%</span>
          </div>
        </div>
        <ElProgress
          :percentage="completionRate"
          :stroke-width="10"
          :show-text="false"
          :color="[
            { color: '#22c55e', percentage: 20 },
            { color: '#3b82f6', percentage: 50 },
            { color: '#8b5cf6', percentage: 80 },
            { color: '#f59e0b', percentage: 100 },
          ]"
        />
      </div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px">
        <div
          v-for="(stat, rarity) in rarityStats"
          :key="rarity"
          style="text-align: center; padding: 8px 4px; border-radius: 10px; background: #f8fafc"
        >
          <div
            style="
              font-size: 10px;
              margin-bottom: 4px;
              padding: 1px 8px;
              border-radius: 100px;
              display: inline-block;
            "
            :class="{
              'bg-green-100 text-green-700': rarity === 'common',
              'bg-blue-100 text-blue-700': rarity === 'uncommon',
              'bg-purple-100 text-purple-700': rarity === 'rare',
              'bg-amber-100 text-amber-700': rarity === 'legendary',
            }"
          >
            {{ RARITY_LABELS[rarity] }}
          </div>
          <div style="font-size: 16px; font-weight: 800; color: #1e293b">
            {{ stat.unlocked }}<span style="color: #94a3b8; font-size: 12px; font-weight: 500">/{{ stat.total }}</span>
          </div>
        </div>
      </div>

      <div v-if="nextMilestone && nextMilestone.progress.percent > 0" style="margin-bottom: 16px">
        <div style="font-size: 12px; color: #64748b; margin-bottom: 8px; font-weight: 500">
          💡 即将解锁
        </div>
        <div
          :style="{
            padding: '10px 12px',
            borderRadius: '10px',
            background: nextMilestone.bgColor,
            border: `1px solid ${nextMilestone.color}30`,
          }"
        >
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px">
            <div style="font-size: 24px; filter: grayscale(60%); opacity: 0.7">
              {{ nextMilestone.icon }}
            </div>
            <div style="flex: 1">
              <div style="font-weight: 600; font-size: 13px; color: #1e293b">
                {{ nextMilestone.name }}
              </div>
              <div style="font-size: 11px; color: #64748b">{{ nextMilestone.description }}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px">
            <ElProgress
              :percentage="nextMilestone.progress.percent"
              :stroke-width="5"
              :show-text="false"
              :color="nextMilestone.color"
              style="flex: 1"
            />
            <span style="font-size: 11px; color: #64748b; font-weight: 500">
              {{ nextMilestone.progress.current }}/{{ nextMilestone.progress.target }}
            </span>
          </div>
        </div>
      </div>
    </ElCard>

    <ElCard style="border-radius: 14px">
      <div
        style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14px"
      >
        <div style="font-weight: 700; font-size: 14px">✨ 最近获得</div>
        <div style="font-size: 12px; color: #94a3b8">{{ recentBadges.length }} 枚徽章</div>
      </div>

      <div v-if="recentBadges.length === 0">
        <div
          style="
            text-align: center;
            padding: 24px 12px;
            color: #94a3b8;
            font-size: 13px;
          "
        >
          <div style="font-size: 32px; margin-bottom: 6px">🎯</div>
          <div style="margin-bottom: 4px; color: #64748b; font-weight: 500">还没有徽章</div>
          <div style="font-size: 12px">完成学习任务来解锁你的第一枚徽章吧！</div>
        </div>
      </div>

      <div v-else style="display: flex; flex-direction: column; gap: 10px">
        <ElTooltip
          v-for="badge in recentBadges"
          :key="badge.id"
          placement="right"
          :show-after="200"
        >
          <template #content>
            <div style="max-width: 200px; padding: 4px">
              <div style="font-weight: 600; margin-bottom: 4px; font-size: 13px">
                {{ badge.name }}
              </div>
              <div style="font-size: 12px; color: #94a3b8">{{ badge.description }}</div>
            </div>
          </template>

          <div
            :style="{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              borderRadius: '10px',
              background: badge.bgColor,
              border: `1px solid ${badge.color}20`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }"
            class="recent-badge-item"
          >
            <div
              :style="{
                position: 'relative',
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                boxShadow: `0 2px 8px ${badge.color}20`,
              }"
            >
              <div
                v-if="badge.isNew"
                style="position: absolute; top: -4px; right: -4px; background: #ef4444; color: white; font-size: 9px; padding: 1px 5px; border-radius: 100px; font-weight: 600"
              >
                NEW
              </div>
              {{ badge.icon }}
            </div>

            <div style="flex: 1; min-width: 0">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px">
                <div
                  :style="{
                    fontWeight: 600,
                    fontSize: '13px',
                    color: '#1e293b',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }"
                >
                  {{ badge.name }}
                </div>
                <ElTag
                  :color="badge.color"
                  effect="light"
                  size="small"
                  style="font-size: 10px; padding: 0 6px; height: 16px; line-height: 16px; flex-shrink: 0"
                >
                  {{ RARITY_LABELS[badge.rarity] }}
                </ElTag>
              </div>
              <div style="font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 6px">
                <span>{{ badge.category }}</span>
                <span style="color: #cbd5e1">·</span>
                <span>{{ formatTimeAgo(badge.unlockedAt) }}</span>
              </div>
            </div>

            <div
              :style="{
                fontSize: '18px',
                color: badge.color,
                opacity: 0.6,
              }"
            >
              ✓
            </div>
          </div>
        </ElTooltip>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.bg-green-100 { background: #dcfce7; }
.text-green-700 { color: #15803d; }
.bg-blue-100 { background: #dbeafe; }
.text-blue-700 { color: #1d4ed8; }
.bg-purple-100 { background: #ede9fe; }
.text-purple-700 { color: #7c3aed; }
.bg-amber-100 { background: #fef3c7; }
.text-amber-700 { color: #b45309; }

.recent-badge-item:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

@keyframes pulse-badge {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.85;
  }
}
</style>
