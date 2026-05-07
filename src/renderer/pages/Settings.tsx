import React, { useState } from 'react'
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
} from 'antd'
import { useTranslation } from 'react-i18next'

interface Settings {
  maxConcurrentTasks: number
  maxProxyPoolSize: number
  requestTimeout: number
  retryAttempts: number
  enableNotifications: boolean
  autoStartTasks: boolean
}

const Settings: React.FC = () => {
  const { t } = useTranslation()
  const [form] = Form.useForm<Settings>()
  const [settings, setSettings] = useState<Settings>({
    maxConcurrentTasks: 5,
    maxProxyPoolSize: 100,
    requestTimeout: 30000,
    retryAttempts: 3,
    enableNotifications: true,
    autoStartTasks: false,
  })
  const [loading, setLoading] = useState(false)

  const handleSaveSettings = async (values: Settings) => {
    setLoading(true)
    try {
      // 保存设置到本地存储或API
      localStorage.setItem('appSettings', JSON.stringify(values))
      setSettings(values)
      message.success(t('settings.saved'))
    } catch (error) {
      message.error(t('common.saveFailed'))
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleResetSettings = () => {
    form.resetFields()
  }

  return (
    <div style={{ padding: '20px' }}>
      <Tabs
        items={[
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
                  <Form.Item
                    label={t('settings.maxConcurrentTasks')}
                    name="maxConcurrentTasks"
                    rules={[{ required: true }]}
                  >
                    <InputNumber min={1} max={100} />
                  </Form.Item>

                  <Form.Item
                    label={t('settings.maxProxyPoolSize')}
                    name="maxProxyPoolSize"
                    rules={[{ required: true }]}
                  >
                    <InputNumber min={1} max={10000} />
                  </Form.Item>

                  <Form.Item
                    label={t('settings.requestTimeout')}
                    name="requestTimeout"
                    rules={[{ required: true }]}
                  >
                    <InputNumber min={1000} placeholder="ms" />
                  </Form.Item>

                  <Form.Item
                    label={t('settings.retryAttempts')}
                    name="retryAttempts"
                    rules={[{ required: true }]}
                  >
                    <InputNumber min={0} max={10} />
                  </Form.Item>

                  <Divider />

                  <Form.Item
                    label={t('settings.enableNotifications')}
                    name="enableNotifications"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>

                  <Form.Item
                    label={t('settings.autoStartTasks')}
                    name="autoStartTasks"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>

                  <Form.Item>
                    <Space>
                      <Button type="primary" htmlType="submit" loading={loading}>
                        {t('common.save')}
                      </Button>
                      <Button onClick={handleResetSettings}>
                        {t('common.reset')}
                      </Button>
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
                <div>
                  <h3>{t('settings.applicationInfo')}</h3>
                  <p><strong>{t('settings.version')}:</strong> 1.0.0</p>
                  <p><strong>{t('settings.electronVersion')}:</strong> 27.0.0</p>
                  <p><strong>{t('settings.nodeVersion')}:</strong> 18.0.0</p>

                  <Divider />

                  <h3>{t('settings.cache')}</h3>
                  <p>{t('settings.clearCacheDescription')}</p>
                  <Button danger>
                    {t('settings.clearCache')}
                  </Button>

                  <Divider />

                  <h3>{t('settings.logs')}</h3>
                  <p>{t('settings.logsLocation')}: {window.location.pathname}</p>
                  <Button>
                    {t('settings.openLogsFolder')}
                  </Button>
                </div>
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

                  <h3>{t('settings.features')}</h3>
                  <ul style={{ textAlign: 'left', display: 'inline-block' }}>
                    <li>{t('settings.feature1')}</li>
                    <li>{t('settings.feature2')}</li>
                    <li>{t('settings.feature3')}</li>
                    <li>{t('settings.feature4')}</li>
                  </ul>

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
