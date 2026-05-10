import { Router } from 'express'
import { Database } from '../../database/Database'
import { getPreviewService } from '../../services/PreviewService'
import { Task, Proxy } from '../../../shared/types'
import { mergeTaskConfig, sanitizeTargetUrl } from '../../../shared/constants'

export function previewRoutes(db: Database) {
  const router = Router()
  const previewService = getPreviewService()

  let previewLogs: Array<{ time: string; message: string; type: string }> = []
  let previewStatus: 'idle' | 'running' | 'completed' | 'error' = 'idle'
  let previewError: string | null = null

  router.post('/api/preview/start', async (req, res) => {
    try {
      const { taskId } = req.body

      if (!taskId) {
        return res.status(400).json({ code: 400, message: '缺少任务 ID' })
      }

      if (previewService.getIsRunning()) {
        return res.status(400).json({ code: 400, message: '已有预览正在运行，请先停止' })
      }

      const task = await db.get<Task>('SELECT * FROM tasks WHERE id = ?', [taskId])
      if (!task) {
        return res.status(404).json({ code: 404, message: '任务不存在' })
      }

      if (typeof task.config === 'string') {
        task.config = JSON.parse(task.config)
      }

      task.config = mergeTaskConfig(task.config)
      task.targetUrl = sanitizeTargetUrl(task.targetUrl)

      let proxy: Proxy | undefined
      if (task.proxyPoolId) {
        proxy = await db.get<Proxy>(
          'SELECT * FROM proxy_list WHERE poolId = ? AND isActive = 1 ORDER BY RANDOM() LIMIT 1',
          [task.proxyPoolId]
        )
      }

      previewLogs = []
      previewStatus = 'running'
      previewError = null

      previewService.startPreview({
        task,
        proxy,
        onLog: (message, type) => {
          const logEntry = {
            time: new Date().toLocaleTimeString(),
            message,
            type,
          }
          previewLogs.push(logEntry)
          console.log(`[Preview Log] ${logEntry.time} - ${message}`)
        },
        onComplete: (success, error) => {
          previewStatus = success ? 'completed' : 'error'
          previewError = error || null
        },
      })

      res.json({
        code: 200,
        message: '预览已启动',
        data: { taskId, taskName: task.name },
      })
    } catch (error: any) {
      console.error('[Preview] Start error:', error)
      res.status(500).json({ code: 500, message: error.message })
    }
  })

  router.post('/api/preview/stop', async (_req, res) => {
    try {
      await previewService.stopPreview()
      previewStatus = 'idle'

      res.json({ code: 200, message: '预览已停止' })
    } catch (error: any) {
      console.error('[Preview] Stop error:', error)
      res.status(500).json({ code: 500, message: error.message })
    }
  })

  router.get('/api/preview/status', (_req, res) => {
    res.json({
      code: 200,
      data: {
        status: previewStatus,
        isRunning: previewService.getIsRunning(),
        error: previewError,
        logs: previewLogs,
      },
    })
  })

  router.get('/api/preview/logs', (req, res) => {
    const from = parseInt(req.query.from as string, 10) || 0
    const newLogs = previewLogs.slice(from)

    res.json({
      code: 200,
      data: {
        logs: newLogs,
        total: previewLogs.length,
        status: previewStatus,
      },
    })
  })

  return router
}
