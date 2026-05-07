import { Router } from 'express'
import { Database } from '../../database/Database'
import { v4 as uuidv4 } from 'uuid'

export function proxyRoutes(db: Database) {
  const router = Router()

  // Get all proxy pools
  router.get('/api/proxy-pools', async (_req, res) => {
    try {
      const pools = await db.all(
        'SELECT * FROM proxy_pools ORDER BY createdAt DESC'
      )
      res.json({
        code: 200,
        message: 'Success',
        data: pools,
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  // Get proxy pool by ID
  router.get('/api/proxy-pools/:id', async (req, res) => {
    try {
      const pool = await db.get(
        'SELECT * FROM proxy_pools WHERE id = ?',
        [req.params.id]
      )
      if (!pool) {
        return res.status(404).json({
          code: 404,
          message: 'Proxy pool not found',
        })
      }

      const proxies = await db.all(
        'SELECT * FROM proxy_list WHERE poolId = ? ORDER BY createdAt DESC',
        [req.params.id]
      )

      res.json({
        code: 200,
        message: 'Success',
        data: {
          ...pool,
          proxies,
        },
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  // Create proxy pool
  router.post('/api/proxy-pools', async (req, res) => {
    try {
      const { name, description, proxies = [] } = req.body

      if (!name) {
        return res.status(400).json({
          code: 400,
          message: 'Pool name is required',
        })
      }

      const poolId = uuidv4()
      const now = Date.now()

      await db.run(
        'INSERT INTO proxy_pools (id, name, description, proxyCount, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        [poolId, name, description || '', proxies.length, now, now]
      )

      // Add proxies
      for (const proxy of proxies) {
        const proxyId = uuidv4()
        await db.run(
          `INSERT INTO proxy_list (id, poolId, protocol, host, port, username, password, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            proxyId,
            poolId,
            proxy.protocol || 'http',
            proxy.host,
            proxy.port,
            proxy.username || null,
            proxy.password || null,
            now,
          ]
        )
      }

      const pool = await db.get(
        'SELECT * FROM proxy_pools WHERE id = ?',
        [poolId]
      )

      res.status(201).json({
        code: 201,
        message: 'Proxy pool created successfully',
        data: pool,
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  // Update proxy pool
  router.put('/api/proxy-pools/:id', async (req, res) => {
    try {
      const { name, description } = req.body
      const now = Date.now()

      await db.run(
        'UPDATE proxy_pools SET name = ?, description = ?, updatedAt = ? WHERE id = ?',
        [name, description || '', now, req.params.id]
      )

      const pool = await db.get(
        'SELECT * FROM proxy_pools WHERE id = ?',
        [req.params.id]
      )
      if (!pool) {
        return res.status(404).json({
          code: 404,
          message: 'Proxy pool not found',
        })
      }

      res.json({
        code: 200,
        message: 'Proxy pool updated successfully',
        data: pool,
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  // Delete proxy pool
  router.delete('/api/proxy-pools/:id', async (req, res) => {
    try {
      await db.run(
        'DELETE FROM proxy_pools WHERE id = ?',
        [req.params.id]
      )

      res.json({
        code: 200,
        message: 'Proxy pool deleted successfully',
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  // Add proxies to pool
  router.post('/api/proxy-pools/:id/proxies', async (req, res) => {
    try {
      const { proxies } = req.body
      if (!proxies || !Array.isArray(proxies)) {
        return res.status(400).json({
          code: 400,
          message: 'Proxies array is required',
        })
      }

      const now = Date.now()
      for (const proxy of proxies) {
        const proxyId = uuidv4()
        await db.run(
          `INSERT INTO proxy_list (id, poolId, protocol, host, port, username, password, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            proxyId,
            req.params.id,
            proxy.protocol || 'http',
            proxy.host,
            proxy.port,
            proxy.username || null,
            proxy.password || null,
            now,
          ]
        )
      }

      // Update pool proxy count
      const count = await db.get(
        'SELECT COUNT(*) as count FROM proxy_list WHERE poolId = ?',
        [req.params.id]
      )
      await db.run(
        'UPDATE proxy_pools SET proxyCount = ? WHERE id = ?',
        [count.count, req.params.id]
      )

      res.json({
        code: 200,
        message: 'Proxies added successfully',
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  // Delete proxy from pool
  router.delete('/api/proxy-pools/:id/proxies/:proxyId', async (req, res) => {
    try {
      await db.run(
        'DELETE FROM proxy_list WHERE id = ? AND poolId = ?',
        [req.params.proxyId, req.params.id]
      )

      // Update pool proxy count
      const count = await db.get(
        'SELECT COUNT(*) as count FROM proxy_list WHERE poolId = ?',
        [req.params.id]
      )
      await db.run(
        'UPDATE proxy_pools SET proxyCount = ? WHERE id = ?',
        [count.count, req.params.id]
      )

      res.json({
        code: 200,
        message: 'Proxy deleted successfully',
      })
    } catch (error: any) {
      res.status(500).json({
        code: 500,
        message: error.message,
      })
    }
  })

  // Verify proxy pool
  router.post('/api/proxy-pools/:id/verify', async (req, res) => {
    try {
      const now = Date.now()
      await db.run(
        'UPDATE proxy_pools SET lastVerifyTime = ? WHERE id = ?',
        [now, req.params.id]
      )

      res.json({
        code: 200,
        message: 'Proxy pool verification started',
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
