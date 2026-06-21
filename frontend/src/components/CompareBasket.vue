<script setup>
import { useRouter } from 'vue-router'
import { ElButton, ElTag, ElTooltip, ElMessage } from 'element-plus'
import { Scale, Delete } from '@element-plus/icons-vue'
import { useCompare } from '../stores/compare'

const router = useRouter()
const { selectedResources, selectedCount, canCompare, removeFromCompare, clearCompare, MAX_COMPARE, MIN_COMPARE } = useCompare()

function goToCompare() {
  if (!canCompare.value) {
    ElMessage.warning(`请至少选择 ${MIN_COMPARE} 个资源进行对比`)
    return
  }
  router.push('/resources/compare')
}
</script>

<template>
  <Transition name="slide-up">
    <div
      v-if="selectedCount > 0"
      style="
        position: fixed;
        left: 50%;
        bottom: 24px;
        transform: translateX(-50%);
        background: white;
        border-radius: 14px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 2000;
        min-width: 480px;
        max-width: 90vw;
      "
    >
      <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0">
        <Scale style="width: 20px; height: 20px; color: #2563eb" />
        <span style="font-weight: 600; font-size: 14px">
          对比篮
          <ElTag
            size="small"
            :type="canCompare ? 'success' : 'warning'"
            style="margin-left: 6px"
          >
            {{ selectedCount }}/{{ MAX_COMPARE }}
          </ElTag>
        </span>
      </div>

      <div style="display: flex; gap: 6px; flex: 1; overflow-x: auto; padding: 4px 0">
        <ElTag
          v-for="r in selectedResources"
          :key="r.resourceId"
          closable
          @close="removeFromCompare(r.resourceId)"
          style="white-space: nowrap; flex-shrink: 0"
        >
          <span style="max-width: 120px; display: inline-block; overflow: hidden; text-overflow: ellipsis; vertical-align: middle">
            {{ r.name }}
          </span>
        </ElTag>
      </div>

      <div style="display: flex; gap: 8px; flex-shrink: 0">
        <ElTooltip content="清空对比篮">
          <ElButton size="small" :icon="Delete" @click="clearCompare" />
        </ElTooltip>
        <ElButton
          size="small"
          type="primary"
          :disabled="!canCompare"
          @click="goToCompare"
        >
          开始对比
        </ElButton>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
