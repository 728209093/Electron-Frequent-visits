import puppeteer, { Browser, Page } from 'puppeteer'
import { TaskConfig, Proxy } from '../../shared/types'
import { USER_AGENTS } from '../../shared/constants'
import { BehaviorSimulator } from './BehaviorSimulator'

/**
 * 浏览器服务
 * 管理 Puppeteer 浏览器实例，支持代理配置和行为模拟
 */
export class BrowserService {
  private browser: Browser | null = null
  private config: TaskConfig
  private proxy: Proxy | null = null

  constructor(config: TaskConfig, proxy?: Proxy) {
    this.config = config
    this.proxy = proxy || null
  }

  /**
   * 启动浏览器
   */
  async launch(): Promise<Browser> {
    const args = this.buildBrowserArgs()

    // 如果配置了代理
    if (this.proxy) {
      const proxyUrl = this.buildProxyUrl()
      args.push(`--proxy-server=${proxyUrl}`)
    }

    // 尝试查找系统安装的 Chrome
    const possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      (process.env.LOCALAPPDATA || '') + '\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      // macOS
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      // Linux
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
    ]
    
    let executablePath: string | undefined
    const fs = await import('fs')
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        executablePath = p
        console.log(`[Browser] Using browser: ${p}`)
        break
      }
    }

    this.browser = await puppeteer.launch({
      headless: this.config.useHeadless ? 'new' : false,
      executablePath,
      args: args,
      ignoreDefaultArgs: ['--enable-automation'],
    })
    return this.browser
  }

  /**
   * 构建浏览器启动参数
   */
  private buildBrowserArgs(): string[] {
    const [width, height] = this.config.screenSize.split('x').map(Number)

    const args = [
      `--window-size=${width},${height}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--allow-running-insecure-content',
      '--disable-blink-features=AutomationControlled',
    ]

    return args
  }

  /**
   * 构建代理 URL
   */
  private buildProxyUrl(): string {
    if (!this.proxy) return ''

    const { protocol, host, port } = this.proxy
    return `${protocol}://${host}:${port}`
  }

  /**
   * 创建新页面并配置
   */
  async newPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not launched')
    }

    const page = await this.browser.newPage()

    // 配置页面
    await this.configurePage(page)

    return page
  }

  /**
   * 配置页面（User-Agent、语言、时区等）
   */
  private async configurePage(page: Page): Promise<void> {
    // 设置 User-Agent
    const userAgent = this.selectUserAgent()
    await page.setUserAgent(userAgent)

    // 设置视口
    const [width, height] = this.config.screenSize.split('x').map(Number)
    await page.setViewport({ width, height })

    // 设置语言和时区
    await page.evaluateOnNewDocument((language, timezone) => {
      // 覆盖 navigator.language
      Object.defineProperty(navigator, 'language', {
        get: () => language,
      })

      // 覆盖 Intl.DateTimeFormat 时区
      const originalDateTimeFormat = Intl.DateTimeFormat
      // @ts-ignore
      Intl.DateTimeFormat = function (locale?: string | string[], options?: Intl.DateTimeFormatOptions) {
        if (options) {
          options.timeZone = timezone
        } else {
          options = { timeZone: timezone }
        }
        return new originalDateTimeFormat(locale, options)
      }

      // 覆盖 Date.prototype.getTimezoneOffset
      const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset
      Date.prototype.getTimezoneOffset = function () {
        const timezoneOffset: { [key: string]: number } = {
          'Asia/Shanghai': -480,
          'America/New_York': 300,
          'Europe/London': 0,
          'Asia/Tokyo': -540,
        }
        return timezoneOffset[timezone] || originalGetTimezoneOffset.call(this)
      }
    }, this.config.language, this.config.timezone)

    // 设置请求拦截（可选：屏蔽图片、广告等）
    await page.setRequestInterception(true)
    page.on('request', (request) => {
      // 允许所有请求
      request.continue()
    })

    // 处理 Cookie 弹窗
    if (this.config.acceptCookie) {
      await this.setupCookieHandler(page)
    }

    // 注入反检测脚本
    await this.injectStealthScripts(page)
  }

  /**
   * 选择 User-Agent
   */
  private selectUserAgent(): string {
    const agents = USER_AGENTS
    
    if (this.config.userAgentStrategy === 'random') {
      return agents[Math.floor(Math.random() * agents.length)]
    } else {
      // rotate 策略：轮换选择
      const index = Math.floor(Date.now() / 1000) % agents.length
      return agents[index]
    }
  }

  /**
   * 设置 Cookie 处理器
   */
  private async setupCookieHandler(page: Page): Promise<void> {
    // 常见的 Cookie 同意按钮选择器
    const cookieSelectors = [
      '#accept-cookies',
      '.cookie-accept',
      '.cookie-consent-accept',
      'button[data-cookie-accept]',
      'button[id*="cookie"]',
      'button[class*="cookie"]',
      'a[class*="cookie"]',
      '#cookie-accept',
      '#cookies-accept',
      '.cc-accept',
      '.cc-dismiss',
      '[data-testid="cookie-accept"]',
      '[aria-label*="cookie"]',
      '[aria-label*="Accept"]',
    ]

    page.on('load', async () => {
      try {
        for (const selector of cookieSelectors) {
          const element = await page.$(selector)
          if (element) {
            const isVisible = await element.isIntersectingViewport().catch(() => false)
            if (isVisible) {
              await element.click().catch(() => {})
              console.log(`[Browser] Clicked cookie consent: ${selector}`)
              break
            }
          }
        }
      } catch (error) {
        // 忽略错误
      }
    })
  }

  /**
   * 注入反检测脚本
   */
  private async injectStealthScripts(page: Page): Promise<void> {
    await page.evaluateOnNewDocument(() => {
      // 覆盖 webdriver 属性
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      })

      // 覆盖 plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' },
        ],
      })

      // 覆盖 languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['zh-CN', 'zh', 'en-US', 'en'],
      })

      // 覆盖 platform
      Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32',
      })

      // 覆盖 hardwareConcurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8,
      })

      // 覆盖 deviceMemory
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
      })

      // 隐藏自动化特征
      // @ts-ignore
      window.chrome = {
        runtime: {},
      }

      // 覆盖 permissions
      const originalQuery = window.navigator.permissions.query
      // @ts-ignore
      window.navigator.permissions.query = (parameters: any) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: (window as any).Notification.permission } as PermissionStatus)
          : originalQuery(parameters)

      // 覆盖 iframe contentWindow
      const originalContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow')
      Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
        get: function () {
          // @ts-ignore
          const iframe = originalContentWindow?.get?.call(this)
          if (iframe) {
            try {
              Object.defineProperty(iframe.navigator, 'webdriver', {
                get: () => undefined,
              })
            } catch (e) {
              // 忽略跨域错误
            }
          }
          return iframe
        },
      })
    })
  }

  /**
   * 访问 URL 并执行行为模拟
   */
  async visit(url: string): Promise<{ success: boolean; responseTime: number; error?: string }> {
    const startTime = Date.now()
    let page: Page | null = null

    try {
      page = await this.newPage()

      // 自动添加协议
      let targetUrl = url
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl
      }

      // 访问目标 URL
      const response = await page.goto(targetUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      })

      if (!response) {
        throw new Error('No response received')
      }

      // 检查响应状态
      const status = response.status()
      if (status >= 400) {
        throw new Error(`HTTP Error: ${status}`)
      }

      // 等待页面加载完成
      await page.waitForSelector('body').catch(() => {})

      // 执行行为模拟
      if (this.config.behavior) {
        const simulator = new BehaviorSimulator(page, this.config.behavior)
        await simulator.simulate()
      }

      const responseTime = Date.now() - startTime

      return { success: true, responseTime }
    } catch (error: any) {
      const responseTime = Date.now() - startTime
      return { success: false, responseTime, error: error.message }
    } finally {
      if (page) {
        await page.close().catch(() => {})
      }
    }
  }

  /**
   * 关闭浏览器
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  /**
   * 获取浏览器实例
   */
  getBrowser(): Browser | null {
    return this.browser
  }

  /**
   * 检查浏览器是否运行
   */
  isRunning(): boolean {
    return this.browser !== null && this.browser.isConnected()
  }
}
