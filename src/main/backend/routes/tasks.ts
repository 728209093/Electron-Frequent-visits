import { Router } from 'express'
import { Database } from '../../database/Database'
import { v4 as uuidv4 } from 'uuid'
import {
  DEFAULT_TASK_CONFIG,
  mergeTaskConfig,
  sanitizeTargetUrl,
} from '../../../shared/constants'
import { TaskExecutor } from '../../services/TaskExecutor'

// 全局任务执行器实例
let taskExecutor: TaskExecutor | null = null

export function taskRoutes(db: Database) {
  const router = Router()

  // 初始化任务执行器
  if (!taskExecutor) {
    taskExecutor = new TaskExecutor(db)
  }

  // Get tasks by project
  router.get('/api/tasks', async (req, res) => {
    try {
      const { projectId } = req.query
      let sql = 'SELECT * FROM tasks'
      let params: any[] = []

      if (projectId) {
        sql += ' WHERE projectId = ?'
        params = [projectId]
      }

      sql += ' ORDER BY createdAt DESC'
      const tasks = await db.all(sql, params)

      res.json({
        code: 200,
        message: 'Success',
        data: tasks.map((task: any) => ({
          ...task,
          targetUrl: sanitizeTargetUrl(task.targetUrl),
          config: mergeTaskConfig(JSON.parse(task.config)),
        })),
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  // Get task by ID
  router.get('/api/tasks/:id', async (req, res) => {
    try {
      const task = await db.get(
        'SELECT * FROM tasks WHERE id = ?',
        [req.params.id]
      )
      if (!task) {
        return res.status(404).json({
          code: 404,
          message: 'Task not found',
        })
      }

      res.json({
        code: 200,
        message: 'Success',
        data: {
          ...task,
          targetUrl: sanitizeTargetUrl(task.targetUrl),
          config: mergeTaskConfig(JSON.parse(task.config)),
        },
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  // Create task
  router.post('/api/tasks', async (req, res) => {
    try {
      const {
        projectId,
        name,
        targetUrl,
        proxyPoolId,
        concurrency = 1,
        totalCount,
        scheduleType = 'once',
        scheduleTime,
        config = DEFAULT_TASK_CONFIG,
      } = req.body

      const sanitizedUrl = sanitizeTargetUrl(targetUrl)

      if (!projectId || !name || !sanitizedUrl || !totalCount) {
        return res.status(400).json({
          code: 400,
          message: 'Missing required fields',
        })
      }

      const id = uuidv4()
      const now = Date.now()

      const normalizedConfig = mergeTaskConfig(config)

      await db.run(
        `INSERT INTO tasks (
          id, projectId, name, targetUrl, proxyPoolId, concurrency,
          totalCount, scheduleType, scheduleTime, config, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          projectId,
          name,
          sanitizedUrl,
          proxyPoolId || null,
          concurrency,
          totalCount,
          scheduleType,
          scheduleTime || null,
          JSON.stringify(normalizedConfig),
          now,
          now,
        ]
      )

      const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id])
      res.status(201).json({
        code: 201,
        message: 'Task created successfully',
        data: {
          ...task,
          targetUrl: sanitizeTargetUrl(task.targetUrl),
          config: mergeTaskConfig(JSON.parse(task.config)),
        },
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  // Update task
  router.put('/api/tasks/:id', async (req, res) => {
    try {
      const { name, targetUrl, proxyPoolId, concurrency, totalCount, config } =
        req.body
      const now = Date.now()
      const sanitizedUrl = sanitizeTargetUrl(targetUrl)

      const normalizedConfig = mergeTaskConfig(config)

      await db.run(
        `UPDATE tasks SET
          name = ?, targetUrl = ?, proxyPoolId = ?, concurrency = ?,
          totalCount = ?, config = ?, updatedAt = ?
        WHERE id = ?`,
        [
          name,
          sanitizedUrl,
          proxyPoolId || null,
          concurrency,
          totalCount,
          JSON.stringify(normalizedConfig || DEFAULT_TASK_CONFIG),
          now,
          req.params.id,
        ]
      )

      const task = await db.get('SELECT * FROM tasks WHERE id = ?', [
        req.params.id,
      ])
      if (!task) {
        return res.status(404).json({
          code: 404,
          message: 'Task not found',
        })
      }

      res.json({
        code: 200,
        message: 'Task updated successfully',
        data: {
          ...task,
          targetUrl: sanitizeTargetUrl(task.targetUrl),
          config: mergeTaskConfig(JSON.parse(task.config)),
        },
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  // Delete task
  router.delete('/api/tasks/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM tasks WHERE id = ?', [req.params.id])

      res.json({
        code: 200,
        message: 'Task deleted successfully',
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  // Start task
  router.post('/api/tasks/:id/start', async (req, res) => {
    try {
      const taskId = req.params.id

      // 获取任务信息
      const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId])
      if (!task) {
        return res.status(404).json({
          code: 404,
          message: 'Task not found',
        })
      }

      if (task.status === 'running') {
        return res.status(400).json({
          code: 400,
          message: 'Task is already running',
        })
      }

      // 获取代理列表
      let proxies: any[] = []
      if (task.proxyPoolId) {
        proxies = await db.all(
          'SELECT * FROM proxy_list WHERE poolId = ? AND isActive = 1',
          [task.proxyPoolId]
        )
      }

      // 解析任务配置
      const taskData = {
        ...task,
        targetUrl: sanitizeTargetUrl(task.targetUrl),
        config: mergeTaskConfig(JSON.parse(task.config)),
      }

      // 执行任务
      const executionId = await taskExecutor!.executeTask(taskData, proxies)

      res.json({
        code: 200,
        message: 'Task started',
        data: { executionId },
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  // Stop task
  router.post('/api/tasks/:id/stop', async (req, res) => {
    try {
      const taskId = req.params.id

      // 获取正在运行的执行记录
      const execution = await db.get(
        'SELECT id FROM task_executions WHERE taskId = ? AND status = ?',
        [taskId, 'running']
      )

      if (execution) {
        await taskExecutor!.stopExecution(execution.id)
      }

      // 更新任务状态
      await db.run(
        'UPDATE tasks SET status = ? WHERE id = ?',
        ['paused', taskId]
      )

      res.json({
        code: 200,
        message: 'Task stopped',
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  // Pause task
  router.post('/api/tasks/:id/pause', async (req, res) => {
    try {
      const taskId = req.params.id

      // 获取正在运行的执行记录
      const execution = await db.get(
        'SELECT id FROM task_executions WHERE taskId = ? AND status = ?',
        [taskId, 'running']
      )

      if (execution) {
        await taskExecutor!.stopExecution(execution.id)
      }

      // 更新任务状态
      await db.run(
        'UPDATE tasks SET status = ? WHERE id = ?',
        ['paused', taskId]
      )

      res.json({
        code: 200,
        message: 'Task paused',
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  // Resume task
  router.post('/api/tasks/:id/resume', async (req, res) => {
    try {
      const taskId = req.params.id

      // 获取任务信息
      const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId])
      if (!task) {
        return res.status(404).json({
          code: 404,
          message: 'Task not found',
        })
      }

      if (task.status !== 'paused') {
        return res.status(400).json({
          code: 400,
          message: 'Task is not paused',
        })
      }

      // 获取代理列表
      let proxies: any[] = []
      if (task.proxyPoolId) {
        proxies = await db.all(
          'SELECT * FROM proxy_list WHERE poolId = ? AND isActive = 1',
          [task.proxyPoolId]
        )
      }

      // 解析任务配置
      const taskData = {
        ...task,
        targetUrl: sanitizeTargetUrl(task.targetUrl),
        config: mergeTaskConfig(JSON.parse(task.config)),
      }

      // 继续执行任务
      const executionId = await taskExecutor!.executeTask(taskData, proxies)

      res.json({
        code: 200,
        message: 'Task resumed',
        data: { executionId },
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
