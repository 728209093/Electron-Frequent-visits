import sqlite3 from 'sqlite3'
import path from 'path'
import { app } from 'electron'

export class Database {
  private db: sqlite3.Database | null = null
  private dbPath: string

  constructor() {
    const dataPath = app.getPath('userData')
    this.dbPath = path.join(dataPath, 'traffic-booster.db')
  }

  async initialize() {
    return new Promise<void>((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, async (err) => {
        if (err) {
          reject(err)
        } else {
          try {
            await this.createTables()
            resolve()
          } catch (error) {
            reject(error)
          }
        }
      })
    })
  }

  private async createTables() {
    if (!this.db) throw new Error('Database not initialized')

    // 首先检查projects表是否存在
    const tableExists = await this.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='projects'"
    )

    if (!tableExists) {
      // 如果不存在，创建新表
      await this.run(`
        CREATE TABLE projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          url TEXT,
          targetTraffic INTEGER DEFAULT 0,
          status TEXT DEFAULT 'active',
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        )
      `)
    } else {
      // 如果表存在，检查是否缺少新列
      const columns = await this.all(
        "PRAGMA table_info(projects)"
      )
      const columnNames = columns.map((col: any) => col.name)

      // 添加缺失的列
      if (!columnNames.includes('url')) {
        await this.run('ALTER TABLE projects ADD COLUMN url TEXT')
      }
      if (!columnNames.includes('targetTraffic')) {
        await this.run('ALTER TABLE projects ADD COLUMN targetTraffic INTEGER DEFAULT 0')
      }
      if (!columnNames.includes('status')) {
        await this.run('ALTER TABLE projects ADD COLUMN status TEXT DEFAULT "active"')
      }
    }

    const tables = [
      // Tasks table
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        targetUrl TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        proxyPoolId TEXT,
        concurrency INTEGER DEFAULT 1,
        totalCount INTEGER NOT NULL,
        completeCount INTEGER DEFAULT 0,
        scheduleType TEXT DEFAULT 'once',
        scheduleTime TEXT,
        config TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      )`,

      // Proxy Pools table
      `CREATE TABLE IF NOT EXISTS proxy_pools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        proxyCount INTEGER DEFAULT 0,
        lastVerifyTime INTEGER,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      )`,

      // Proxy List table
      `CREATE TABLE IF NOT EXISTS proxy_list (
        id TEXT PRIMARY KEY,
        poolId TEXT NOT NULL REFERENCES proxy_pools(id) ON DELETE CASCADE,
        protocol TEXT DEFAULT 'http',
        host TEXT NOT NULL,
        port INTEGER NOT NULL,
        username TEXT,
        password TEXT,
        isActive BOOLEAN DEFAULT 1,
        lastCheckTime INTEGER,
        failureCount INTEGER DEFAULT 0,
        createdAt INTEGER NOT NULL
      )`,

      // Task Executions table
      `CREATE TABLE IF NOT EXISTS task_executions (
        id TEXT PRIMARY KEY,
        taskId TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        startTime INTEGER NOT NULL,
        endTime INTEGER,
        status TEXT,
        totalRequests INTEGER DEFAULT 0,
        successCount INTEGER DEFAULT 0,
        failureCount INTEGER DEFAULT 0,
        averageResponseTime REAL,
        createdAt INTEGER NOT NULL
      )`,

      // Execution Logs table
      `CREATE TABLE IF NOT EXISTS execution_logs (
        id TEXT PRIMARY KEY,
        executionId TEXT NOT NULL REFERENCES task_executions(id) ON DELETE CASCADE,
        timestamp INTEGER NOT NULL,
        ipUsed TEXT,
        statusCode INTEGER,
        responseTime INTEGER,
        success BOOLEAN,
        errorMsg TEXT,
        createdAt INTEGER NOT NULL
      )`,
    ]

    for (const sql of tables) {
      await this.run(sql)
    }
  }

  run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }
      this.db.run(sql, params, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err)
        else resolve(row)
      })
    })
  }

  all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err)
        else resolve(rows || [])
      })
    })
  }

  async exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }
      this.db.exec(sql, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve()
        return
      }
      this.db.close((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
}
