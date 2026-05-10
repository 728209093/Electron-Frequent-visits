import { app, BrowserWindow, Menu, ipcMain } from 'electron'
import path from 'path'
import { Database } from './database/Database'
import { createBackendServer } from './backend/server'

// 禁用 GPU 加速，避免 GPU 进程崩溃
app.disableHardwareAcceleration()

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let db: Database | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  // 开发环境加载 Vite 服务，生产环境加载本地文件
  const startUrl = isDev 
    ? (process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173')
    : `file://${path.join(__dirname, '../renderer/index.html')}`
  
  mainWindow.loadURL(startUrl)

  if (isDev) {
    // 等待 Vite 服务就绪后再打开开发者工具
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.openDevTools()
    })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

async function initialize() {
  // Initialize database
  db = new Database()
  await db.initialize()

  // Create backend server
  await createBackendServer(db)

  // Create main window
  createWindow()

  // Setup IPC handlers
  setupIpcHandlers()
}

function setupIpcHandlers() {
  // Example IPC handler - will be expanded
  ipcMain.handle('app:version', () => {
    return app.getVersion()
  })
}

function createMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit()
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow?.reload()
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            mainWindow?.webContents.toggleDevTools()
          },
        },
      ],
    },
  ])

  Menu.setApplicationMenu(menu)
}

app.on('ready', async () => {
  await initialize()
  createMenu()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

export { db }
