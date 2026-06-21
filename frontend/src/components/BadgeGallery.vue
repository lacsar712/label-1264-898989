<script setup>
import { computed, ref } from 'vue'
import { ElCard, ElTag, ElTooltip, ElProgress, ElSelect, ElOption } from 'element-plus'
import { useBadges } from '../stores/badges'
import { RARITY_LABELS, RARITY_ORDER } from '../lib/badges'

const { badgesWithStatus, unlockedCount, totalCount, completionRate, dismissNewBadge } =
  useBadges()

const filterCategory = ref('all')
const filterRarity = ref('all')
const filterStatus = ref('all')

const categories = computed(() => {
  const set = new Set(badgesWithStatus.value.map((b) => b.category))
  return ['all', ...Array.from(set)]
})

const filteredBadges = computed(() => {
  return badgesWithStatus.value.filter((badge) => {
    if (filterCategory.value !== 'all' && badge.category !== filterCategory.value) return false
    if (filterRarity.value !== 'all' && badge.rarity !== filterRarity.value) return false
    if (filterStatus.value === 'unlocked' && !badge.unlocked) return false
    if (filterStatus.value === 'locked' && badge.unlocked) return false
    return true
  })
})

const sortedBadges = computed(() => {
  return filteredBadges.value.sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1
    const rarityDiff = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
    if (rarityDiff !== 0) return rarityDiff
    return a.target - b.target
  })
})

function formatUnlockedDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function handleBadgeClick(badge) {
  if (badge.isNew) {
    dismissNewBadge(badge.id)
  }
}

const statsByCategory = computed(() => {
  const result = {}
  for (const badge of badgesWithStatus.value) {
    if (!result[badge.category]) {
      result[badge.category] = { total: 0, unlocked: 0 }
    }
    result[badge.category].total++
    if (badge.unlocked) result[badge.category].unlocked++
  }
  return result
})
</script>

<template>
  <ElCard style="border-radius: 14px">
    <div
      style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px"
    >
      <div>
        <div style="font-weight: 800; font-size: 18px">🏅 成就徽章画廊</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px">
          已解锁 {{ unlockedCount }} / {{ totalCount }} 枚徽章 · 完成度 {{ completionRate }}%
        </div>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap">
        <ElSelect v-model="filterCategory" size="small" style="width: 110px">
          <ElOption v-for="c in categories" :key="c" :label="c === 'all' ? '全部分类' : c" :value="c" />
        </ElSelect>
        <ElSelect v-model="filterRarity" size="small" style="width: 100px">
          <ElOption label="全部稀有度" value="all" />
          <ElOption
            v-for="(label, key) in RARITY_LABELS"
            :key="key"
            :label="label"
            :value="key"
          />
        </ElSelect>
        <ElSelect v-model="filterStatus" size="small" style="width: 100px">
          <ElOption label="全部状态" value="all" />
          <ElOption label="已解锁" value="unlocked" />
          <ElOption label="未解锁" value="locked" />
        </ElSelect>
      </div>
    </div>

    <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap">
      <div
        v-for="(stat, cat) in statsByCategory"
        :key="cat"
        style="padding: 6px 12px; background: #f8fafc; border-radius: 8px; font-size: 12px"
      >
        <span style="color: #64748b">{{ cat }}：</span>
        <span style="font-weight: 600; color: #1e293b">{{ stat.unlocked }}/{{ stat.total }}</span>
      </div>
    </div>

    <div
      style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 14px"
    >
      <div
        v-for="badge in sortedBadges"
        :key="badge.id"
        @click="handleBadgeClick(badge)"
        :style="{
          position: 'relative',
          padding: '16px 10px',
          borderRadius: '14px',
          border: badge.unlocked
            ? `2px solid ${badge.color}40`
            : '2px solid #e2e8f0',
          background: badge.unlocked ? badge.bgColor : '#f8fafc',
          cursor: 'pointer',
          transition: 'all 0.25s ease',
          opacity: badge.unlocked ? 1 : 0.85,
        }"
        class="badge-card"
      >
        <div
          v-if="badge.isNew"
          style="position: absolute; top: -6px; right: -6px; background: #ef4444; color: white; font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 600; animation: pulse-badge 2s infinite"
        >
          NEW
        </div>

        <ElTooltip
          placement="top"
          :show-after="200"
        >
          <template #content>
            <div style="max-width: 220px; padding: 4px">
              <div style="font-weight: 600; margin-bottom: 6px; font-size: 13px">{{ badge.name }}</div>
              <div style="font-size: 12px; color: #94a3b8; margin-bottom: 10px">{{ badge.description }}</div>
              <div v-if="badge.unlocked" style="font-size: 11px; color: #22c55e; margin-bottom: 8px">
                ✨ {{ formatUnlockedDate(badge.unlockedAt) }} 解锁
              </div>
              <div v-if="!badge.unlocked">
                <div style="font-size: 11px; color: #64748b; margin-bottom: 6px">
                  当前进度：{{ badge.progress.current }} / {{ badge.progress.target }}
                </div>
                <ElProgress
                  :percentage="badge.progress.percent"
                  :stroke-width="6"
                  :color="badge.color"
                  :show-text="false"
                />
              </div>
            </div>
          </template>

          <div style="text-align: center">
            <div
              :style="{
                fontSize: '38px',
                marginBottom: '8px',
                filter: badge.unlocked ? 'none' : 'grayscale(100%) opacity(0.4)',
                transition: 'filter 0.25s ease',
              }"
              class="badge-icon"
            >
              {{ badge.icon }}
            </div>
            <div
              :style="{
                fontWeight: 600,
                fontSize: '13px',
                color: badge.unlocked ? '#1e293b' : '#94a3b8',
                marginBottom: '4px',
              }"
            >
              {{ badge.unlocked ? badge.name : '???' }}
            </div>
            <div style="display: flex; justify-content: center; gap: 4px; flex-wrap: wrap">
              <ElTag
                :color="badge.color"
                effect="light"
                size="small"
                :style="{
                  opacity: badge.unlocked ? 1 : 0.5,
                  fontSize: '10px',
                  padding: '0 6px',
                  height: '18px',
                  lineHeight: '18px',
                }"
              >
                {{ RARITY_LABELS[badge.rarity] }}
              </ElTag>
              <ElTag
                type="info"
                effect="plain"
                size="small"
                style="font-size: 10px; padding: 0 6px; height: 18px; line-height: 18px"
              >
                {{ badge.category }}
              </ElTag>
            </div>
            <div v-if="!badge.unlocked" style="margin-top: 8px">
              <ElProgress
                :percentage="badge.progress.percent"
                :stroke-width="4"
                :color="badge.color"
                :show-text="false"
              />
            </div>
          </div>
        </ElTooltip>
      </div>
    </div>

    <div
      v-if="sortedBadges.length === 0"
      style="text-align: center; padding: 48px 24px; color: #94a3b8"
    >
      <div style="font-size: 36px; margin-bottom: 8px">🔍</div>
      <div>没有符合筛选条件的徽章</div>
    </div>
  </ElCard>
</template>

<style scoped>
.badge-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.badge-card:hover .badge-icon {
  filter: none !important;
  transform: scale(1.1);
}

.badge-icon {
  transition: all 0.25s ease;
}

@keyframes pulse-badge {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.08);
    opacity: 0.85;
  }
}
</style>
