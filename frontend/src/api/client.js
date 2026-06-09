import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 30000,
})

api.interceptors.response.use(
  res => res.data,
  err => {
    const msg = err.response?.data?.error || err.message || 'Request failed'
    return Promise.reject(new Error(msg))
  }
)

export default api

export const assignments = {
  list: (params) => api.get('/assignments', { params }),
  get: (id) => api.get(`/assignments/${id}`),
  create: (data) => api.post('/assignments', data),
  update: (id, data) => api.put(`/assignments/${id}`, data),
  delete: (id) => api.delete(`/assignments/${id}`),
  addSubtask: (id, data) => api.post(`/assignments/${id}/subtasks`, data),
  updateSubtask: (id, stId, data) => api.put(`/assignments/${id}/subtasks/${stId}`, data),
  deleteSubtask: (id, stId) => api.delete(`/assignments/${id}/subtasks/${stId}`),
}

export const subjects = {
  list: () => api.get('/subjects'),
  create: (data) => api.post('/subjects', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
  delete: (id) => api.delete(`/subjects/${id}`),
}

export const dashboard = {
  get: () => api.get('/dashboard'),
}

export const timer = {
  getSessions: (params) => api.get('/timer/sessions', { params }),
  createSession: (data) => api.post('/timer/sessions', data),
  log: (data) => api.post('/timer/sessions', data),
  getStats: () => api.get('/timer/stats'),
}

export const grades = {
  getCourses: () => api.get('/grades/courses'),
  createCourse: (data) => api.post('/grades/courses', data),
  updateCourse: (id, data) => api.put(`/grades/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/grades/courses/${id}`),
  getComponents: (courseId) => api.get(`/grades/courses/${courseId}/components`),
  addComponent: (courseId, data) => api.post(`/grades/courses/${courseId}/components`, data),
  updateComponent: (id, data) => api.put(`/grades/components/${id}`, data),
  deleteComponent: (id) => api.delete(`/grades/components/${id}`),
  calculate: (courseId) => api.get(`/grades/courses/${courseId}/calculate`),
}

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  export: () => api.get('/settings/export'),
  heatmap: (start, end) => api.get('/settings/heatmap', { params: { start, end } }),
}

export const ai = {
  studyPlan: () => api.post('/ai/study-plan'),
  parseAssignment: (input) => api.post('/ai/parse-assignment', { input }),
  parseNL: (input, subjects) => api.post('/ai/parse-assignment', { input, subjects }),
  assignmentInsights: (id) => api.post(`/ai/assignment-insights/${id}`),
  weeklyDebrief: () => api.get('/ai/weekly-debrief'),
  parseSyllabus: (text) => api.post('/ai/parse-syllabus', { text }),
  redistribute: () => api.post('/ai/redistribute'),
}

export const analytics = {
  velocity: () => api.get('/analytics/velocity'),
  subjects: () => api.get('/analytics/subjects'),
  getDependencies: (assignmentId) => api.get(`/analytics/dependencies/${assignmentId}`),
  addDependency: (assignment_id, depends_on_id) => api.post('/analytics/dependencies', { assignment_id, depends_on_id }),
  removeDependency: (id) => api.delete(`/analytics/dependencies/${id}`),
}
