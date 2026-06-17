import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '../../types'
import { authApi } from '../../api/client'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const data = await authApi.login(email, password)
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          const user = await authApi.me()
          set({ user, isAuthenticated: true, isLoading: false })
        } catch (e) {
          set({ isLoading: false })
          throw e
        }
      },

      logout: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, isAuthenticated: false })
        window.location.href = '/login'
      },

      loadUser: async () => {
        const token = localStorage.getItem('access_token')
        if (!token) return
        try {
          const user = await authApi.me()
          set({ user, isAuthenticated: true })
        } catch {
          localStorage.clear()
          set({ user: null, isAuthenticated: false })
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    }
  )
)
