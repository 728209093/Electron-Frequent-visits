import 'dotenv/config'

export interface Project {
  id: string
  name: string
  description?: string
  createdAt: number
  updatedAt: number
}



export interface Task {
  id: string
  projectId: string
  name: string
  targetUrl: string
  status: 'draft' | 'running' | 'paused' | 'completed' | 'failed'
  proxyPoolId?: string
  concurrency: number
  totalCount: number
  completeCount: number
  scheduleType: 'once' | 'daily' | 'weekly'
  scheduleTime?: string
  config: TaskConfig
  createdAt: number
  updatedAt: number
}

export interface TaskConfig {
  delayRange: [number, number]
  userAgentStrategy: 'random' | 'rotate'
  useHeadless: boolean
  screenSize: string
  language: string
  timezone: string
  acceptCookie: boolean
  scrollBehavior: boolean
  jsExecution: boolean
}

export interface ProxyPool {
  id: string
  name: string
  description?: string
  proxyCount: number
  lastVerifyTime?: number
  createdAt: number
  updatedAt: number
}

export interface Proxy {
  id: string
  poolId: string
  protocol: 'http' | 'https' | 'socks5'
  host: string
  port: number
  username?: string
  password?: string
  isActive: boolean
  lastCheckTime?: number
  failureCount: number
  createdAt: number
}

export interface TaskExecution {
  id: string
  taskId: string
  startTime: number
  endTime?: number
  status: 'running' | 'completed' | 'stopped' | 'failed'
  totalRequests: number
  successCount: number
  failureCount: number
  averageResponseTime?: number
  createdAt: number
}

export interface ExecutionLog {
  id: string
  executionId: string
  timestamp: number
  ipUsed?: string
  statusCode?: number
  responseTime?: number
  success: boolean
  errorMsg?: string
  createdAt: number
}

// API Response types
export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
