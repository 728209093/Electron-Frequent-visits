import { Router } from 'express'
import { Database } from '../../database/Database'
import { v4 as uuidv4 } from 'uuid'
import { DEFAULT_TASK_CONFIG } from '../../../shared/constants'

export function taskRoutes(db: Database) {
  const router = Router()

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
          config: JSON.parse(task.config),
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
          config: JSON.parse(task.config),
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

      if (!projectId || !name || !targetUrl || !totalCount) {
        return res.status(400).json({
          code: 400,
          message: 'Missing required fields',
        })
      }

      const id = uuidv4()
      const now = Date.now()

      await db.run(
        `INSERT INTO tasks (
          id, projectId, name, targetUrl, proxyPoolId, concurrency,
          totalCount, scheduleType, scheduleTime, config, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          projectId,
          name,
          targetUrl,
          proxyPoolId || null,
          concurrency,
          totalCount,
          scheduleType,
          scheduleTime || null,
          JSON.stringify(config),
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
          config: JSON.parse(task.config),
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

      await db.run(
        `UPDATE tasks SET
          name = ?, targetUrl = ?, proxyPoolId = ?, concurrency = ?,
          totalCount = ?, config = ?, updatedAt = ?
        WHERE id = ?`,
        [
          name,
          targetUrl,
          proxyPoolId || null,
          concurrency,
          totalCount,
          JSON.stringify(config || DEFAULT_TASK_CONFIG),
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
          config: JSON.parse(task.config),
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

  // Task control endpoints (placeholders)
  router.post('/api/tasks/:id/start', async (_req, res) => {
    res.json({
      code: 200,
      message: 'Task started',
    })
  })

  router.post('/api/tasks/:id/stop', async (_req, res) => {
    res.json({
      code: 200,
      message: 'Task stopped',
    })
  })

  router.post('/api/tasks/:id/pause', async (_req, res) => {
    res.json({
      code: 200,
      message: 'Task paused',
    })
  })

  router.post('/api/tasks/:id/resume', async (_req, res) => {
    res.json({
      code: 200,
      message: 'Task resumed',
    })
  })

  return router
}
