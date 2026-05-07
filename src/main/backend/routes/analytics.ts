import { Router } from 'express'
import { Database } from '../../database/Database'

export function analyticsRoutes(db: Database) {
  const router = Router()

  // Get execution history
  router.get('/api/executions', async (req, res) => {
    try {
      const { taskId, limit = 20, offset = 0 } = req.query
      let sql = 'SELECT * FROM task_executions'
      let params: any[] = []

      if (taskId) {
        sql += ' WHERE taskId = ?'
        params = [taskId]
      }

      sql += ' ORDER BY startTime DESC LIMIT ? OFFSET ?'
      params.push(parseInt(limit as string), parseInt(offset as string))

      const executions = await db.all(sql, params)

      res.json({
        code: 200,
        message: 'Success',
        data: executions,
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  // Get execution logs
  router.get('/api/executions/:id/logs', async (req, res) => {
    try {
      const { limit = 100, offset = 0 } = req.query

      const logs = await db.all(
        'SELECT * FROM execution_logs WHERE executionId = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [req.params.id, parseInt(limit as string), parseInt(offset as string)]
      )

      res.json({
        code: 200,
        message: 'Success',
        data: logs,
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  // Get analytics stats
  router.get('/api/analytics/stats', async (req, res) => {
    try {
      const { projectId, days = 7 } = req.query
      const startTime = Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000

      let sql = `
        SELECT
          COUNT(DISTINCT taskId) as totalTasks,
          COUNT(*) as totalExecutions,
          SUM(successCount) as totalSuccess,
          SUM(failureCount) as totalFailures,
          AVG(averageResponseTime) as avgResponseTime
        FROM task_executions
        WHERE startTime > ?
      `
      const params: any[] = [startTime]

      if (projectId) {
        sql += ` AND taskId IN (SELECT id FROM tasks WHERE projectId = ?)`
        params.push(projectId)
      }

      const stats = await db.get(sql, params)

      res.json({
        code: 200,
        message: 'Success',
        data: stats,
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  // Get report data
  router.get('/api/analytics/report', async (req, res) => {
    try {
      const { taskId, days = 7 } = req.query
      const startTime = Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000

      // Get daily stats
      const dailyStats = await db.all(
        `
        SELECT
          DATE(startTime / 1000, 'unixepoch') as date,
          COUNT(*) as executions,
          SUM(successCount) as totalSuccess,
          SUM(failureCount) as totalFailures
        FROM task_executions
        WHERE startTime > ? ${taskId ? 'AND taskId = ?' : ''}
        GROUP BY date
        ORDER BY date DESC
        `,
        taskId ? [startTime, taskId] : [startTime]
      )

      // Get IP distribution
      const ipStats = await db.all(
        `
        SELECT
          ipUsed,
          COUNT(*) as count,
          SUM(CASE WHEN success THEN 1 ELSE 0 END) as successCount,
          AVG(responseTime) as avgResponseTime
        FROM execution_logs
        WHERE timestamp > ? ${taskId ? `AND executionId IN (SELECT id FROM task_executions WHERE taskId = ?)` : ''}
        GROUP BY ipUsed
        ORDER BY count DESC
        LIMIT 20
        `,
        taskId ? [startTime, taskId] : [startTime]
      )

      res.json({
        code: 200,
        message: 'Success',
        data: {
          dailyStats,
          ipStats,
        },
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  return router
}
