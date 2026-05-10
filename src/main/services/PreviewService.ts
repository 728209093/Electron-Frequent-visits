import { screen, shell } from 'electron'
import { Task, Proxy } from '../../shared/types'
import { BehaviorSimulator } from './BehaviorSimulator'
import { loadBrowserSettings } from '../backend/routes/settings'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { spawn, ChildProcess } from 'child_process'
import { chromium, BrowserContext, Page } from 'playwright'

export interface PreviewOptions {
  task: Task
  proxy?: Proxy
  onLog?: (message: string, type: 'info' | 'success' | 'error' | 'action') => void
  onComplete?: (success: boolean, error?: string) => void
}

export class PreviewService {
  private chromeProcess: ChildProcess | null = null
  private browser: BrowserContext | null = null
  private page: Page | null = null
  private isRunning: boolean = false
  private logCallback?: (message: string, type: 'info' | 'success' | 'error' | 'action') => void
  private cdpPort = 9222

  async startPreview(options: PreviewOptions): Promise<void> {
    const { task, proxy, onLog, onComplete } = options
    this.logCallback = onLog
    this.isRunning = true

    this.log('🚀 启动预览模式...', 'info')

    try {
      const config = task.config || {}

      // 目标 URL
      let targetUrl = task.targetUrl || ''
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl
      }

      this.log(`🔗 目标网址: ${targetUrl}`, 'action')

      // ── 方案：shell.openExternal 用系统默认浏览器打开 ──
      // 完全不干预浏览器，油猴等扩展正常运行
      this.log('🌐 使用系统默认浏览器打开网址...', 'info')
      this.log('💡 油猴脚本将在默认浏览器中自动运行', 'info')

      await shell.openExternal(targetUrl)

      this.log('✅ 浏览器已打开', 'success')
      this.log('⏳ 等待页面加载和油猴脚本执行...', 'info')

      // 等待用户观察（根据任务配置的停留时间）
      const behavior = config.behavior
      const [minStay, maxStay] = behavior?.stayDuration || [10000, 30000]
      const stayDuration = Math.floor(Math.random() * (maxStay - minStay + 1)) + minStay

      this.log(`⏱️ 模拟停留 ${(stayDuration / 1000).toFixed(0)} 秒...`, 'info')

      // 倒计时显示
      const interval = 5000
      let remaining = stayDuration
      while (remaining > 0 && this.isRunning) {
        await this.delay(Math.min(interval, remaining))
        remaining -= interval
        if (remaining > 0 && this.isRunning) {
          this.log(`⏳ 还剩 ${Math.ceil(remaining / 1000)} 秒...`, 'info')
        }
      }

      this.log('🎉 预览完成！', 'success')
      onComplete?.(true)

    } catch (error: any) {
      this.log(`❌ 执行失败: ${error.message}`, 'error')
      onComplete?.(false, error.message)
    } finally {
      this.isRunning = false
    }
  }

  async stopPreview(): Promise<void> {
    this.isRunning = false
    this.log('⏹️ 预览已停止', 'info')
  }

  getIsRunning(): boolean {
    return this.isRunning
  }

  private log(message: string, type: 'info' | 'success' | 'error' | 'action'): void {
    console.log(`[Preview] ${message}`)
    this.logCallback?.(message, type)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

let previewServiceInstance: PreviewService | null = null

export function getPreviewService(): PreviewService {
  if (!previewServiceInstance) {
    previewServiceInstance = new PreviewService()
  }
  return previewServiceInstance
}
