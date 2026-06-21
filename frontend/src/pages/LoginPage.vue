<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElCard, ElForm, ElFormItem, ElInput, ElNotification } from 'element-plus'
import { z } from 'zod'

import { api } from '../lib/api'
import { useAuth } from '../stores/auth'

const router = useRouter()
const { setAuth } = useAuth()

const loading = ref(false)
const form = reactive({
  username: '',
  password: '',
})

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

async function submit() {
  const parsed = schema.safeParse(form)
  if (!parsed.success) {
    ElNotification({ title: '提示', message: '请输入完整登录信息', type: 'warning', duration: 2000 })
    return
  }

  loading.value = true
  try {
    const resp = await api.post('/auth/login', parsed.data)
    setAuth(resp.data.data)
    router.replace('/home')
  } catch {
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div style="height: 100vh; width: 100vw; display: grid; place-items: center; padding: 24px">
    <ElCard style="width: min(420px, 92vw); border-radius: 14px">
      <div style="font-weight: 800; font-size: 18px; margin-bottom: 6px; color: #0f172a">系统登录</div>
      <div style="color: #64748b; font-size: 12px; margin-bottom: 18px">登录后进入智能教学资源个性化推荐系统</div>

      <ElForm @submit.prevent>
        <ElFormItem label="登录ID">
          <ElInput v-model="form.username" placeholder="请输入登录ID" autocomplete="username" />
        </ElFormItem>
        <ElFormItem label="访问口令">
          <ElInput
            v-model="form.password"
            type="password"
            placeholder="请输入访问口令"
            autocomplete="current-password"
            show-password
          />
        </ElFormItem>
        <ElButton type="primary" style="width: 100%" :loading="loading" @click="submit">登录</ElButton>
      </ElForm>
    </ElCard>
  </div>
</template>
