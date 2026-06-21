import { createApp } from 'vue'
import ElementPlus, { ElNotification } from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'

import 'echarts'
import 'echarts-wordcloud'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(ElementPlus)
app.use(router)

app.config.errorHandler = (err) => {
  ElNotification({
    title: '页面异常',
    message: err?.message || '发生未知错误',
    type: 'error',
    duration: 2500,
  })
}

app.mount('#app')
