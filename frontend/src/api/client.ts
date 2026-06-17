import axios from 'axios'

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/v1/auth/refresh', { refresh_token: refreshToken })
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          original.headers.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      } else {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  logout: () => api.post('/auth/logout'),
}

export const usersApi = {
  list: (params?: object) => api.get('/users', { params }).then(r => r.data),
  create: (data: object) => api.post('/users', data).then(r => r.data),
  update: (id: string, data: object) => api.put(`/users/${id}`, data).then(r => r.data),
  resetPassword: (id: string, new_password: string) => api.post(`/users/${id}/reset-password`, { new_password }).then(r => r.data),
  deactivate: (id: string) => api.delete(`/users/${id}`).then(r => r.data),
}

export const projectsApi = {
  list: (params?: object) => api.get('/projects', { params }).then(r => r.data),
  create: (data: object) => api.post('/projects', data).then(r => r.data),
  get: (id: string) => api.get(`/projects/${id}`).then(r => r.data),
  update: (id: string, data: object) => api.put(`/projects/${id}`, data).then(r => r.data),
  addMember: (id: string, user_id: string) => api.post(`/projects/${id}/members`, { user_id }).then(r => r.data),
  removeMember: (id: string, user_id: string) => api.delete(`/projects/${id}/members/${user_id}`).then(r => r.data),
}

export const tasksApi = {
  list: (params?: object) => api.get('/tasks', { params }).then(r => r.data),
  create: (data: object) => api.post('/tasks', data).then(r => r.data),
  get: (id: string) => api.get(`/tasks/${id}`).then(r => r.data),
  update: (id: string, data: object) => api.put(`/tasks/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/tasks/${id}`).then(r => r.data),
  getComments: (id: string) => api.get(`/tasks/${id}/comments`).then(r => r.data),
  addComment: (id: string, content: string) => api.post(`/tasks/${id}/comments`, { content }).then(r => r.data),
}

export const timeApi = {
  list: (params?: object) => api.get('/time-entries', { params }).then(r => r.data),
  create: (data: object) => api.post('/time-entries', data).then(r => r.data),
  delete: (id: string) => api.delete(`/time-entries/${id}`).then(r => r.data),
}

export const notificationsApi = {
  list: (params?: object) => api.get('/notifications', { params }).then(r => r.data),
  markRead: (id: string) => api.post(`/notifications/${id}/read`).then(r => r.data),
  markAllRead: () => api.post('/notifications/read-all').then(r => r.data),
  unreadCount: () => api.get('/notifications/unread-count').then(r => r.data),
}

export const reportsApi = {
  staffPerformance: () => api.get('/reports/staff-performance').then(r => r.data),
  projectSummary: () => api.get('/reports/project-summary').then(r => r.data),
  timeTracking: () => api.get('/reports/time-tracking').then(r => r.data),
}

export const dashboardApi = {
  stats: () => api.get('/dashboard/stats').then(r => r.data),
  recentActivity: () => api.get('/dashboard/recent-activity').then(r => r.data),
}

export const docsApi = {
  list: (params?: object) => api.get('/documents', { params }).then(r => r.data),
  upload: (file: File, project_id?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (project_id) form.append('project_id', project_id)
    return api.post('/documents', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  delete: (id: string) => api.delete(`/documents/${id}`).then(r => r.data),
}
