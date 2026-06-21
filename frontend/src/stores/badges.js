import { computed, reactive, watch } from 'vue'
import { BADGE_DEFINITIONS } from '../lib/badges'

const STORAGE_KEY = 'achievement_badges'
const PROGRESS_KEY = 'achievement_progress'

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null') || {
      completed_resources: 0,
      streak_days: 0,
      last_study_date: null,
      corrected_wrong: 0,
      favorites: 0,
      pomodoro_count: 0,
      study_minutes: 0,
      flashcard_reviews: 0,
      wrong_zero_count: 0,
    }
  } catch {
    return {
      completed_resources: 0,
      streak_days: 0,
      last_study_date: null,
      corrected_wrong: 0,
      favorites: 0,
      pomodoro_count: 0,
      study_minutes: 0,
      flashcard_reviews: 0,
      wrong_zero_count: 0,
    }
  }
}

function loadUnlockedBadges() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

const state = reactive({
  progress: loadProgress(),
  unlockedBadges: loadUnlockedBadges(),
  newlyUnlocked: [],
  showCelebration: false,
  celebrationBadges: [],
})

watch(
  () => state.progress,
  (val) => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(val))
  },
  { deep: true }
)

watch(
  () => state.unlockedBadges,
  (val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
  },
  { deep: true }
)

function saveUnlockedBadge(badgeId) {
  const existing = state.unlockedBadges.find((b) => b.id === badgeId)
  if (existing) return false

  const badge = BADGE_DEFINITIONS.find((b) => b.id === badgeId)
  if (!badge) return false

  const unlockedRecord = {
    id: badgeId,
    unlockedAt: new Date().toISOString(),
  }
  state.unlockedBadges.push(unlockedRecord)
  state.newlyUnlocked.push(badge)
  return true
}

function checkBadgeUnlock() {
  const justUnlocked = []

  for (const badge of BADGE_DEFINITIONS) {
    const alreadyUnlocked = state.unlockedBadges.some((b) => b.id === badge.id)
    if (alreadyUnlocked) continue

    let current = 0
    switch (badge.type) {
      case 'completed_resources':
        current = state.progress.completed_resources
        break
      case 'streak_days':
        current = state.progress.streak_days
        break
      case 'corrected_wrong':
        current = state.progress.corrected_wrong
        break
      case 'favorites':
        current = state.progress.favorites
        break
      case 'pomodoro_count':
        current = state.progress.pomodoro_count
        break
      case 'study_minutes':
        current = state.progress.study_minutes
        break
      case 'flashcard_reviews':
        current = state.progress.flashcard_reviews
        break
      case 'wrong_zero':
        current = state.progress.wrong_zero_count
        break
    }

    if (current >= badge.target) {
      if (saveUnlockedBadge(badge.id)) {
        justUnlocked.push(badge)
      }
    }
  }

  if (justUnlocked.length > 0) {
    state.celebrationBadges = justUnlocked
    state.showCelebration = true
  }

  return justUnlocked
}

function updateProgress(type, delta = 1, value = null) {
  switch (type) {
    case 'completed_resources':
      if (value !== null) {
        state.progress.completed_resources = Math.max(state.progress.completed_resources, value)
      } else {
        state.progress.completed_resources += delta
      }
      break
    case 'corrected_wrong':
      if (value !== null) {
        state.progress.corrected_wrong = Math.max(state.progress.corrected_wrong, value)
      } else {
        state.progress.corrected_wrong += delta
      }
      break
    case 'favorites':
      if (value !== null) {
        state.progress.favorites = Math.max(state.progress.favorites, value)
      } else {
        state.progress.favorites += delta
      }
      break
    case 'pomodoro_count':
      if (value !== null) {
        state.progress.pomodoro_count = Math.max(state.progress.pomodoro_count, value)
      } else {
        state.progress.pomodoro_count += delta
      }
      break
    case 'study_minutes':
      if (value !== null) {
        state.progress.study_minutes = Math.max(state.progress.study_minutes, value)
      } else {
        state.progress.study_minutes += delta
      }
      break
    case 'flashcard_reviews':
      if (value !== null) {
        state.progress.flashcard_reviews = Math.max(state.progress.flashcard_reviews, value)
      } else {
        state.progress.flashcard_reviews += delta
      }
      break
    case 'wrong_zero':
      if (value !== null) {
        state.progress.wrong_zero_count = Math.max(state.progress.wrong_zero_count, value)
      } else {
        state.progress.wrong_zero_count += delta
      }
      break
    case 'study_date':
      const today = new Date().toISOString().split('T')[0]
      if (state.progress.last_study_date === today) {
        break
      }
      const lastDate = state.progress.last_study_date
        ? new Date(state.progress.last_study_date)
        : null
      const todayDate = new Date(today)

      if (lastDate) {
        const diffTime = todayDate - lastDate
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        if (diffDays === 1) {
          state.progress.streak_days += 1
        } else if (diffDays > 1) {
          state.progress.streak_days = 1
        }
      } else {
        state.progress.streak_days = 1
      }
      state.progress.last_study_date = today
      break
  }

  return checkBadgeUnlock()
}

