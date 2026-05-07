// API Routes
export const API_ROUTES = {
  // Projects
  PROJECTS: '/api/projects',
  PROJECT: '/api/projects/:id',
  
  // Tasks
  TASKS: '/api/tasks',
  TASK: '/api/tasks/:id',
  TASK_START: '/api/tasks/:id/start',
  TASK_STOP: '/api/tasks/:id/stop',
  TASK_PAUSE: '/api/tasks/:id/pause',
  TASK_RESUME: '/api/tasks/:id/resume',
  
  // Proxy Pools
  PROXY_POOLS: '/api/proxy-pools',
  PROXY_POOL: '/api/proxy-pools/:id',
  PROXY_VERIFY: '/api/proxy-pools/:id/verify',
  PROXY_LIST: '/api/proxy-pools/:id/proxies',
  PROXY_DELETE: '/api/proxy-pools/:id/proxies/:proxyId',
  
  // Executions & Analytics
  EXECUTIONS: '/api/executions',
  EXECUTION_LOGS: '/api/executions/:id/logs',
  ANALYTICS_STATS: '/api/analytics/stats',
  ANALYTICS_REPORT: '/api/analytics/report',
}

// Default Task Config
export const DEFAULT_TASK_CONFIG = {
  delayRange: [2000, 5000] as [number, number],
  userAgentStrategy: 'rotate' as const,
  useHeadless: true,
  screenSize: '1920x1080',
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
  acceptCookie: true,
  scrollBehavior: true,
  jsExecution: true,
}

// User Agents
export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
]

// Schedule Types
export const SCHEDULE_TYPES = {
  ONCE: 'once',
  DAILY: 'daily',
  WEEKLY: 'weekly',
}

// Task Status
export const TASK_STATUS = {
  DRAFT: 'draft',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
}

// Execution Status
export const EXECUTION_STATUS = {
  RUNNING: 'running',
  COMPLETED: 'completed',
  STOPPED: 'stopped',
  FAILED: 'failed',
}

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
}

// IPC Channels
export const IPC_CHANNELS = {
  // Task execution
  TASK_START: 'task:start',
  TASK_STOP: 'task:stop',
  TASK_STATUS_UPDATE: 'task:status-update',
  
  // Progress updates
  EXECUTION_PROGRESS: 'execution:progress',
  EXECUTION_LOG: 'execution:log',
  
  // Notifications
  NOTIFICATION: 'notification',
}
