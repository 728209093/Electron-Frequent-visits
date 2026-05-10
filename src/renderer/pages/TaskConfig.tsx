import React, { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Space,
  Drawer,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  message,
  Popconfirm,
  Tag,
  Card,
  Collapse,
  Divider,
  Row,
  Col,
  Tooltip,
  Modal,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, PauseCircleOutlined, QuestionCircleOutlined, AlertOutlined, EyeOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { taskAPI, projectAPI, proxyAPI, previewAPI } from '../api'
import { DEFAULT_TASK_CONFIG } from '../../shared/constants'
import PopupRuleConfig from '../components/PopupRuleConfig'

interface Task {
  id: string
  projectId: string
  name: string
  targetUrl: string
  proxyPoolId: string
  concurrency: number
  totalCount: number
  completeCount: number
  status: 'draft' | 'running' | 'paused' | 'completed' | 'failed'
  config: any
  createdAt: string
  updatedAt: string
}

interface Project {
  id: string
  name: string
}

interface ProxyPool {
  id: string
  name: string
  proxyCount: number
}

const TaskConfig: React.FC = () => {
  const { t } = useTranslation()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [proxyPools, setProxyPools] = useState<ProxyPool[]>([])
  const [loading, setLoading] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [form] = Form.useForm()

  // 预览相关状态
  const [previewModalVisible, setPreviewModalVisible] = useState(false)
  const [previewLogs, setPreviewLogs] = useState<Array<{ time: string; message: string; type: string }>>([])
  const [previewRunning, setPreviewRunning] = useState(false)
  const [previewTaskName, setPreviewTaskName] = useState('')
  const previewLogRef = React.useRef<HTMLDivElement>(null)
  const previewPollRef = React.useRef<NodeJS.Timeout | null>(null)

  // 加载数据
  useEffect(() => {
    loadTasks()
    loadProjects()
    loadProxyPools()
  }, [])

  const loadTasks = async () => {
    setLoading(true)
    try {
      const response = await taskAPI.getAll()
      setTasks(response || [])
    } catch (error) {
      message.error(t('common.loadFailed'))
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    try {
      const response = await projectAPI.getAll()
      setProjects(response || [])
    } catch (error) {
      console.error(error)
    }
  }

  const loadProxyPools = async () => {
    try {
      const response = await proxyAPI.list()
      setProxyPools(response || [])
    } catch (error) {
      console.error(error)
    }
  }

  // 打开新增/编辑抽屉
  const handleOpenDrawer = (task?: Task) => {
    if (task) {
      setEditingTask(task)
      form.setFieldsValue({
        ...task,
        config: task.config || DEFAULT_TASK_CONFIG,
      })
    } else {
      setEditingTask(null)
      form.resetFields()
      form.setFieldsValue({
        concurrency: 1,
        totalCount: 100,
        config: DEFAULT_TASK_CONFIG,
      })
    }
    setDrawerVisible(true)
  }

  // 保存任务
  const handleSaveTask = async (values: any) => {
    try {
      const taskData = {
        projectId: values.projectId,
        name: values.name,
        targetUrl: values.targetUrl,
        proxyPoolId: values.proxyPoolId || null,
        concurrency: values.concurrency,
        totalCount: values.totalCount,
        config: values.config || DEFAULT_TASK_CONFIG,
      }

      if (editingTask) {
        await taskAPI.update(editingTask.id, taskData)
        message.success(t('tasks.updated'))
      } else {
        await taskAPI.create(taskData)
        message.success(t('tasks.created'))
      }
      setDrawerVisible(false)
      loadTasks()
    } catch (error) {
      message.error(t('common.saveFailed'))
      console.error(error)
    }
  }

  // 删除任务
  const handleDeleteTask = async (id: string) => {
    try {
      await taskAPI.delete(id)
      message.success(t('tasks.deleted'))
      loadTasks()
    } catch (error) {
      message.error(t('common.deleteFailed'))
      console.error(error)
    }
  }

  // 启动任务
  const handleStartTask = async (id: string) => {
    try {
      await taskAPI.start(id)
      message.success(t('tasks.started'))
      loadTasks()
    } catch (error) {
      message.error(t('common.actionFailed'))
      console.error(error)
    }
  }

  // 暂停任务
  const handlePauseTask = async (id: string) => {
    try {
      await taskAPI.pause(id)
      message.success(t('tasks.paused'))
      loadTasks()
    } catch (error) {
      message.error(t('common.actionFailed'))
      console.error(error)
    }
  }

  // 启动预览模式
  const handleStartPreview = async (task: Task) => {
    try {
      console.log('[Preview] Starting preview for task:', task)
      
      if (!task.id) {
        message.error('任务ID不存在')
        return
      }
      
      // 先尝试停止已有的预览
      try {
        await previewAPI.stop()
        await new Promise(resolve => setTimeout(resolve, 500)) // 等待停止完成
      } catch (error) {
        // 忽略停止错误（可能没有运行中的预览）
      }
      
      setPreviewTaskName(task.name)
      setPreviewLogs([])
      setPreviewRunning(true)
      setPreviewModalVisible(true)

      // 启动预览
      const response = await previewAPI.start(task.id)
      console.log('[Preview] Start response:', response)

      // 开始轮询日志
      startLogPolling()
    } catch (error: any) {
      console.error('[Preview] Start error:', error)
      const errorMsg = error.response?.data?.message || error.message || '未知错误'
      message.error(`预览启动失败: ${errorMsg}`)
      setPreviewRunning(false)
      setPreviewModalVisible(false)
    }
  }

  // 停止预览
  const handleStopPreview = async () => {
    try {
      await previewAPI.stop()
      stopLogPolling()
      setPreviewRunning(false)
      message.success('预览已停止')
    } catch (error: any) {
      message.error(`停止失败: ${error.message}`)
    }
  }

  // 开始轮询日志
  const startLogPolling = () => {
    let lastLogCount = 0
    
    const poll = async () => {
      try {
        const response = await previewAPI.getLogs(lastLogCount) as any
        if (response?.logs?.length > 0) {
          setPreviewLogs(prev => [...prev, ...response.logs])
          lastLogCount = response.total
          
          // 自动滚动到底部
          setTimeout(() => {
            if (previewLogRef.current) {
              previewLogRef.current.scrollTop = previewLogRef.current.scrollHeight
            }
          }, 100)
        }
        
        // 检查状态
        if (response?.status === 'completed' || response?.status === 'error') {
          setPreviewRunning(false)
          stopLogPolling()
        }
      } catch (error) {
        console.error('Poll logs error:', error)
      }
    }

    // 立即执行一次
    poll()
    
    // 每500ms轮询一次
    previewPollRef.current = setInterval(poll, 500)
  }

  // 停止轮询
  const stopLogPolling = () => {
    if (previewPollRef.current) {
      clearInterval(previewPollRef.current)
      previewPollRef.current = null
    }
  }

  // 关闭预览弹窗时清理
  const handleClosePreviewModal = () => {
    stopLogPolling()
    if (previewRunning) {
      handleStopPreview()
    }
    setPreviewModalVisible(false)
  }

  // 获取日志颜色
  const getLogColor = (type: string) => {
    switch (type) {
      case 'success': return '#52c41a'
      case 'error': return '#ff4d4f'
      case 'action': return '#1890ff'
      default: return '#666'
    }
  }

  // 表格列定义
  const columns = [
    {
      title: t('tasks.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('tasks.targetUrl'),
      dataIndex: 'targetUrl',
      key: 'targetUrl',
      ellipsis: true,
      width: 200,
    },
    {
      title: t('tasks.totalCount'),
      dataIndex: 'totalCount',
      key: 'totalCount',
      align: 'center' as const,
      render: (_: any, record: Task) => `${record.completeCount || 0}/${record.totalCount}`,
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: { [key: string]: string } = {
          draft: 'default',
          running: 'green',
          paused: 'orange',
          completed: 'blue',
          failed: 'red',
        }
        return <Tag color={colors[status]}>{t(`common.${status}`)}</Tag>
      },
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 280,
      render: (_: any, record: Task) => (
        <Space size="small" wrap>
          <Tooltip title="预览模式 - 可视化查看执行过程">
            <Button
              type="default"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleStartPreview(record)}
              style={{ color: '#722ed1', borderColor: '#722ed1' }}
            >
              预览
            </Button>
          </Tooltip>
          {(record.status === 'draft' || record.status === 'paused') && (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStartTask(record.id)}
            >
              {t('common.start')}
            </Button>
          )}
          {record.status === 'running' && (
            <Button
              type="default"
              size="small"
              icon={<PauseCircleOutlined />}
              onClick={() => handlePauseTask(record.id)}
            >
              {t('common.pause')}
            </Button>
          )}
          <Button
            type="default"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenDrawer(record)}
          >
            {t('common.edit')}
          </Button>
          <Popconfirm
            title={t('common.deleteConfirm')}
            onConfirm={() => handleDeleteTask(record.id)}
            okText={t('common.yes')}
            cancelText={t('common.no')}
          >
            <Button danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // 行为模拟配置表单项
  const behaviorFormItems = (
    <>
      <Divider orientation="left">
        <Space>
          <AlertOutlined />
          弹窗处理设置
        </Space>
      </Divider>
      
      <Form.Item name={['config', 'behavior', 'popup']}>
        <PopupRuleConfig />
      </Form.Item>

      <Divider orientation="left">页面停留设置</Divider>
      
      <Form.Item label={t('tasks.stayDuration')}>
        <Input.Group compact>
          <Form.Item name={['config', 'behavior', 'stayDuration', 0]} noStyle>
            <InputNumber min={1000} max={300000} placeholder="最小(ms)" style={{ width: '45%' }} />
          </Form.Item>
          <Input
            style={{ width: '10%', borderLeft: 0, textAlign: 'center' }}
            placeholder="~"
            disabled
          />
          <Form.Item name={['config', 'behavior', 'stayDuration', 1]} noStyle>
            <InputNumber min={1000} max={300000} placeholder="最大(ms)" style={{ width: '45%', borderLeft: 0 }} />
          </Form.Item>
        </Input.Group>
      </Form.Item>

      <Divider orientation="left">
        滚动设置
        <Form.Item name={['config', 'behavior', 'scroll', 'enabled']} valuePropName="checked" noStyle style={{ marginLeft: 10 }}>
          <Switch size="small" />
        </Form.Item>
      </Divider>

      <Form.Item shouldUpdate={(prev, curr) => prev?.config?.behavior?.scroll?.enabled !== curr?.config?.behavior?.scroll?.enabled}>
        {({ getFieldValue }) => {
          const enabled = getFieldValue(['config', 'behavior', 'scroll', 'enabled'])
          if (!enabled) return null
          return (
            <>
              <Form.Item label={t('tasks.scrollDirection')} name={['config', 'behavior', 'scroll', 'direction']}>
                <Select>
                  <Select.Option value="down">向下滚动</Select.Option>
                  <Select.Option value="up">向上滚动</Select.Option>
                  <Select.Option value="both">双向滚动</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item label={t('tasks.scrollCount')}>
                <Input.Group compact>
                  <Form.Item name={['config', 'behavior', 'scroll', 'scrollCount', 0]} noStyle>
                    <InputNumber min={1} max={50} placeholder="最小" style={{ width: '45%' }} />
                  </Form.Item>
                  <Input style={{ width: '10%', borderLeft: 0, textAlign: 'center' }} placeholder="~" disabled />
                  <Form.Item name={['config', 'behavior', 'scroll', 'scrollCount', 1]} noStyle>
                    <InputNumber min={1} max={50} placeholder="最大" style={{ width: '45%', borderLeft: 0 }} />
                  </Form.Item>
                </Input.Group>
              </Form.Item>

              <Form.Item label={t('tasks.scrollDistance')}>
                <Input.Group compact>
                  <Form.Item name={['config', 'behavior', 'scroll', 'scrollDistance', 0]} noStyle>
                    <InputNumber min={50} max={2000} placeholder="最小(px)" style={{ width: '45%' }} />
                  </Form.Item>
                  <Input style={{ width: '10%', borderLeft: 0, textAlign: 'center' }} placeholder="~" disabled />
                  <Form.Item name={['config', 'behavior', 'scroll', 'scrollDistance', 1]} noStyle>
                    <InputNumber min={50} max={2000} placeholder="最大(px)" style={{ width: '45%', borderLeft: 0 }} />
                  </Form.Item>
                </Input.Group>
              </Form.Item>

              <Form.Item label={t('tasks.scrollInterval')}>
                <Input.Group compact>
                  <Form.Item name={['config', 'behavior', 'scroll', 'scrollInterval', 0]} noStyle>
                    <InputNumber min={100} max={10000} placeholder="最小(ms)" style={{ width: '45%' }} />
                  </Form.Item>
                  <Input style={{ width: '10%', borderLeft: 0, textAlign: 'center' }} placeholder="~" disabled />
                  <Form.Item name={['config', 'behavior', 'scroll', 'scrollInterval', 1]} noStyle>
                    <InputNumber min={100} max={10000} placeholder="最大(ms)" style={{ width: '45%', borderLeft: 0 }} />
                  </Form.Item>
                </Input.Group>
              </Form.Item>

              <Form.Item name={['config', 'behavior', 'scroll', 'pauseAtBottom']} valuePropName="checked">
                <Checkbox>到达页面底部时暂停</Checkbox>
              </Form.Item>

              <Form.Item shouldUpdate={(prev, curr) => prev?.config?.behavior?.scroll?.pauseAtBottom !== curr?.config?.behavior?.scroll?.pauseAtBottom}>
                {({ getFieldValue }) => {
                  const pauseAtBottom = getFieldValue(['config', 'behavior', 'scroll', 'pauseAtBottom'])
                  if (!pauseAtBottom) return null
                  return (
                    <Form.Item label={t('tasks.bottomPauseDuration')}>
                      <Input.Group compact>
                        <Form.Item name={['config', 'behavior', 'scroll', 'bottomPauseDuration', 0]} noStyle>
                          <InputNumber min={500} max={30000} placeholder="最小(ms)" style={{ width: '45%' }} />
                        </Form.Item>
                        <Input style={{ width: '10%', borderLeft: 0, textAlign: 'center' }} placeholder="~" disabled />
                        <Form.Item name={['config', 'behavior', 'scroll', 'bottomPauseDuration', 1]} noStyle>
                          <InputNumber min={500} max={30000} placeholder="最大(ms)" style={{ width: '45%', borderLeft: 0 }} />
                        </Form.Item>
                      </Input.Group>
                    </Form.Item>
                  )
                }}
              </Form.Item>
            </>
          )
        }}
      </Form.Item>

      <Divider orientation="left">
        点击设置
        <Form.Item name={['config', 'behavior', 'click', 'enabled']} valuePropName="checked" noStyle style={{ marginLeft: 10 }}>
          <Switch size="small" />
        </Form.Item>
      </Divider>

      <Form.Item shouldUpdate={(prev, curr) => prev?.config?.behavior?.click?.enabled !== curr?.config?.behavior?.click?.enabled}>
        {({ getFieldValue }) => {
          const enabled = getFieldValue(['config', 'behavior', 'click', 'enabled'])
          if (!enabled) return null
          return (
            <>
              <Form.Item 
                label={
                  <span>
                    点击选择器 &nbsp;
                    <Tooltip title="CSS选择器，如: a.read-more, button.next-page">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </span>
                }
                name={['config', 'behavior', 'click', 'selectors']}
              >
                <Select
                  mode="tags"
                  placeholder="输入CSS选择器，按回车添加"
                  tokenSeparators={[',']}
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label={t('tasks.clickProbability')} name={['config', 'behavior', 'click', 'clickProbability']}>
                    <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={t('tasks.maxClicks')} name={['config', 'behavior', 'click', 'maxClicks']}>
                    <InputNumber min={1} max={20} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name={['config', 'behavior', 'click', 'moveBeforeClick']} valuePropName="checked">
                <Checkbox>点击前移动鼠标到元素位置</Checkbox>
              </Form.Item>
            </>
          )
        }}
      </Form.Item>

      <Divider orientation="left">
        鼠标移动
        <Form.Item name={['config', 'behavior', 'mouseMove', 'enabled']} valuePropName="checked" noStyle style={{ marginLeft: 10 }}>
          <Switch size="small" />
        </Form.Item>
      </Divider>

      <Form.Item shouldUpdate={(prev, curr) => prev?.config?.behavior?.mouseMove?.enabled !== curr?.config?.behavior?.mouseMove?.enabled}>
        {({ getFieldValue }) => {
          const enabled = getFieldValue(['config', 'behavior', 'mouseMove', 'enabled'])
          if (!enabled) return null
          return (
            <>
              <Form.Item label={t('tasks.movePoints')}>
                <Input.Group compact>
                  <Form.Item name={['config', 'behavior', 'mouseMove', 'movePoints', 0]} noStyle>
                    <InputNumber min={5} max={100} placeholder="最小" style={{ width: '45%' }} />
                  </Form.Item>
                  <Input style={{ width: '10%', borderLeft: 0, textAlign: 'center' }} placeholder="~" disabled />
                  <Form.Item name={['config', 'behavior', 'mouseMove', 'movePoints', 1]} noStyle>
                    <InputNumber min={5} max={100} placeholder="最大" style={{ width: '45%', borderLeft: 0 }} />
                  </Form.Item>
                </Input.Group>
              </Form.Item>

              <Form.Item name={['config', 'behavior', 'mouseMove', 'randomCurve']} valuePropName="checked">
                <Checkbox>随机弯曲轨迹（更接近人类行为）</Checkbox>
              </Form.Item>
            </>
          )
        }}
      </Form.Item>

      <Divider orientation="left">
        输入模拟
        <Form.Item name={['config', 'behavior', 'input', 'enabled']} valuePropName="checked" noStyle style={{ marginLeft: 10 }}>
          <Switch size="small" />
        </Form.Item>
      </Divider>

      <Form.Item shouldUpdate={(prev, curr) => prev?.config?.behavior?.input?.enabled !== curr?.config?.behavior?.input?.enabled}>
        {({ getFieldValue }) => {
          const enabled = getFieldValue(['config', 'behavior', 'input', 'enabled'])
          if (!enabled) return null
          return (
            <>
              <Form.Item 
                label={
                  <span>
                    输入框选择器 &nbsp;
                    <Tooltip title="CSS选择器，如: input.search, #search-box">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </span>
                }
                name={['config', 'behavior', 'input', 'selectors']}
              >
                <Select
                  mode="tags"
                  placeholder="输入CSS选择器，按回车添加"
                  tokenSeparators={[',']}
                />
              </Form.Item>

              <Form.Item 
                label={
                  <span>
                    预设文本 &nbsp;
                    <Tooltip title="随机选择一个文本输入">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </span>
                }
                name={['config', 'behavior', 'input', 'presetTexts']}
              >
                <Select
                  mode="tags"
                  placeholder="输入文本，按回车添加"
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label={t('tasks.typingSpeed')}>
                    <Input.Group compact>
                      <Form.Item name={['config', 'behavior', 'input', 'typingSpeed', 0]} noStyle>
                        <InputNumber min={10} max={500} placeholder="最小" style={{ width: '50%' }} />
                      </Form.Item>
                      <Form.Item name={['config', 'behavior', 'input', 'typingSpeed', 1]} noStyle>
                        <InputNumber min={10} max={500} placeholder="最大" style={{ width: '50%', borderLeft: 0 }} />
                      </Form.Item>
                    </Input.Group>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={t('tasks.inputProbability')} name={['config', 'behavior', 'input', 'inputProbability']}>
                    <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )
        }}
      </Form.Item>

      <Divider orientation="left">其他设置</Divider>

      <Form.Item name={['config', 'behavior', 'randomOrder']} valuePropName="checked">
        <Checkbox>随机执行顺序（让每次访问行为不同）</Checkbox>
      </Form.Item>
    </>
  )

  return (
    <div style={{ padding: '20px' }}>
      <Card title={t('tasks.title')}>
        <div style={{ marginBottom: '16px' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenDrawer()}
          >
            {t('tasks.create')}
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={tasks}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 新增/编辑抽屉 */}
      <Drawer
        title={editingTask ? t('tasks.edit') : t('tasks.create')}
        placement="right"
        width={640}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveTask}
          initialValues={{
            concurrency: 1,
            totalCount: 100,
            config: DEFAULT_TASK_CONFIG,
          }}
        >
          <Divider orientation="left">基本信息</Divider>

          <Form.Item
            label={t('tasks.name')}
            name="name"
            rules={[{ required: true, message: t('tasks.nameRequired') }]}
          >
            <Input placeholder={t('tasks.namePlaceholder')} />
          </Form.Item>

          <Form.Item
            label={t('projects.title')}
            name="projectId"
            rules={[{ required: true, message: t('tasks.projectRequired') }]}
          >
            <Select placeholder={t('tasks.projectRequired')}>
              {projects.map(p => (
                <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label={t('tasks.targetUrl')}
            name="targetUrl"
            rules={[{ required: true, message: '请输入目标URL' }]}
          >
            <Input placeholder="https://example.com" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={t('tasks.totalCount')}
                name="totalCount"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={100000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={t('tasks.concurrency')} name="concurrency">
                <InputNumber min={1} max={50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label={t('tasks.proxyPool')} name="proxyPoolId">
            <Select placeholder="选择代理池（可选）" allowClear>
              {proxyPools.map(p => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name} ({p.proxyCount} 个代理)
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Divider orientation="left">请求设置</Divider>

          <Form.Item label={t('tasks.delayRange')}>
            <Input.Group compact>
              <Form.Item name={['config', 'delayRange', 0]} noStyle>
                <InputNumber min={0} max={60000} placeholder="最小(ms)" style={{ width: '45%' }} />
              </Form.Item>
              <Input style={{ width: '10%', borderLeft: 0, textAlign: 'center' }} placeholder="~" disabled />
              <Form.Item name={['config', 'delayRange', 1]} noStyle>
                <InputNumber min={0} max={60000} placeholder="最大(ms)" style={{ width: '45%', borderLeft: 0 }} />
              </Form.Item>
            </Input.Group>
          </Form.Item>

          <Form.Item label={t('tasks.userAgentStrategy')} name={['config', 'userAgentStrategy']}>
            <Select>
              <Select.Option value="random">随机选择</Select.Option>
              <Select.Option value="rotate">轮换</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name={['config', 'useHeadless']} valuePropName="checked" label="无头模式">
            <Switch />
            <span style={{ marginLeft: 8, color: '#888' }}>开启后不显示浏览器窗口</span>
          </Form.Item>

          {behaviorFormItems}

          <Form.Item style={{ marginTop: '24px' }}>
            <Space>
              <Button type="primary" htmlType="submit">
                {t('common.save')}
              </Button>
              <Button onClick={() => setDrawerVisible(false)}>
                {t('common.cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>

      {/* 预览模式弹窗 */}
      <Modal
        title={
          <Space>
            <EyeOutlined style={{ color: '#722ed1' }} />
            <span>预览模式 - {previewTaskName}</span>
            {previewRunning && <Tag color="processing">运行中</Tag>}
          </Space>
        }
        open={previewModalVisible}
        onCancel={handleClosePreviewModal}
        width={700}
        footer={[
          <Button key="stop" danger onClick={handleStopPreview} disabled={!previewRunning}>
            停止预览
          </Button>,
          <Button key="close" onClick={handleClosePreviewModal}>
            关闭
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <Tag color="purple">💡 提示：浏览器窗口会在屏幕右侧打开，您可以实时观察操作过程</Tag>
        </div>
        
        <div
          ref={previewLogRef}
          style={{
            height: 400,
            overflow: 'auto',
            background: '#1e1e1e',
            borderRadius: 8,
            padding: 16,
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: 13,
          }}
        >
          {previewLogs.length === 0 ? (
            <div style={{ color: '#666', textAlign: 'center', paddingTop: 150 }}>
              {previewRunning ? '等待日志...' : '暂无日志'}
            </div>
          ) : (
            previewLogs.map((log, index) => (
              <div
                key={index}
                style={{
                  marginBottom: 6,
                  lineHeight: 1.6,
                }}
              >
                <span style={{ color: '#888', marginRight: 8 }}>[{log.time}]</span>
                <span style={{ color: getLogColor(log.type) }}>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  )
}

// Checkbox 组件
const Checkbox: React.FC<{ children: React.ReactNode; checked?: boolean; onChange?: (e: any) => void }> = ({ children, checked, onChange }) => {
  return (
    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ marginRight: 8 }} />
      {children}
    </label>
  )
}

export default TaskConfig
