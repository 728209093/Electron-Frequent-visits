import { Router } from 'express'
import { Database } from '../../database/Database'
import { v4 as uuidv4 } from 'uuid'

export function projectRoutes(db: Database) {
  const router = Router()

  // Get all projects
  router.get('/api/projects', async (_req, res) => {
    try {
      const projects = await db.all(
        'SELECT * FROM projects ORDER BY createdAt DESC'
      )
      res.json({
        code: 200,
        message: 'Success',
        data: projects,
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  // Get project by ID
  router.get('/api/projects/:id', async (req, res) => {
    try {
      const project = await db.get(
        'SELECT * FROM projects WHERE id = ?',
        [req.params.id]
      )
      if (!project) {
        return res.status(404).json({
          code: 404,
          message: 'Project not found',
        })
      }
      res.json({
        code: 200,
        message: 'Success',
        data: project,
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  // Create project
  router.post('/api/projects', async (req, res) => {
    try {
      const { name, description, url, targetTraffic, status } = req.body
      if (!name) {
        return res.status(400).json({
          code: 400,
          message: 'Project name is required',
        })
      }

      const id = uuidv4()
      const now = Date.now()
      await db.run(
        'INSERT INTO projects (id, name, description, url, targetTraffic, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, name, description || '', url || '', targetTraffic || 0, status || 'active', now, now]
      )

      const project = await db.get(
        'SELECT * FROM projects WHERE id = ?',
        [id]
      )
      res.status(201).json({
        code: 201,
        message: 'Project created successfully',
        data: project,
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  // Update project
  router.put('/api/projects/:id', async (req, res) => {
    try {
      const { name, description, url, targetTraffic, status } = req.body
      const now = Date.now()

      await db.run(
        'UPDATE projects SET name = ?, description = ?, url = ?, targetTraffic = ?, status = ?, updatedAt = ? WHERE id = ?',
        [name, description || '', url || '', targetTraffic || 0, status || 'active', now, req.params.id]
      )

      const project = await db.get(
        'SELECT * FROM projects WHERE id = ?',
        [req.params.id]
      )
      if (!project) {
        return res.status(404).json({
          code: 404,
          message: 'Project not found',
        })
      }

      res.json({
        code: 200,
        message: 'Project updated successfully',
        data: project,
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  // Delete project
  router.delete('/api/projects/:id', async (req, res) => {
    try {
      await db.run(
        'DELETE FROM projects WHERE id = ?',
        [req.params.id]
      )

      res.json({
        code: 200,
        message: 'Project deleted successfully',
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
