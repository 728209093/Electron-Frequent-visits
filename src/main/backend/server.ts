import express from 'express'
import cors from 'cors'
import { Database } from '../database/Database'
import { projectRoutes } from './routes/projects'
import { taskRoutes } from './routes/tasks'
import { proxyRoutes } from './routes/proxies'
import { analyticsRoutes } from './routes/analytics'
import { previewRoutes } from './routes/preview'

import { settingsRoutes } from './routes/settings'

let server: any = null

export async function createBackendServer(db: Database) {
  const app = express()

  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  app.get('/health', (_req, res) => res.json({ status: 'ok' }))

  app.use(projectRoutes(db))
  app.use(taskRoutes(db))
  app.use(proxyRoutes(db))
  app.use(analyticsRoutes(db))
  app.use(previewRoutes(db))
  app.use(settingsRoutes())

  // Error handling
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error('API Error:', err)
    res.status(err.status || 500).json({
      code: err.status || 500,
      message: err.message || 'Internal Server Error',
    })
  })

  // Start server
  const PORT = process.env.PORT || 3001
  return new Promise<void>((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`)
      resolve()
    })
  })
}

export function getBackendServer() {
  return server
}
