import { Router } from 'express'
import { Database } from '../../database/Database'
import { getPreviewService } from '../../services/PreviewService'
import { Task, Proxy } from '../../../shared/types'

export function previewRoutes(db: Database) {
  const router = Router()
  const previewService = getPreviewService()

  // 存储当前预览的日志
  let previewLogs: Array<{ time: string; message: string; type: string }> = []
  let previewStatus: 'idle' | 'running' | 'completed' | 'error' = 'idle'
  let previewError: string | null = null

  /**
   * 启动任务预览
   * POST /api/preview/start
   */
  router.post('/api/preview/start', async (req, res) => {
    try {
      const { taskId } = req.body

      if (!taskId) {
        return res.status(400).json({ code: 400, message: '缺少任务ID' })
      }

      // 检查是否已有预览在运行
      if (previewService.getIsRunning()) {
        return res.status(400).json({ code: 400, message: '已有预览正在运行，请先停止' })
      }

      // 获取任务信息
      const task = await db.get<Task>('SELECT * FROM tasks WHERE id = ?', [taskId])
      if (!task) {
        return res.status(404).json({ code: 404, message: '任务不存在' })
      }

      // 解析任务配置
      if (typeof task.config === 'string') {
        task.config = JSON.parse(task.config)
      }

      // 获取代理（如果有）
      let proxy: Proxy | undefined
      if (task.proxyPoolId) {
        proxy = await db.get<Proxy>(
          'SELECT * FROM proxy_list WHERE poolId = ? AND isActive = 1 ORDER BY RANDOM() LIMIT 1',
          [task.proxyPoolId]
        )
      }

      // 重置日志
      previewLogs = []
      previewStatus = 'running'
      previewError = null

      // 启动预览（异步）
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

  /**
   * 停止预览
   * POST /api/preview/stop
   */
  router.post('/api/preview/stop', async (req, res) => {
    try {
      await previewService.stopPreview()
      previewStatus = 'idle'
      
      res.json({ code: 200, message: '预览已停止' })
    } catch (error: any) {
      console.error('[Preview] Stop error:', error)
      res.status(500).json({ code: 500, message: error.message })
    }
  })

  /**
   * 获取预览状态和日志
   * GET /api/preview/status
   */
  router.get('/api/preview/status', (req, res) => {
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

  /**
   * 获取预览日志（支持增量获取）
   * GET /api/preview/logs?from=0
   */
  router.get('/api/preview/logs', (req, res) => {
    const from = parseInt(req.query.from as string) || 0
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
