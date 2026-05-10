import fs from 'fs'
import path from 'path'
import puppeteer, { Browser, Page } from 'puppeteer'
import { app } from 'electron'
import { Proxy, TaskConfig } from '../../shared/types'
import { USER_AGENTS, buildNavigableUrl, mergeTaskConfig } from '../../shared/constants'
import { loadBrowserSettings } from '../backend/routes/settings'
import { BehaviorSimulator } from './BehaviorSimulator'

export interface BrowserServiceOptions {
  headless?: boolean
  onLog?: (message: string, type: 'info' | 'success' | 'error' | 'action') => void
}

interface ResolvedLaunchConfig {
  executablePath?: string
  userDataDir?: string
  profileDirectory?: string
  cleanupUserDataDir?: boolean
}

export class BrowserService {
  private browser: Browser | null = null
  private readonly config: TaskConfig
  private readonly proxy: Proxy | null
  private readonly options: BrowserServiceOptions
  private tempUserDataDir: string | null = null

  constructor(config: TaskConfig, proxy?: Proxy, options: BrowserServiceOptions = {}) {
    this.config = mergeTaskConfig(config)
    this.proxy = proxy || null
    this.options = options
  }

  async launch(): Promise<Browser> {
    const launchConfig = await this.resolveLaunchConfig()
    const args = this.buildBrowserArgs(launchConfig.profileDirectory)
    this.tempUserDataDir = launchConfig.cleanupUserDataDir ? launchConfig.userDataDir || null : null

    if (this.proxy) {
      const proxyUrl = this.buildProxyUrl()
      args.push(`--proxy-server=${proxyUrl}`)
      this.log(`使用代理: ${proxyUrl}`, 'info')
    }

    if (launchConfig.userDataDir) {
      args.push('--enable-extensions')
      this.log(`使用浏览器用户目录: ${launchConfig.userDataDir}`, 'info')
      if (launchConfig.profileDirectory) {
        this.log(`使用浏览器用户配置: ${launchConfig.profileDirectory}`, 'info')
      }
    }

    this.browser = await puppeteer.launch({
      headless: (this.options.headless ?? this.config.useHeadless) ? 'new' : false,
      executablePath: launchConfig.executablePath,
      userDataDir: launchConfig.userDataDir,
      args,
      ignoreDefaultArgs: launchConfig.userDataDir
        ? [
            '--enable-automation',
            '--disable-extensions',
            '--disable-component-extensions-with-background-pages',
          ]
        : ['--enable-automation'],
    })

    this.log('浏览器已启动', 'success')
    return this.browser
  }

