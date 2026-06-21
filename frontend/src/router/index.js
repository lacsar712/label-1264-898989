import { createRouter, createWebHistory } from 'vue-router'

import { useAuth } from '../stores/auth'

import AppLayout from '../layout/AppLayout.vue'
import LoginPage from '../pages/LoginPage.vue'
import HomePage from '../pages/HomePage.vue'
import ResourcesPage from '../pages/ResourcesPage.vue'
import ResourcesComparePage from '../pages/ResourcesComparePage.vue'
import RecommendationAnalysisPage from '../pages/RecommendationAnalysisPage.vue'
import ProgressPage from '../pages/ProgressPage.vue'
import AbilityMapPage from '../pages/AbilityMapPage.vue'
import AdminUsersPage from '../pages/admin/AdminUsersPage.vue'
import AdminResourcesPage from '../pages/admin/AdminResourcesPage.vue'
import AdminSystemPage from '../pages/admin/AdminSystemPage.vue'
import AssignmentPage from '../pages/AssignmentPage.vue'
import FlashcardReviewPage from '../pages/FlashcardReviewPage.vue'
import AdminAssignmentsPage from '../pages/admin/AdminAssignmentsPage.vue'
import AdminReportsPage from '../pages/admin/AdminReportsPage.vue'
import StudentReportsPage from '../pages/StudentReportsPage.vue'
import ReportPreviewPage from '../pages/ReportPreviewPage.vue'
import DiaryPage from '../pages/DiaryPage.vue'
import BadgesPage from '../pages/BadgesPage.vue'
import CourseOutlinePage from '../pages/CourseOutlinePage.vue'

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
        { path: 'resources/outline/:resourceId', component: CourseOutlinePage },
        { path: 'resources/compare', component: ResourcesComparePage },
        { path: 'recommendation-analysis', component: RecommendationAnalysisPage },
        { path: 'progress', component: ProgressPage },
        { path: 'ability-map', component: AbilityMapPage },
        { path: 'assignments', component: AssignmentPage },
        { path: 'flashcards', component: FlashcardReviewPage },
        { path: 'diary', component: DiaryPage },
        { path: 'badges', component: BadgesPage },
        { path: 'my-reports', component: StudentReportsPage },
        { path: 'admin/users', component: AdminUsersPage },
        { path: 'admin/resources', component: AdminResourcesPage },
        { path: 'admin/system', component: AdminSystemPage },
        { path: 'admin/assignments', component: AdminAssignmentsPage },
        { path: 'admin/reports', component: AdminReportsPage },
      ],
    },
    { path: '/report-preview/:reportId', component: ReportPreviewPage },
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
