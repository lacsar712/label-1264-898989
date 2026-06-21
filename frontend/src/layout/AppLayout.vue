<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElButton, ElDropdown, ElDropdownItem, ElDropdownMenu, ElScrollbar } from 'element-plus'
import {
  DataAnalysis,
  DataBoard,
  Files,
  Setting,
  User,
  TrendCharts,
  School,
  SwitchButton,
  Compass,
  Document,
  Reading,
  Edit,
  Medal,
} from '@element-plus/icons-vue'

import ErrorBoundary from '../components/ErrorBoundary.vue'
import BadgeCelebration from '../components/BadgeCelebration.vue'
import { useAuth } from '../stores/auth'
import { useBadges } from '../stores/badges'
import { api } from '../lib/api'

const route = useRoute()
const router = useRouter()
const { state, isAdmin, clearAuth } = useAuth()
const { state: badgesState } = useBadges()

const active = computed(() => route.path)

const todayDueCount = ref(0)

async function loadTodayDueCount() {
  try {
    const resp = await api.get('/flashcards/today-count')
    todayDueCount.value = resp.data?.data?.count || 0
  } catch (e) {}
}

function logout() {
  clearAuth()
  router.replace('/login')
}

onMounted(loadTodayDueCount)
</script>

<template>
  <div class="app-shell">
    <el-container style="height: 100%">
      <el-aside width="240px" style="padding: 16px 12px">
        <div style="display: flex; align-items: center; gap: 10px; padding: 8px 10px; margin-bottom: 12px">
          <School style="width: 20px; height: 20px; color: #2563eb" />
          <div style="font-weight: 700; letter-spacing: 0.2px">教学资源推荐</div>
        </div>

        <el-menu :default-active="active" router style="border-right: none">
          <el-menu-item index="/home">
            <el-icon><DataBoard /></el-icon>
            <span>首页</span>
          </el-menu-item>
          <el-menu-item index="/resources">
            <el-icon><Files /></el-icon>
            <span>资源库</span>
          </el-menu-item>
          <el-menu-item index="/recommendation-analysis">
            <el-icon><DataAnalysis /></el-icon>
            <span>推荐分析</span>
          </el-menu-item>
          <el-menu-item index="/progress">
            <el-icon><TrendCharts /></el-icon>
            <span>学习进度</span>
          </el-menu-item>
          <el-menu-item index="/ability-map">
            <el-icon><Compass /></el-icon>
            <span>能力图谱</span>
          </el-menu-item>
          <el-menu-item index="/assignments">
            <el-icon><Document /></el-icon>
            <span>我的作业</span>
          </el-menu-item>
          <el-menu-item index="/flashcards">
            <el-icon><Reading /></el-icon>
            <span>闪卡复习</span>
            <span
              v-if="todayDueCount > 0"
              style="
                margin-left: 6px;
                background: #ef4444;
                color: white;
                font-size: 11px;
                font-weight: 700;
                padding: 1px 6px;
                border-radius: 10px;
                min-width: 18px;
                text-align: center;
                line-height: 16px;
              "
            >
              {{ todayDueCount }}
            </span>
          </el-menu-item>
          <el-menu-item index="/diary">
            <el-icon><Edit /></el-icon>
            <span>学习日记</span>
          </el-menu-item>
          <el-menu-item index="/badges">
            <el-icon><Medal /></el-icon>
            <span>成就徽章</span>
            <span
              v-if="badgesState.newlyUnlocked.length > 0"
              style="
                margin-left: 6px;
                background: #f59e0b;
                color: white;
                font-size: 11px;
                font-weight: 700;
                padding: 1px 6px;
                border-radius: 10px;
                min-width: 18px;
                text-align: center;
                line-height: 16px;
                animation: pulse-badge 2s infinite;
              "
            >
              {{ badgesState.newlyUnlocked.length }}
            </span>
          </el-menu-item>
          <el-menu-item index="/my-reports">
            <el-icon><Files /></el-icon>
            <span>学情报告</span>
          </el-menu-item>

          <el-sub-menu v-if="isAdmin" index="/admin">
            <template #title>
              <el-icon><Setting /></el-icon>
              <span>管理员</span>
            </template>
            <el-menu-item index="/admin/users">
              <el-icon><User /></el-icon>
              <span>用户管理</span>
            </el-menu-item>
            <el-menu-item index="/admin/resources">
              <el-icon><Files /></el-icon>
              <span>资源管理</span>
            </el-menu-item>
            <el-menu-item index="/admin/system">
              <el-icon><Setting /></el-icon>
              <span>系统配置</span>
            </el-menu-item>
            <el-menu-item index="/admin/assignments">
              <el-icon><Document /></el-icon>
              <span>作业管理</span>
            </el-menu-item>
            <el-menu-item index="/admin/reports">
              <el-icon><Files /></el-icon>
              <span>报告管理</span>
            </el-menu-item>
          </el-sub-menu>
        </el-menu>
      </el-aside>

      <el-container>
        <el-header height="56px" style="display: flex; align-items: center; justify-content: space-between">
          <div style="display: flex; align-items: baseline; gap: 10px">
            <div style="font-weight: 700">智能教学资源个性化推荐系统</div>
            <div style="font-size: 12px; color: #64748b">教育风格 · 全景数据</div>
          </div>

          <div style="display: flex; align-items: center; gap: 12px">
            <el-dropdown>
              <el-button type="primary" plain>
                <span style="margin-right: 8px">{{ state.user?.name || '未登录' }}</span>
                <SwitchButton style="width: 16px; height: 16px" />
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item disabled>{{ state.user?.role === 'admin' ? '管理员' : '学习者' }}</el-dropdown-item>
                  <el-dropdown-item @click="logout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>

        <el-main style="padding: 0; height: calc(100vh - 56px)">
          <el-scrollbar class="page-scroll">
            <ErrorBoundary>
              <router-view />
            </ErrorBoundary>
          </el-scrollbar>
        </el-main>
      </el-container>
    </el-container>
    <BadgeCelebration />
  </div>
</template>

<style scoped>
@keyframes pulse-badge {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.85;
  }
}
</style>
