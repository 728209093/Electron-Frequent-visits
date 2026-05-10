import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

// 设置文件存储路径
const getSettingsPath = () => path.join(app.getPath('userData'), 'browser-settings.json')

export interface BrowserSettings {
  executablePath: string
  profileDir: string
}

// 读取浏览器设置
export function loadBrowserSettings(): BrowserSettings | null {
  try {
    const filePath = getSettingsPath()
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('[Settings] Failed to load browser settings:', e)
  }
  return null
}

export function settingsRoutes() {
  const router = Router()

  // 保存浏览器设置
  router.post('/api/settings/browser', (req, res) => {
    try {
      const { executablePath, profileDir } = req.body as BrowserSettings

      if (!executablePath) {
        return res.status(400).json({ code: 400, message: '浏览器路径不能为空' })
      }

      // 验证文件是否存在
      if (!fs.existsSync(executablePath)) {
        return res.status(400).json({ code: 400, message: `浏览器文件不存在: ${executablePath}` })
      }

      const settings: BrowserSettings = { executablePath, profileDir: profileDir || '' }
      fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8')

      console.log(`[Settings] Browser settings saved: ${executablePath}`)
      res.json({ code: 200, message: '保存成功', data: settings })
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message })
    }
  })

  // 读取浏览器设置
  router.get('/api/settings/browser', (req, res) => {
    const settings = loadBrowserSettings()
    res.json({ code: 200, data: settings })
  })

  return router
}
