import { Proxy, Task } from '../../shared/types'
import { mergeTaskConfig } from '../../shared/constants'
import { ExternalBrowserService } from './ExternalBrowserService'

export interface PreviewOptions {
  task: Task
  proxy?: Proxy
  onLog?: (message: string, type: 'info' | 'success' | 'error' | 'action') => void
  onComplete?: (success: boolean, error?: string) => void
}

export class PreviewService {
  private browserService: ExternalBrowserService | null = null
  private isRunning = false
  private logCallback?: (message: string, type: 'info' | 'success' | 'error' | 'action') => void

  async startPreview(options: PreviewOptions): Promise<void> {
    const { task, onLog, onComplete } = options
    this.logCallback = onLog
    this.isRunning = true

    this.log('启动预览模式...', 'info')

    try {
      const config = mergeTaskConfig(task.config)
      this.browserService = new ExternalBrowserService(
        {
          ...config,
          useHeadless: false,
        },
        {
          onLog: (message, type) => this.log(message, type),
        }
      )

      await this.browserService.launch()
      this.log(`开始执行任务: ${task.name}`, 'action')

      const result = await this.browserService.visit(task.targetUrl)
      if (!result.success) {
        throw new Error(result.error || '预览执行失败')
      }

      this.log(`预览完成，耗时 ${result.responseTime}ms`, 'success')
      onComplete?.(true)
    } catch (error: any) {
      const errorMessage = error?.message || String(error)
      this.log(`预览失败: ${errorMessage}`, 'error')
      onComplete?.(false, errorMessage)
    } finally {
      await this.browserService?.close().catch(() => undefined)
      this.browserService = null
      this.isRunning = false
    }
  }

  async stopPreview(): Promise<void> {
    this.isRunning = false
    await this.browserService?.close().catch(() => undefined)
    this.browserService = null
    this.log('预览已停止', 'info')
  }

  getIsRunning(): boolean {
    return this.isRunning
  }

  private log(message: string, type: 'info' | 'success' | 'error' | 'action'): void {
    console.log(`[Preview] ${message}`)
    this.logCallback?.(message, type)
  }
}

let previewServiceInstance: PreviewService | null = null

export function getPreviewService(): PreviewService {
  if (!previewServiceInstance) {
    previewServiceInstance = new PreviewService()
  }

  return previewServiceInstance
}
