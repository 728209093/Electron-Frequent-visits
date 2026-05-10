import type { TaskConfig } from './types'

// API Routes
export const API_ROUTES = {
  PROJECTS: '/api/projects',
  PROJECT: '/api/projects/:id',

  TASKS: '/api/tasks',
  TASK: '/api/tasks/:id',
  TASK_START: '/api/tasks/:id/start',
  TASK_STOP: '/api/tasks/:id/stop',
  TASK_PAUSE: '/api/tasks/:id/pause',
  TASK_RESUME: '/api/tasks/:id/resume',

  PROXY_POOLS: '/api/proxy-pools',
  PROXY_POOL: '/api/proxy-pools/:id',
  PROXY_VERIFY: '/api/proxy-pools/:id/verify',
  PROXY_LIST: '/api/proxy-pools/:id/proxies',
  PROXY_DELETE: '/api/proxy-pools/:id/proxies/:proxyId',

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
  jsExecution: true,
  behavior: {
    stayDuration: [5000, 15000] as [number, number],
    scroll: {
      enabled: true,
      direction: 'both' as const,
      scrollCount: [3, 8] as [number, number],
      scrollDistance: [200, 500] as [number, number],
      scrollInterval: [500, 1500] as [number, number],
      pauseAtBottom: true,
      bottomPauseDuration: [2000, 5000] as [number, number],
    },
    click: {
      enabled: false,
      selectors: [] as string[],
      clickProbability: 0.3,
      maxClicks: 3,
      moveBeforeClick: true,
    },
    mouseMove: {
      enabled: true,
      movePoints: [10, 25] as [number, number],
      moveSpeed: [10, 30] as [number, number],
      randomCurve: true,
    },
    input: {
      enabled: false,
      selectors: [] as string[],
      presetTexts: [] as string[],
      typingSpeed: [50, 150] as [number, number],
      inputProbability: 0.5,
    },
    popup: {
      enabled: true,
      rules: [] as any[],
      waitTimeout: 5000,
      afterClickDelay: [500, 1500] as [number, number],
    },
    randomOrder: true,
  },
}

export function mergeTaskConfig(config?: Partial<TaskConfig> | null): TaskConfig {
  const behavior = config?.behavior || {}

  return {
    ...DEFAULT_TASK_CONFIG,
    ...config,
    delayRange: config?.delayRange ?? DEFAULT_TASK_CONFIG.delayRange,
    behavior: {
      ...DEFAULT_TASK_CONFIG.behavior,
      ...behavior,
      stayDuration: behavior.stayDuration ?? DEFAULT_TASK_CONFIG.behavior.stayDuration,
      scroll: {
        ...DEFAULT_TASK_CONFIG.behavior.scroll,
        ...(behavior.scroll || {}),
        scrollCount: behavior.scroll?.scrollCount ?? DEFAULT_TASK_CONFIG.behavior.scroll.scrollCount,
        scrollDistance: behavior.scroll?.scrollDistance ?? DEFAULT_TASK_CONFIG.behavior.scroll.scrollDistance,
        scrollInterval: behavior.scroll?.scrollInterval ?? DEFAULT_TASK_CONFIG.behavior.scroll.scrollInterval,
        bottomPauseDuration:
          behavior.scroll?.bottomPauseDuration ?? DEFAULT_TASK_CONFIG.behavior.scroll.bottomPauseDuration,
      },
      click: {
        ...DEFAULT_TASK_CONFIG.behavior.click,
        ...(behavior.click || {}),
        selectors: behavior.click?.selectors ?? DEFAULT_TASK_CONFIG.behavior.click.selectors,
      },
      mouseMove: {
        ...DEFAULT_TASK_CONFIG.behavior.mouseMove,
        ...(behavior.mouseMove || {}),
        movePoints: behavior.mouseMove?.movePoints ?? DEFAULT_TASK_CONFIG.behavior.mouseMove.movePoints,
        moveSpeed: behavior.mouseMove?.moveSpeed ?? DEFAULT_TASK_CONFIG.behavior.mouseMove.moveSpeed,
      },
      input: {
        ...DEFAULT_TASK_CONFIG.behavior.input,
        ...(behavior.input || {}),
        selectors: behavior.input?.selectors ?? DEFAULT_TASK_CONFIG.behavior.input.selectors,
        presetTexts: behavior.input?.presetTexts ?? DEFAULT_TASK_CONFIG.behavior.input.presetTexts,
        typingSpeed: behavior.input?.typingSpeed ?? DEFAULT_TASK_CONFIG.behavior.input.typingSpeed,
      },
      popup: {
        ...DEFAULT_TASK_CONFIG.behavior.popup,
        ...(behavior.popup || {}),
        rules: behavior.popup?.rules ?? DEFAULT_TASK_CONFIG.behavior.popup.rules,
        afterClickDelay:
          behavior.popup?.afterClickDelay ?? DEFAULT_TASK_CONFIG.behavior.popup.afterClickDelay,
      },
    },
  }
}

