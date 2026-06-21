import { computed, reactive } from 'vue'

const state = reactive({
  token: localStorage.getItem('token') || '',
  user: (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  })(),
})

function setAuth({ token, user }) {
  state.token = token
  state.user = user
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
}

function clearAuth() {
  state.token = ''
  state.user = null
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export function useAuth() {
  return {
    state,
    isAuthed: computed(() => Boolean(state.token)),
    isAdmin: computed(() => state.user?.role === 'admin'),
    setAuth,
    clearAuth,
  }
}
