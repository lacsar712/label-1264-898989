<script setup>
import { computed } from 'vue'
import 'echarts'
import VChart from 'vue-echarts'

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: [Number, String], default: 320 },
})

const style = computed(() => ({
  width: '100%',
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
}))
</script>

<template>
  <VChart :option="option" autoresize :style="style" />
</template>
