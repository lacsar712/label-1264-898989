import axios from 'axios'
import { ElNotification } from 'element-plus'

import { useAuth } from '../stores/auth'

export const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const { state } = useAuth()
  if (state.token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${state.token}`
  }
  return config
})

api.interceptors.response.use(
  (resp) => resp,
  (err) => {
    const status = err?.response?.status
    const message = err?.response?.data?.error?.message || err?.message || '请求失败'

    if (status === 401) {
      const { clearAuth } = useAuth()
      clearAuth()
      if (location.pathname !== '/login') location.href = '/login'
      return Promise.reject(err)
    }

    ElNotification({
      title: '请求失败',
      message,
      type: 'error',
      duration: 2500,
    })

    return Promise.reject(err)
  }
)
