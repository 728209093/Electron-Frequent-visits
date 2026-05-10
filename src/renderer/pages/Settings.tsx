import React, { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  InputNumber,
  Switch,
  Button,
  Divider,
  Space,
  message,
  Tabs,
  Typography,
  Alert,
} from 'antd'
import { FolderOpenOutlined, ChromeOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

const { Text } = Typography

interface Settings {
  maxConcurrentTasks: number
  maxProxyPoolSize: number
  requestTimeout: number
  retryAttempts: number
  enableNotifications: boolean
  autoStartTasks: boolean
}

interface BrowserSettings {
  executablePath: string
  profileDir: string
}

const Settings: React.FC = () => {
  const { t } = useTranslation()
  const [form] = Form.useForm<Settings>()
  const [browserForm] = Form.useForm<BrowserSettings>()
  const [settings, setSettings] = useState<Settings>({
    maxConcurrentTasks: 5,
    maxProxyPoolSize: 100,
    requestTimeout: 30000,
    retryAttempts: 3,
    enableNotifications: true,
    autoStartTasks: false,
  })
  const [browserSettings, setBrowserSettings] = useState<BrowserSettings>({
    executablePath: '',
    profileDir: '',
  })
  const [loading, setLoading] = useState(false)
  const [browserSaved, setBrowserSaved] = useState(false)

  // 加载已保存的设置
  useEffect(() => {
    const saved = localStorage.getItem('appSettings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSettings(parsed)
        form.setFieldsValue(parsed)
      } catch (e) {}
    }

    const savedBrowser = localStorage.getItem('browserSettings')
    if (savedBrowser) {
      try {
        const parsed = JSON.parse(savedBrowser)
        setBrowserSettings(parsed)
        browserForm.setFieldsValue(parsed)
        setBrowserSaved(true)
      } catch (e) {}
    } else {
      // 默认填入常见 Chrome 路径
      const defaultPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      browserForm.setFieldsValue({ executablePath: defaultPath, profileDir: '' })
    }
  }, [])

  const handleSaveSettings = async (values: Settings) => {
    setLoading(true)
    try {
      localStorage.setItem('appSettings', JSON.stringify(values))
      setSettings(values)
      message.success(t('settings.saved'))
    } catch (error) {
      message.error(t('common.saveFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleSaveBrowserSettings = async (values: BrowserSettings) => {
    try {
      localStorage.setItem('browserSettings', JSON.stringify(values))
      setBrowserSettings(values)
      setBrowserSaved(true)
      message.success('浏览器设置已保存')

      // 同步到后端
      await fetch('http://localhost:3001/api/settings/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
    } catch (error) {
      message.error('保存失败')
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <Tabs
        items={[
          {
            key: 'browser',
            label: (
              <span>
                <ChromeOutlined />
                浏览器设置
                {browserSaved && <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 6 }} />}
              </span>
            ),
            children: (
              <Card title="浏览器配置">
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 24 }}
                  message="配置说明"
                  description={
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      <li>指定浏览器路径后，预览模式将使用该浏览器打开网页</li>
                      <li>推荐使用已安装油猴扩展的浏览器</li>
                      <li>Profile 目录留空则使用独立的临时目录</li>
                      <li>设置一次后自动保存，无需每次重新配置</li>
                    </ul>
                  }
                />

                <Form
                  form={browserForm}
                  layout="vertical"
                  onFinish={handleSaveBrowserSettings}
                >
                  <Form.Item
                    label="浏览器可执行文件路径"
                    name="executablePath"
                    rules={[{ required: true, message: '请输入浏览器路径' }]}
                    extra="例如：C:\Program Files\Google\Chrome\Application\chrome.exe"
                  >
                    <Input
                      placeholder="C:\Program Files\Google\Chrome\Application\chrome.exe"
                      prefix={<FolderOpenOutlined />}
                      allowClear
                    />
                  </Form.Item>

                  <Form.Item
                    label="Profile 目录（可选）"
                    name="profileDir"
                    extra="指定用户数据目录，可保留扩展和登录状态。留空则每次使用独立目录。"
                  >
                    <Input
                      placeholder="例如：C:\Users\你的用户名\AppData\Local\TrafficBooster\Profile"
                      prefix={<FolderOpenOutlined />}
                      allowClear
                    />
                  </Form.Item>

                  <Divider orientation="left">常用浏览器路径</Divider>

                  <Space wrap style={{ marginBottom: 16 }}>
                    {[
                      { label: 'Chrome', path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
                      { label: 'Chrome (x86)', path: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' },
                      { label: 'Edge', path: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' },
                      { label: 'Brave', path: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe' },
                    ].map(item => (
                      <Button
                        key={item.label}
                        size="small"
                        onClick={() => browserForm.setFieldValue('executablePath', item.path)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </Space>

                  <Form.Item>
                    <Space>
                      <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
                        保存浏览器设置
                      </Button>
                      {browserSaved && (
                        <Text type="success">✅ 已保存，预览时将使用此浏览器</Text>
                      )}
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
          {
            key: 'general',
            label: t('settings.general'),
            children: (
              <Card title={t('settings.generalSettings')}>
                <Form
                  form={form}
                  layout="vertical"
                  initialValues={settings}
                  onFinish={handleSaveSettings}
                >
                  <Form.Item label={t('settings.maxConcurrentTasks')} name="maxConcurrentTasks" rules={[{ required: true }]}>
                    <InputNumber min={1} max={100} />
                  </Form.Item>
                  <Form.Item label={t('settings.maxProxyPoolSize')} name="maxProxyPoolSize" rules={[{ required: true }]}>
                    <InputNumber min={1} max={10000} />
                  </Form.Item>
                  <Form.Item label={t('settings.requestTimeout')} name="requestTimeout" rules={[{ required: true }]}>
                    <InputNumber min={1000} placeholder="ms" />
                  </Form.Item>
                  <Form.Item label={t('settings.retryAttempts')} name="retryAttempts" rules={[{ required: true }]}>
                    <InputNumber min={0} max={10} />
                  </Form.Item>
                  <Divider />
                  <Form.Item label={t('settings.enableNotifications')} name="enableNotifications" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  <Form.Item label={t('settings.autoStartTasks')} name="autoStartTasks" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  <Form.Item>
                    <Space>
                      <Button type="primary" htmlType="submit" loading={loading}>{t('common.save')}</Button>
                      <Button onClick={() => form.resetFields()}>{t('common.reset')}</Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
          {
            key: 'system',
            label: t('settings.system'),
            children: (
              <Card title={t('settings.systemSettings')}>
                <h3>{t('settings.applicationInfo')}</h3>
                <p><strong>{t('settings.version')}:</strong> 1.0.0</p>
                <Divider />
                <h3>{t('settings.cache')}</h3>
                <p>{t('settings.clearCacheDescription')}</p>
                <Button danger>{t('settings.clearCache')}</Button>
              </Card>
            ),
          },
          {
            key: 'about',
            label: t('settings.about'),
            children: (
              <Card title={t('settings.aboutApp')}>
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <h2>{t('common.appName')}</h2>
                  <p>{t('settings.version')}: 1.0.0</p>
                  <p>{t('settings.description')}</p>
                  <Divider />
                  <p>© 2026 Traffic Booster. All rights reserved.</p>
                </div>
              </Card>
            ),
          },
        ]}
      />
    </div>
  )
}

export default Settings
