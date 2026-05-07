import { v4 as uuidv4 } from 'uuid'
import { Database } from '../database/Database'

export class TaskExecutor {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

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

  async updateTaskProgress(
    taskId: string,
    completeCount: number
  ): Promise<void> {
    await this.db.run(
      `UPDATE tasks SET completeCount = ? WHERE id = ?`,
      [completeCount, taskId]
    )
  }
}
