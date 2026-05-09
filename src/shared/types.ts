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
  jsExecution: boolean
  
  // 行为模拟配置
  behavior: BehaviorConfig
}

export interface BehaviorConfig {
  // 页面停留时间范围（毫秒）
  stayDuration: [number, number]
  
  // 滚动配置
  scroll: ScrollConfig
  
  // 点击配置
  click: ClickConfig
  
  // 鼠标移动配置
  mouseMove: MouseMoveConfig
  
  // 输入配置（可选，用于搜索等场景）
  input: InputConfig
  
  // 是否随机执行行为
  randomOrder: boolean
}

export interface ScrollConfig {
  enabled: boolean
  // 滚动方向：down（向下）、up（向上）、both（上下都滚动）
  direction: 'down' | 'up' | 'both'
  // 滚动次数范围
  scrollCount: [number, number]
  // 每次滚动距离范围（像素）
  scrollDistance: [number, number]
  // 滚动间隔时间范围（毫秒）
  scrollInterval: [number, number]
  // 是否在页面底部暂停
  pauseAtBottom: boolean
  // 底部暂停时间范围（毫秒）
  bottomPauseDuration: [number, number]
}

export interface ClickConfig {
  enabled: boolean
  // 点击选择器列表（CSS选择器）
  selectors: string[]
  // 点击概率（0-1）
  clickProbability: number
  // 每次访问最大点击次数
  maxClicks: number
  // 点击前是否移动鼠标
  moveBeforeClick: boolean
}

export interface MouseMoveConfig {
  enabled: boolean
  // 移动轨迹点数范围
  movePoints: [number, number]
  // 移动速度范围（毫秒/点）
  moveSpeed: [number, number]
  // 是否随机弯曲轨迹
  randomCurve: boolean
}

export interface InputConfig {
  enabled: boolean
  // 输入框选择器列表
  selectors: string[]
  // 预设文本列表（随机选择）
  presetTexts: string[]
  // 输入速度范围（毫秒/字符）
  typingSpeed: [number, number]
  // 输入概率
  inputProbability: number
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
