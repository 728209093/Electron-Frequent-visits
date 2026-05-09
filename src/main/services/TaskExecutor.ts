import { v4 as uuidv4 } from 'uuid'
import { Database } from '../database/Database'
import { Task, Proxy } from '../../shared/types'
import { BrowserService } from './BrowserService'

export interface ExecutionProgress {
  executionId: string
  current: number
  total: number
  successCount: number
  failureCount: number
  status: 'running' | 'completed' | 'stopped' | 'failed'
}

export type ProgressCallback = (progress: ExecutionProgress) => void

export class TaskExecutor {
  private db: Database
  private runningExecutions: Map<string, boolean> = new Map()
  private progressCallbacks: Map<string, ProgressCallback[]> = new Map()

  constructor(db: Database) {
    this.db = db
  }

  /**
   * 执行任务
   */
  async executeTask(
    task: Task,
    proxies: Proxy[],
    onProgress?: ProgressCallback
  ): Promise<string> {
    const executionId = await this.createExecution(task.id)
    this.runningExecutions.set(executionId, true)

    if (onProgress) {
      this.addProgressCallback(executionId, onProgress)
    }

    // 异步执行任务
    this.runExecution(executionId, task, proxies).catch((error) => {
      console.error(`[TaskExecutor] Execution ${executionId} failed:`, error)
    })

    return executionId
  }

  /**
   * 停止执行
   */
  async stopExecution(executionId: string): Promise<void> {
    this.runningExecutions.set(executionId, false)
    
    await this.updateExecution(executionId, 'stopped', {
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
    })
  }

  /**
   * 运行任务执行
   */
  private async runExecution(
    executionId: string,
    task: Task,
    proxies: Proxy[]
  ): Promise<void> {
    let successCount = 0
    let failureCount = 0
    const responseTimes: number[] = []
    const remaining = task.totalCount - task.completeCount

    console.log(`[TaskExecutor] Starting execution ${executionId}, remaining: ${remaining}`)

    try {
      // 更新任务状态
      await this.db.run(
        'UPDATE tasks SET status = ? WHERE id = ?',
        ['running', task.id]
      )

      for (let i = 0; i < remaining; i++) {
        // 检查是否被停止
        if (!this.runningExecutions.get(executionId)) {
          console.log(`[TaskExecutor] Execution ${executionId} stopped`)
          break
        }

        // 选择代理（轮换策略）
        const proxy = proxies.length > 0 ? proxies[i % proxies.length] : undefined
        
        // 创建浏览器服务
        const browserService = new BrowserService(task.config, proxy)
        
        try {
          // 启动浏览器
          await browserService.launch()

          // 访问目标 URL
          const result = await browserService.visit(task.targetUrl)

          // 记录日志
          await this.recordLog(
            executionId,
            proxy ? `${proxy.host}:${proxy.port}` : undefined,
            result.success ? 200 : undefined,
            result.responseTime,
            result.success,
            result.error
          )

          if (result.success) {
            successCount++
            responseTimes.push(result.responseTime)
          } else {
            failureCount++
          }

          // 更新进度
          const progress: ExecutionProgress = {
            executionId,
            current: i + 1,
            total: remaining,
            successCount,
            failureCount,
            status: 'running',
          }
          this.notifyProgress(executionId, progress)

          // 更新任务完成数
          await this.updateTaskProgress(task.id, task.completeCount + i + 1)

        } finally {
          await browserService.close()
        }

        // 请求间延迟
        const [minDelay, maxDelay] = task.config.delayRange
        const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay
        await this.sleep(delay)
      }

      // 计算平均响应时间
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : undefined

      // 更新执行记录
      const finalStatus = this.runningExecutions.get(executionId) ? 'completed' : 'stopped'
      await this.updateExecution(executionId, finalStatus, {
        totalRequests: remaining,
        successCount,
        failureCount,
        averageResponseTime: avgResponseTime,
      })

      // 更新任务状态
      await this.db.run(
        'UPDATE tasks SET status = ? WHERE id = ?',
        [finalStatus === 'completed' ? 'completed' : 'paused', task.id]
      )

      // 通知最终进度
      const finalProgress: ExecutionProgress = {
        executionId,
        current: remaining,
        total: remaining,
        successCount,
        failureCount,
        status: finalStatus as any,
      }
      this.notifyProgress(executionId, finalProgress)

    } catch (error: any) {
      console.error(`[TaskExecutor] Execution ${executionId} error:`, error)
      
      await this.updateExecution(executionId, 'failed', {
        totalRequests: 0,
        successCount,
        failureCount,
      })

      await this.db.run(
        'UPDATE tasks SET status = ? WHERE id = ?',
        ['failed', task.id]
      )

      this.notifyProgress(executionId, {
        executionId,
        current: 0,
        total: remaining,
        successCount,
        failureCount,
        status: 'failed',
      })
    } finally {
      this.runningExecutions.delete(executionId)
      this.progressCallbacks.delete(executionId)
    }
  }

  /**
   * 添加进度回调
   */
  private addProgressCallback(executionId: string, callback: ProgressCallback): void {
    if (!this.progressCallbacks.has(executionId)) {
      this.progressCallbacks.set(executionId, [])
    }
    this.progressCallbacks.get(executionId)!.push(callback)
  }

  /**
   * 通知进度更新
   */
  private notifyProgress(executionId: string, progress: ExecutionProgress): void {
    const callbacks = this.progressCallbacks.get(executionId)
    if (callbacks) {
      callbacks.forEach((cb) => cb(progress))
    }
  }

  /**
   * 创建执行记录
   */
  async createExecution(taskId: string): Promise<string> {
    const executionId = uuidv4()
    const now = Date.now()

    await this.db.run(
      `INSERT INTO task_executions (
        id, taskId, startTime, status, totalRequests, successCount, failureCount, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [executionId, taskId, now, 'running', 0, 0, 0, now]
    )

    return executionId
  }

  /**
   * 记录执行日志
   */
  async recordLog(
    executionId: string,
    ipUsed: string | undefined,
    statusCode: number | undefined,
    responseTime: number | undefined,
    success: boolean,
    errorMsg?: string
  ): Promise<void> {
    const logId = uuidv4()
    const now = Date.now()

    await this.db.run(
      `INSERT INTO execution_logs (
        id, executionId, timestamp, ipUsed, statusCode, responseTime, success, errorMsg, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logId,
        executionId,
        now,
        ipUsed || null,
        statusCode || null,
        responseTime || null,
        success ? 1 : 0,
        errorMsg || null,
        now,
      ]
    )
  }

  /**
   * 更新执行记录
   */
  async updateExecution(
    executionId: string,
    status: string,
    stats: {
      totalRequests: number
      successCount: number
      failureCount: number
      averageResponseTime?: number
    }
  ): Promise<void> {
    const endTime = Date.now()

    await this.db.run(
      `UPDATE task_executions SET
        status = ?, endTime = ?, totalRequests = ?,
        successCount = ?, failureCount = ?, averageResponseTime = ?
      WHERE id = ?`,
      [
        status,
        endTime,
        stats.totalRequests,
        stats.successCount,
        stats.failureCount,
        stats.averageResponseTime || null,
        executionId,
      ]
    )
  }

  /**
   * 更新任务进度
   */
  async updateTaskProgress(
    taskId: string,
    completeCount: number
  ): Promise<void> {
    await this.db.run(
      `UPDATE tasks SET completeCount = ? WHERE id = ?`,
      [completeCount, taskId]
    )
  }

  /**
   * 工具方法：延迟
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
