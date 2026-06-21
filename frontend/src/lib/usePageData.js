import { onMounted, ref } from 'vue'
import { ElNotification } from 'element-plus'

import { api } from './api'

export function usePageData(url) {
  const data = ref(null)
  const loading = ref(false)

  async function refresh() {
    loading.value = true
    try {
      const resp = await api.get(url)
      data.value = resp.data.data
    } catch (err) {
      ElNotification({
        title: '加载失败',
        message: '页面数据获取失败，请稍后重试',
        type: 'error',
        duration: 2500,
      })
    } finally {
      loading.value = false
    }
  }

  onMounted(refresh)

  return { data, loading, refresh }
}