function syncFromServerData(serverData) {
  if (serverData.completedResources7d !== undefined) {
    const total = (state.progress.completed_resources || 0) + (serverData.completedResources7d || 0)
    state.progress.completed_resources = Math.max(state.progress.completed_resources, total)
  }
  if (serverData.totalStudyMinutes7d !== undefined) {
    state.progress.study_minutes = Math.max(
      state.progress.study_minutes,
      Math.round(serverData.totalStudyMinutes7d)
    )
  }
  if (serverData.pomodoroCount7d !== undefined) {
    state.progress.pomodoro_count = Math.max(
      state.progress.pomodoro_count,
      serverData.pomodoroCount7d
    )
  }
  return checkBadgeUnlock()
}

function getBadgeProgress(badgeId) {
  const badge = BADGE_DEFINITIONS.find((b) => b.id === badgeId)
  if (!badge) return { current: 0, target: 0, percent: 0 }

  let current = 0
  switch (badge.type) {
    case 'completed_resources':
      current = state.progress.completed_resources
      break
    case 'streak_days':
      current = state.progress.streak_days
      break
    case 'corrected_wrong':
      current = state.progress.corrected_wrong
      break
    case 'favorites':
      current = state.progress.favorites
      break
    case 'pomodoro_count':
      current = state.progress.pomodoro_count
      break
    case 'study_minutes':
      current = state.progress.study_minutes
      break
    case 'flashcard_reviews':
      current = state.progress.flashcard_reviews
      break
    case 'wrong_zero':
      current = state.progress.wrong_zero_count
      break
  }

  const percent = Math.min(100, Math.round((current / badge.target) * 100))
  return { current, target: badge.target, percent }
}

function isBadgeUnlocked(badgeId) {
  return state.unlockedBadges.some((b) => b.id === badgeId)
}

function getUnlockedBadgeDetail(badgeId) {
  return state.unlockedBadges.find((b) => b.id === badgeId) || null
}

function getRecentUnlocked(limit = 5) {
  const sorted = [...state.unlockedBadges].sort(
    (a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt)
  )
  return sorted.slice(0, limit).map((record) => {
    const badge = BADGE_DEFINITIONS.find((b) => b.id === record.id)
    return {
      ...badge,
      unlockedAt: record.unlockedAt,
    }
  })
}

function closeCelebration() {
  state.showCelebration = false
  state.celebrationBadges = []
}

function dismissNewBadge(badgeId) {
  const idx = state.newlyUnlocked.findIndex((b) => b.id === badgeId)
  if (idx > -1) {
    state.newlyUnlocked.splice(idx, 1)
  }
}

export function useBadges() {
  return {
    state,
    allBadges: computed(() => BADGE_DEFINITIONS),
    unlockedCount: computed(() => state.unlockedBadges.length),
    totalCount: computed(() => BADGE_DEFINITIONS.length),
    completionRate: computed(() =>
      Math.round((state.unlockedBadges.length / BADGE_DEFINITIONS.length) * 100)
    ),
    recentBadges: computed(() => getRecentUnlocked(5)),
    badgesWithStatus: computed(() => {
      return BADGE_DEFINITIONS.map((badge) => {
        const unlocked = isBadgeUnlocked(badge.id)
        const progress = getBadgeProgress(badge.id)
        const detail = getUnlockedBadgeDetail(badge.id)
        const isNew = state.newlyUnlocked.some((b) => b.id === badge.id)
        return {
          ...badge,
          unlocked,
          progress,
          unlockedAt: detail?.unlockedAt || null,
          isNew,
        }
      })
    }),
    updateProgress,
    syncFromServerData,
    getBadgeProgress,
    isBadgeUnlocked,
    getRecentUnlocked,
    closeCelebration,
    dismissNewBadge,
    checkBadgeUnlock,
  }
}
