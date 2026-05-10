import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

export class Database {
  private db: SqlJsDatabase | null = null
  private dbPath: string
  private saveTimer: NodeJS.Timeout | null = null

  constructor() {
    const dataPath = app.getPath('userData')
    this.dbPath = path.join(dataPath, 'traffic-booster.db')
  }

  async initialize() {
    const SQL = await initSqlJs()
    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath)
      this.db = new SQL.Database(fileBuffer)
    } else {
      this.db = new SQL.Database()
    }
    this.db.run('PRAGMA foreign_keys = ON')
    await this.createTables()
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.persist(), 500)
  }

  private persist() {
    if (!this.db) return
    const data = this.db.export()
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true })
    fs.writeFileSync(this.dbPath, Buffer.from(data))
  }

  private async createTables() {
    if (!this.db) throw new Error('Database not initialized')

    const tableExists = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'")
      .getAsObject({})

    if (!tableExists.name) {
      this.db.run(`
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
      const stmt = this.db.prepare('PRAGMA table_info(projects)')
      const columnNames: string[] = []
      while (stmt.step()) {
        const row = stmt.getAsObject() as any
        columnNames.push(row.name)
      }
      stmt.free()

      if (!columnNames.includes('url')) {
        this.db.run('ALTER TABLE projects ADD COLUMN url TEXT')
      }
      if (!columnNames.includes('targetTraffic')) {
        this.db.run('ALTER TABLE projects ADD COLUMN targetTraffic INTEGER DEFAULT 0')
      }
      if (!columnNames.includes('status')) {
        this.db.run("ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'active'")
      }
    }

    const tables = [
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
      `CREATE TABLE IF NOT EXISTS proxy_pools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        proxyCount INTEGER DEFAULT 0,
        lastVerifyTime INTEGER,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      )`,
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
      this.db.run(sql)
    }

    this.persist()
  }

  run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject(new Error('Database not initialized')); return }
      try {
        this.db.run(sql, params)
        this.scheduleSave()
        resolve()
      } catch (err) {
        reject(err)
      }
    })
  }

  get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject(new Error('Database not initialized')); return }
      try {
        const stmt = this.db.prepare(sql)
        stmt.bind(params)
        const row = stmt.step() ? stmt.getAsObject() : undefined
        stmt.free()
        resolve(row)
      } catch (err) {
        reject(err)
      }
    })
  }

  all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject(new Error('Database not initialized')); return }
      try {
        const stmt = this.db.prepare(sql)
        stmt.bind(params)
        const rows: any[] = []
        while (stmt.step()) {
          rows.push(stmt.getAsObject())
        }
        stmt.free()
        resolve(rows)
      } catch (err) {
        reject(err)
      }
    })
  }

  async exec(sql: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    this.db.exec(sql)
    this.scheduleSave()
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.saveTimer) clearTimeout(this.saveTimer)
      if (this.db) {
        this.persist()
        this.db.close()
        this.db = null
      }
      resolve()
    })
  }
}
