import { shell } from 'electron'
import { TaskConfig } from '../../shared/types'
import { buildNavigableUrl, mergeTaskConfig } from '../../shared/constants'

export interface ExternalBrowserServiceOptions {
  onLog?: (message: string, type: 'info' | 'success' | 'error' | 'action') => void
}

export class ExternalBrowserService {
  private readonly config: TaskConfig
  private readonly options: ExternalBrowserServiceOptions

  constructor(config: TaskConfig, options: ExternalBrowserServiceOptions = {}) {
    this.config = mergeTaskConfig(config)
    this.options = options
  }

  async launch(): Promise<void> {
    this.log('使用系统默认浏览器运行，可触发已安装的油猴脚本', 'info')
  }

  async visit(url: string): Promise<{ success: boolean; responseTime: number; error?: string }> {
    const startTime = Date.now()

    try {
      const targetUrl = buildNavigableUrl(url)
      if (!targetUrl) {
        throw new Error('目标 URL 为空')
      }

      this.log(`正在使用系统默认浏览器打开: ${targetUrl}`, 'action')
      await shell.openExternal(targetUrl)
      this.log('浏览器已打开，等待页面和油猴脚本执行', 'success')

      const [minStay, maxStay] = this.config.behavior?.stayDuration || [10000, 30000]
      const stayDuration = Math.floor(Math.random() * (maxStay - minStay + 1)) + minStay
      this.log(`模拟停留 ${Math.round(stayDuration / 1000)} 秒`, 'info')
      await this.delay(stayDuration)

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
    }
  }

  async close(): Promise<void> {
    this.log('外部浏览器模式无需由程序关闭浏览器', 'info')
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private log(message: string, type: 'info' | 'success' | 'error' | 'action'): void {
    console.log(`[ExternalBrowser] ${message}`)
    this.options.onLog?.(message, type)
  }
}
