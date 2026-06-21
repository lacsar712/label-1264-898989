import { computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'

const MAX_COMPARE = 4
const MIN_COMPARE = 2

const state = reactive({
  selectedResources: [],
})

function addToCompare(resource) {
  if (state.selectedResources.length >= MAX_COMPARE) {
    ElMessage.warning(`最多只能对比 ${MAX_COMPARE} 个资源`)
    return false
  }
  if (state.selectedResources.some((r) => r.resourceId === resource.resourceId)) {
    ElMessage.warning('该资源已在对比篮中')
    return false
  }
  state.selectedResources.push({ ...resource })
  return true
}

function removeFromCompare(resourceId) {
  const idx = state.selectedResources.findIndex((r) => r.resourceId === resourceId)
  if (idx !== -1) {
    state.selectedResources.splice(idx, 1)
  }
}

function isSelected(resourceId) {
  return state.selectedResources.some((r) => r.resourceId === resourceId)
}

function clearCompare() {
  state.selectedResources = []
}

function toggleCompare(resource) {
  if (isSelected(resource.resourceId)) {
    removeFromCompare(resource.resourceId)
    return false
  }
  return addToCompare(resource)
}

function encodeToUrl() {
  const codes = state.selectedResources.map((r) => r.resourceId)
  return encodeURIComponent(codes.join(','))
}

function decodeFromUrl(encoded) {
  try {
    const decoded = decodeURIComponent(encoded)
    return decoded.split(',').filter(Boolean)
  } catch {
    return []
  }
}

function getShareUrl(router) {
  const codes = encodeToUrl()
  const baseUrl = `${window.location.origin}${router.resolve('/resources/compare').href}`
  return `${baseUrl}?codes=${codes}`
}

function setResources(resources) {
  state.selectedResources = resources.slice(0, MAX_COMPARE)
}

export function useCompare() {
  return {
    state,
    selectedResources: computed(() => state.selectedResources),
    selectedCount: computed(() => state.selectedResources.length),
    canCompare: computed(() => state.selectedResources.length >= MIN_COMPARE && state.selectedResources.length <= MAX_COMPARE),
    isFull: computed(() => state.selectedResources.length >= MAX_COMPARE),
    addToCompare,
    removeFromCompare,
    isSelected,
    clearCompare,
    toggleCompare,
    encodeToUrl,
    decodeFromUrl,
    getShareUrl,
    setResources,
    MAX_COMPARE,
    MIN_COMPARE,
  }
}
