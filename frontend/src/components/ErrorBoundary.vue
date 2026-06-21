<script setup>
import { ElButton, ElResult } from 'element-plus'
import { onErrorCaptured, ref } from 'vue'

const error = ref(null)

onErrorCaptured((err) => {
  error.value = err
  return false
})

function reset() {
  error.value = null
}

function refresh() {
  location.reload()
}
</script>

<template>
  <slot v-if="!error" />
  <div v-else style="padding: 24px">
    <ElResult icon="error" title="页面异常" sub-title="请刷新或返回重试">
      <template #extra>
        <ElButton type="primary" @click="reset">重试</ElButton>
        <ElButton @click="refresh">刷新</ElButton>
      </template>
    </ElResult>
  </div>
</template>
