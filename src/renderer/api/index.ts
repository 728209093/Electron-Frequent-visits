import axios, { AxiosInstance } from 'axios'
import { ApiResponse, PaginatedResponse } from '@shared/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if exists
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
api.interceptors.response.use(
  (response) => response.data.data || response.data,
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export const apiClient = api

// Project APIs
export const projectAPI = {
  getAll: () => api.get<ApiResponse>('/api/projects'),
  list: () => api.get<ApiResponse>('/api/projects'),
  get: (id: string) => api.get<ApiResponse>(`/api/projects/${id}`),
  create: (data: any) => api.post<ApiResponse>('/api/projects', data),
  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/api/projects/${id}`, data),
  delete: (id: string) => api.delete<ApiResponse>(`/api/projects/${id}`),
}

// Task APIs
export const taskAPI = {
  getAll: () => api.get<ApiResponse>('/api/tasks'),
  list: (projectId?: string) =>
    api.get<ApiResponse>('/api/tasks', { params: { projectId } }),
  get: (id: string) => api.get<ApiResponse>(`/api/tasks/${id}`),
  create: (data: any) => api.post<ApiResponse>('/api/tasks', data),
  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/api/tasks/${id}`, data),
  delete: (id: string) => api.delete<ApiResponse>(`/api/tasks/${id}`),
  start: (id: string) => api.post<ApiResponse>(`/api/tasks/${id}/start`),
  stop: (id: string) => api.post<ApiResponse>(`/api/tasks/${id}/stop`),
  pause: (id: string) => api.post<ApiResponse>(`/api/tasks/${id}/pause`),
  resume: (id: string) => api.post<ApiResponse>(`/api/tasks/${id}/resume`),
}

// Proxy Pool APIs
export const proxyAPI = {
  // Pools
  getPools: () => api.get<ApiResponse>('/api/proxy-pools'),
  list: () => api.get<ApiResponse>('/api/proxy-pools'),
  get: (id: string) => api.get<ApiResponse>(`/api/proxy-pools/${id}`),
  createPool: (data: any) => api.post<ApiResponse>('/api/proxy-pools', data),
  updatePool: (id: string, data: any) =>
    api.put<ApiResponse>(`/api/proxy-pools/${id}`, data),
  deletePool: (id: string) => api.delete<ApiResponse>(`/api/proxy-pools/${id}`),
  
  // Proxies in a pool
  getProxiesByPool: (poolId: string) =>
    api.get<ApiResponse>(`/api/proxy-pools/${poolId}/proxies`),
  addProxy: (poolId: string, data: any) =>
    api.post<ApiResponse>(`/api/proxy-pools/${poolId}/proxies`, data),
  updateProxy: (proxyId: string, data: any) =>
    api.put<ApiResponse>(`/api/proxies/${proxyId}`, data),
  deleteProxy: (proxyId: string) =>
    api.delete<ApiResponse>(`/api/proxies/${proxyId}`),
  verifyProxy: (proxyId: string) =>
    api.post<ApiResponse>(`/api/proxies/${proxyId}/verify`),
  
  // Legacy methods for backwards compatibility
  create: (data: any) => api.post<ApiResponse>('/api/proxy-pools', data),
  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/api/proxy-pools/${id}`, data),
  delete: (id: string) => api.delete<ApiResponse>(`/api/proxy-pools/${id}`),
  addProxies: (id: string, proxies: any[]) =>
    api.post<ApiResponse>(`/api/proxy-pools/${id}/proxies`, { proxies }),
  deleteProxyOld: (poolId: string, proxyId: string) =>
    api.delete<ApiResponse>(`/api/proxy-pools/${poolId}/proxies/${proxyId}`),
  verify: (id: string) =>
    api.post<ApiResponse>(`/api/proxy-pools/${id}/verify`),
}

// Analytics APIs
export const analyticsAPI = {
  getExecutionHistory: (limit?: number, offset?: number) =>
    api.get<ApiResponse>('/api/analytics/executions', {
      params: { limit, offset },
    }),
  getExecutionLogs: (executionId: string, limit?: number, offset?: number) =>
    api.get<ApiResponse>(`/api/executions/${executionId}/logs`, {
      params: { limit, offset },
    }),
  getStatistics: (projectId?: string, days?: number) =>
    api.get<ApiResponse>('/api/analytics/stats', {
      params: { projectId, days },
    }),
  generateReport: (taskId?: string, days?: number) =>
    api.get<ApiResponse>('/api/analytics/report', {
      params: { taskId, days },
    }),
  
  // Legacy method names for backwards compatibility
  executions: (taskId?: string, limit?: number, offset?: number) =>
    api.get<ApiResponse>('/api/executions', {
      params: { taskId, limit, offset },
    }),
  executionLogs: (executionId: string, limit?: number, offset?: number) =>
    api.get<ApiResponse>(`/api/executions/${executionId}/logs`, {
      params: { limit, offset },
    }),
  stats: (projectId?: string, days?: number) =>
    api.get<ApiResponse>('/api/analytics/stats', {
      params: { projectId, days },
    }),
  report: (taskId?: string, days?: number) =>
    api.get<ApiResponse>('/api/analytics/report', {
      params: { taskId, days },
    }),
}

export default api