export function sanitizeTargetUrl(url?: string | null): string {
  return (url || '').trim()
}

export function buildNavigableUrl(url?: string | null): string {
  const trimmed = sanitizeTargetUrl(url)
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

// Common popup presets
export const POPUP_PRESETS = {
  AGE_VERIFICATION: {
    name: '年龄验证',
    containerSelector: undefined,
    buttonSelectors: [
      '.answer-btn-yes-inline',
      '.answer-btn-yes',
      'button.answer-btn-yes-inline',
      'button[class*="yes"]',
      'button[class*="confirm"]',
      'button[class*="agree"]',
    ],
    buttonTexts: ['是', '确认', '我已满18岁', '我已满21岁', '我已满24岁', 'Yes', 'I am over 18', 'Enter', '进入'],
    required: false,
    priority: 1,
  },
  COOKIE_CONSENT: {
    name: 'Cookie 同意',
    containerSelector: undefined,
    buttonSelectors: [
      '#accept-cookies',
      '.cookie-accept',
      '.cookie-consent-accept',
      'button[data-cookie-accept]',
      '[class*="cookie"] button',
      '.cc-accept',
      '.cc-dismiss',
    ],
    buttonTexts: ['接受', '同意', '我同意', 'Accept', 'Accept All', 'I Agree', 'Got it', '知道了'],
    required: false,
    priority: 2,
  },
  SUBSCRIPTION_POPUP: {
    name: '订阅弹窗',
    containerSelector: undefined,
    buttonSelectors: [
      '.modal-close',
      '.popup-close',
      '[class*="close"]',
      'button[aria-label="Close"]',
      '.dismiss',
    ],
    buttonTexts: ['关闭', '不了', '以后再说', 'Close', 'No thanks', 'Maybe later', '×'],
    required: false,
    priority: 3,
  },
  AD_POPUP: {
    name: '广告弹窗',
    containerSelector: undefined,
    buttonSelectors: [
      '.ad-close',
      '[class*="ad"] .close',
      '[id*="ad"] .close',
      '.skip-ad',
      '[class*="skip"]',
    ],
    buttonTexts: ['跳过', '关闭广告', 'Skip', 'Close', '×'],
    required: false,
    priority: 4,
  },
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

export const SCHEDULE_TYPES = {
  ONCE: 'once',
  DAILY: 'daily',
  WEEKLY: 'weekly',
}

export const TASK_STATUS = {
  DRAFT: 'draft',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
}

export const EXECUTION_STATUS = {
  RUNNING: 'running',
  COMPLETED: 'completed',
  STOPPED: 'stopped',
  FAILED: 'failed',
}

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
}

export const IPC_CHANNELS = {
  TASK_START: 'task:start',
  TASK_STOP: 'task:stop',
  TASK_STATUS_UPDATE: 'task:status-update',
  EXECUTION_PROGRESS: 'execution:progress',
  EXECUTION_LOG: 'execution:log',
  NOTIFICATION: 'notification',
}
