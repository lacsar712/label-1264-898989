import { createRouter, createWebHistory } from 'vue-router'

import { useAuth } from '../stores/auth'

import AppLayout from '../layout/AppLayout.vue'
import LoginPage from '../pages/LoginPage.vue'
import HomePage from '../pages/HomePage.vue'
import ResourcesPage from '../pages/ResourcesPage.vue'
import RecommendationAnalysisPage from '../pages/RecommendationAnalysisPage.vue'
import ProgressPage from '../pages/ProgressPage.vue'
import AbilityMapPage from '../pages/AbilityMapPage.vue'
import AdminUsersPage from '../pages/admin/AdminUsersPage.vue'
import AdminResourcesPage from '../pages/admin/AdminResourcesPage.vue'
import AdminSystemPage from '../pages/admin/AdminSystemPage.vue'
import AssignmentPage from '../pages/AssignmentPage.vue'
import FlashcardReviewPage from '../pages/FlashcardReviewPage.vue'
import AdminAssignmentsPage from '../pages/admin/AdminAssignmentsPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginPage },
    {
      path: '/',
      component: AppLayout,
      redirect: '/home',
      children: [
        { path: 'home', component: HomePage },
        { path: 'resources', component: ResourcesPage },
        { path: 'recommendation-analysis', component: RecommendationAnalysisPage },
        { path: 'progress', component: ProgressPage },
        { path: 'ability-map', component: AbilityMapPage },
        { path: 'assignments', component: AssignmentPage },
        { path: 'flashcards', component: FlashcardReviewPage },
        { path: 'admin/users', component: AdminUsersPage },
        { path: 'admin/resources', component: AdminResourcesPage },
        { path: 'admin/system', component: AdminSystemPage },
        { path: 'admin/assignments', component: AdminAssignmentsPage },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/home' },
  ],
})

router.beforeEach((to) => {
  const { isAuthed, isAdmin } = useAuth()
  if (to.path === '/login') {
    if (isAuthed.value) return '/home'
    return true
  }
  if (!isAuthed.value) return '/login'

  if (to.path.startsWith('/admin') && !isAdmin.value) return '/home'
  return true
})

export default router