  async newPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not launched')
    }

    const existingPages = await this.browser.pages()
    const reusablePage = existingPages.find((item) => {
      const currentUrl = item.url()
      return currentUrl === 'about:blank'
    })

    const page = reusablePage || await this.browser.newPage()
    await this.configurePage(page)
    await page.bringToFront().catch(() => undefined)
    return page
  }

  async visit(url: string): Promise<{ success: boolean; responseTime: number; error?: string }> {
    const startTime = Date.now()
    let page: Page | null = null

    try {
      page = await this.newPage()
      this.log('页面已创建', 'info')

      const targetUrl = buildNavigableUrl(url)
      if (!targetUrl) {
        throw new Error('目标 URL 为空')
      }

      await page.bringToFront().catch(() => undefined)
      this.log(`正在访问: ${targetUrl}`, 'action')

      const response = await page.goto(targetUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      })

      await page.bringToFront().catch(() => undefined)
      await this.applyViewport(page, 'after-navigation')

      if (!response) {
        throw new Error('页面未返回响应')
      }

      const status = response.status()
      if (status >= 400) {
        throw new Error(`HTTP 错误: ${status}`)
      }

      await page.waitForSelector('body').catch(() => undefined)

      if (this.config.behavior) {
        this.log('开始执行行为模拟', 'info')
        const simulator = new BehaviorSimulator(page, this.config.behavior, this.options.onLog)
        await simulator.simulate()
        this.log('行为模拟完成', 'success')
      }

      return {
        success: true,
        responseTime: Date.now() - startTime,
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error)
      this.log(`访问失败: ${errorMessage}`, 'error')
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: errorMessage,
      }
    } finally {
      if (page) {
        await page.close().catch(() => undefined)
      }
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.log('浏览器已关闭', 'info')
    }

    if (this.tempUserDataDir && fs.existsSync(this.tempUserDataDir)) {
      fs.rmSync(this.tempUserDataDir, { recursive: true, force: true })
      this.log(`已清理临时用户目录: ${this.tempUserDataDir}`, 'info')
      this.tempUserDataDir = null
    }
  }

  getBrowser(): Browser | null {
    return this.browser
  }

  isRunning(): boolean {
    return this.browser !== null && this.browser.isConnected()
  }

  private buildBrowserArgs(profileDirectory?: string): string[] {
    const [width, height] = this.config.screenSize.split('x').map(Number)
    const args = [
      `--window-size=${width},${height}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-features=IsolateOrigins,site-per-process',
      '--allow-running-insecure-content',
      '--disable-blink-features=AutomationControlled',
    ]

    if (profileDirectory) {
      args.push(`--profile-directory=${profileDirectory}`)
    }

    return args
  }

  private buildProxyUrl(): string {
    if (!this.proxy) {
      return ''
    }

    return `${this.proxy.protocol}://${this.proxy.host}:${this.proxy.port}`
  }

  private async resolveLaunchConfig(): Promise<ResolvedLaunchConfig> {
    const executablePath = await this.resolveExecutablePath()
    const settings = loadBrowserSettings()
    const profileConfig = this.resolveUserProfile(settings?.profileDir, settings?.executablePath || executablePath)
    const runtimeProfile = profileConfig.userDataDir
      ? this.prepareRuntimeProfile(profileConfig.userDataDir, profileConfig.profileDirectory)
      : null

    return {
      executablePath: settings?.executablePath && fs.existsSync(settings.executablePath)
        ? settings.executablePath
        : executablePath,
      userDataDir: runtimeProfile?.userDataDir || profileConfig.userDataDir,
      profileDirectory: runtimeProfile?.profileDirectory || profileConfig.profileDirectory,
      cleanupUserDataDir: Boolean(runtimeProfile?.cleanupUserDataDir),
    }
  }

  private prepareRuntimeProfile(
    sourceUserDataDir: string,
    profileDirectory?: string
  ): { userDataDir: string; profileDirectory?: string; cleanupUserDataDir: boolean } | null {
    if (!fs.existsSync(sourceUserDataDir)) {
      return null
    }

    const tempRoot = path.join(app.getPath('userData'), 'runtime-browser-profiles')
    fs.mkdirSync(tempRoot, { recursive: true })

    const runtimeUserDataDir = path.join(
      tempRoot,
      `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    )

    this.log(`复制浏览器用户目录到临时环境: ${runtimeUserDataDir}`, 'info')
    this.copyDirectorySafely(sourceUserDataDir, runtimeUserDataDir, sourceUserDataDir)

    return {
      userDataDir: runtimeUserDataDir,
      profileDirectory,
      cleanupUserDataDir: true,
    }
  }

  private shouldCopyProfilePath(rootDir: string, sourcePath: string): boolean {
    const relativePath = path.relative(rootDir, sourcePath)
    if (!relativePath || relativePath === '.') {
      return true
    }

    const segments = relativePath.split(path.sep).map((segment) => segment.toLowerCase())
    const blockedNames = new Set([
      'cache',
      'code cache',
      'gpucache',
      'grshadercache',
      'shadercache',
      'dawncache',
      'component_crx_cache',
      'crashpad',
      'optimizationguidepredictionmodels',
      'safe browsing',
      'browsermetrics',
      'segmentation platform',
    ])
    const blockedFiles = new Set([
      'singletonlock',
      'singletoncookie',
      'singletonsocket',
      'lockfile',
      '.org.chromium.chromium',
    ])

    if (segments.some((segment) => blockedNames.has(segment))) {
      return false
    }

    const baseName = path.basename(sourcePath).toLowerCase()
    if (blockedFiles.has(baseName)) {
      return false
    }

    return true
  }

  private copyDirectorySafely(sourceDir: string, targetDir: string, rootDir: string): void {
    fs.mkdirSync(targetDir, { recursive: true })

    const entries = fs.readdirSync(sourceDir, { withFileTypes: true })
    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name)
      if (!this.shouldCopyProfilePath(rootDir, sourcePath)) {
        continue
      }

      const targetPath = path.join(targetDir, entry.name)

      try {
        if (entry.isDirectory()) {
          this.copyDirectorySafely(sourcePath, targetPath, rootDir)
          continue
        }

        if (entry.isFile()) {
          fs.mkdirSync(path.dirname(targetPath), { recursive: true })
          fs.copyFileSync(sourcePath, targetPath)
        }
      } catch (error: any) {
        if (this.isSkippableCopyError(error)) {
          this.log(`跳过被占用文件: ${sourcePath}`, 'info')
          continue
        }

        throw error
      }
    }
  }

  private isSkippableCopyError(error: NodeJS.ErrnoException): boolean {
    return error.code === 'EBUSY' || error.code === 'EPERM' || error.code === 'EACCES'
  }

  private resolveUserProfile(profileDir?: string, executablePath?: string): {
    userDataDir?: string
    profileDirectory?: string
  } {
    const normalizedProfileDir = (profileDir || '').trim()

    if (normalizedProfileDir) {
      if (!fs.existsSync(normalizedProfileDir)) {
        this.log(`配置的用户目录不存在，将忽略: ${normalizedProfileDir}`, 'error')
        return {}
      }

      const parsed = this.parseProfileDir(normalizedProfileDir)
      if (parsed.userDataDir && fs.existsSync(parsed.userDataDir)) {
        return parsed
      }
    }

    const inferredUserDataDir = this.inferDefaultUserDataDir(executablePath)
    if (!inferredUserDataDir || !fs.existsSync(inferredUserDataDir)) {
      return {}
    }

    const defaultProfileDir = path.join(inferredUserDataDir, 'Default')
    return {
      userDataDir: inferredUserDataDir,
      profileDirectory: fs.existsSync(defaultProfileDir) ? 'Default' : undefined,
    }
  }

  private parseProfileDir(profileDir: string): { userDataDir?: string; profileDirectory?: string } {
    const normalized = path.resolve(profileDir)
    const baseName = path.basename(normalized)
    const parentDir = path.dirname(normalized)

    const isConcreteProfile = /^(Default|Profile \d+|Guest Profile|System Profile)$/i.test(baseName)
    if (isConcreteProfile) {
      return {
        userDataDir: parentDir,
        profileDirectory: baseName,
      }
    }

    return {
      userDataDir: normalized,
    }
  }

  private inferDefaultUserDataDir(executablePath?: string): string | undefined {
    const localAppData = process.env.LOCALAPPDATA || ''
    const lowerPath = (executablePath || '').toLowerCase()

    if (lowerPath.includes('google\\chrome')) {
      return path.join(localAppData, 'Google', 'Chrome', 'User Data')
    }

    if (lowerPath.includes('microsoft\\edge')) {
      return path.join(localAppData, 'Microsoft', 'Edge', 'User Data')
    }

    if (lowerPath.includes('bravesoftware\\brave-browser')) {
      return path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data')
    }

    return undefined
  }

  private async resolveExecutablePath(): Promise<string | undefined> {
    const settings = loadBrowserSettings()
    if (settings?.executablePath && fs.existsSync(settings.executablePath)) {
      this.log(`使用已配置浏览器: ${settings.executablePath}`, 'info')
      return settings.executablePath
    }

    const possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      `${process.env.LOCALAPPDATA || ''}\\Google\\Chrome\\Application\\chrome.exe`,
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
    ]

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        this.log(`使用浏览器可执行文件: ${filePath}`, 'info')
        return filePath
      }
    }

    this.log('未找到本地 Chrome/Edge，使用 Puppeteer 自带浏览器', 'info')
    return undefined
  }

  private async configurePage(page: Page): Promise<void> {
    await page.setUserAgent(this.selectUserAgent())

    await this.applyViewport(page, 'before-navigation')

    await page.evaluateOnNewDocument((language, timezone) => {
      Object.defineProperty(navigator, 'language', {
        get: () => language,
      })

      const OriginalDateTimeFormat = Intl.DateTimeFormat
      // @ts-ignore
      Intl.DateTimeFormat = function (locale?: string | string[], options?: Intl.DateTimeFormatOptions) {
        const nextOptions = {
          ...(options || {}),
          timeZone: timezone,
        }
        return new OriginalDateTimeFormat(locale, nextOptions)
      }

      const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset
      Date.prototype.getTimezoneOffset = function () {
        const timezoneOffset: Record<string, number> = {
          'Asia/Shanghai': -480,
          'America/New_York': 300,
          'Europe/London': 0,
          'Asia/Tokyo': -540,
        }
        return timezoneOffset[timezone] ?? originalGetTimezoneOffset.call(this)
      }
    }, this.config.language, this.config.timezone)

    await page.setRequestInterception(true)
    page.on('request', (request) => {
      request.continue().catch(() => undefined)
    })

    if (this.config.acceptCookie) {
      await this.setupCookieHandler(page)
    }

    await this.injectStealthScripts(page)
  }

  private async applyViewport(page: Page, phase: 'before-navigation' | 'after-navigation'): Promise<void> {
    const [width, height] = this.config.screenSize.split('x').map(Number)

    try {
      await page.setViewport({ width, height })
    } catch (error: any) {
      if (error?.message?.includes('Target does not support metrics override')) {
        this.log(`当前页面暂不支持窗口尺寸设置，阶段: ${phase}`, 'info')
        return
      }

      throw error
    }
  }

  private selectUserAgent(): string {
    if (this.config.userAgentStrategy === 'random') {
      return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
    }

    const index = Math.floor(Date.now() / 1000) % USER_AGENTS.length
    return USER_AGENTS[index]
  }

  private async setupCookieHandler(page: Page): Promise<void> {
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
          if (!element) {
            continue
          }

          const isVisible = await element.isIntersectingViewport().catch(() => false)
          if (!isVisible) {
            continue
          }

          await element.click().catch(() => undefined)
          this.log(`已点击 Cookie 按钮: ${selector}`, 'action')
          break
        }
      } catch {
        // Ignore cookie handler errors.
      }
    })
  }

  private async injectStealthScripts(page: Page): Promise<void> {
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      })

      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' },
        ],
      })

      Object.defineProperty(navigator, 'languages', {
        get: () => ['zh-CN', 'zh', 'en-US', 'en'],
      })

      Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32',
      })

      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8,
      })

      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
      })

      // @ts-ignore
      window.chrome = {
        runtime: {},
      }

      const originalQuery = window.navigator.permissions.query
      // @ts-ignore
      window.navigator.permissions.query = (parameters: any) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: (window as any).Notification.permission } as PermissionStatus)
          : originalQuery(parameters)

      const originalContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow')
      Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
        get: function () {
          const iframe = originalContentWindow?.get?.call(this)
          if (iframe) {
            try {
              Object.defineProperty(iframe.navigator, 'webdriver', {
                get: () => undefined,
              })
            } catch {
              // Ignore cross-origin errors.
            }
          }
          return iframe
        },
      })
    })
  }

  private log(message: string, type: 'info' | 'success' | 'error' | 'action'): void {
    console.log(`[Browser] ${message}`)
    this.options.onLog?.(message, type)
  }
}
