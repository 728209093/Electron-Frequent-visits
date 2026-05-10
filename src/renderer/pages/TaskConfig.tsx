import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  message,
} from 'antd'
import {
  AlertOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  PauseCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { analyticsAPI, previewAPI, projectAPI, proxyAPI, taskAPI } from '../api'
import { DEFAULT_TASK_CONFIG, mergeTaskConfig, sanitizeTargetUrl } from '../../shared/constants'

interface Task {
  id: string
  projectId: string
  name: string
  targetUrl: string
  proxyPoolId: string | null
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

interface ExecutionRecord {
  id: string
  taskId: string
  startTime: number
  endTime?: number | null
  status: 'running' | 'completed' | 'stopped' | 'failed'
  successCount: number
  failureCount: number
  totalRequests: number
  averageResponseTime?: number | null
}

interface ExecutionLog {
  id: string
  timestamp: number
  ipUsed?: string | null
  statusCode?: number | null
  responseTime?: number | null
  success: boolean
  errorMsg?: string | null
}

interface FormValues {
  projectId: string
  name: string
  targetUrl: string
  proxyPoolId?: string | null
  concurrency: number
  totalCount: number
  showBrowserWindow: boolean
  config: any
}

const STATUS_TEXT: Record<Task['status'], string> = {
  draft: '草稿',
  running: '运行中',
  paused: '已暂停',
  completed: '已完成',
  failed: '失败',
}

const STATUS_COLOR: Record<Task['status'], string> = {
  draft: 'default',
  running: 'processing',
  paused: 'orange',
  completed: 'success',
  failed: 'error',
}

const EXECUTION_STATUS_TEXT: Record<ExecutionRecord['status'], string> = {
  running: '运行中',
  completed: '已完成',
  stopped: '已停止',
  failed: '失败',
}

const TaskConfig: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [proxyPools, setProxyPools] = useState<ProxyPool[]>([])
  const [loading, setLoading] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [previewModalVisible, setPreviewModalVisible] = useState(false)
  const [previewLogs, setPreviewLogs] = useState<Array<{ time: string; message: string; type: string }>>([])
  const [previewRunning, setPreviewRunning] = useState(false)
  const [previewTaskName, setPreviewTaskName] = useState('')
  const [taskLogsVisible, setTaskLogsVisible] = useState(false)
  const [selectedTaskForLogs, setSelectedTaskForLogs] = useState<Task | null>(null)
  const [selectedExecution, setSelectedExecution] = useState<ExecutionRecord | null>(null)
  const [taskLogs, setTaskLogs] = useState<ExecutionLog[]>([])
  const previewLogRef = useRef<HTMLDivElement>(null)
  const previewPollRef = useRef<NodeJS.Timeout | null>(null)
  const taskLogPollRef = useRef<NodeJS.Timeout | null>(null)
  const [form] = Form.useForm<FormValues>()

  useEffect(() => {
    loadTasks()
    loadProjects()
    loadProxyPools()

    const interval = setInterval(() => {
      loadTasks(false)
    }, 3000)

    return () => {
      clearInterval(interval)
      stopPreviewLogPolling()
      stopTaskLogPolling()
    }
  }, [])

  const loadTasks = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
    }

    try {
      const response = await taskAPI.getAll()
      setTasks(response || [])
    } catch (error) {
      console.error(error)
      if (showLoading) {
        message.error('加载任务失败')
      }
    } finally {
      if (showLoading) {
        setLoading(false)
      }
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

  const buildInitialFormValues = (task?: Task): FormValues => {
    const config = mergeTaskConfig(task?.config)

    return {
      projectId: task?.projectId || '',
      name: task?.name || '',
      targetUrl: sanitizeTargetUrl(task?.targetUrl),
      proxyPoolId: task?.proxyPoolId || null,
      concurrency: task?.concurrency || 1,
      totalCount: task?.totalCount || 100,
      showBrowserWindow: !config.useHeadless,
      config,
    }
  }

  const handleOpenDrawer = (task?: Task) => {
    setEditingTask(task || null)
    form.resetFields()
    form.setFieldsValue(buildInitialFormValues(task))
    setDrawerVisible(true)
  }

  const handleSaveTask = async (values: FormValues) => {
    try {
      const mergedConfig = mergeTaskConfig(values.config)
      const taskData = {
        projectId: values.projectId,
        name: values.name.trim(),
        targetUrl: sanitizeTargetUrl(values.targetUrl),
        proxyPoolId: values.proxyPoolId || null,
        concurrency: values.concurrency,
        totalCount: values.totalCount,
        config: {
          ...mergedConfig,
          useHeadless: !values.showBrowserWindow,
        },
      }

      if (editingTask) {
        await taskAPI.update(editingTask.id, taskData)
        message.success('任务已更新')
      } else {
        await taskAPI.create(taskData)
        message.success('任务已创建')
      }

      setDrawerVisible(false)
      await loadTasks()
    } catch (error: any) {
      console.error(error)
      message.error(error?.response?.data?.message || '保存任务失败')
    }
  }

  const handleDeleteTask = async (id: string) => {
    try {
      await taskAPI.delete(id)
      message.success('任务已删除')
      await loadTasks()
    } catch (error) {
      console.error(error)
      message.error('删除任务失败')
    }
  }

  const handleStartTask = async (id: string) => {
    try {
      await taskAPI.start(id)
      message.success('任务已启动')
      await loadTasks()
    } catch (error: any) {
      console.error(error)
      message.error(error?.response?.data?.message || '启动任务失败')
    }
  }

  const handlePauseTask = async (id: string) => {
    try {
      await taskAPI.pause(id)
      message.success('任务已暂停')
      await loadTasks()
    } catch (error: any) {
      console.error(error)
      message.error(error?.response?.data?.message || '暂停任务失败')
    }
  }

  const handleStartPreview = async (task: Task) => {
    try {
      await previewAPI.stop().catch(() => undefined)
      await new Promise((resolve) => setTimeout(resolve, 300))

      setPreviewTaskName(task.name)
      setPreviewLogs([])
      setPreviewRunning(true)
      setPreviewModalVisible(true)

      await previewAPI.start(task.id)
      startPreviewLogPolling()
    } catch (error: any) {
      console.error(error)
      message.error(error?.response?.data?.message || error?.message || '启动预览失败')
      setPreviewRunning(false)
      setPreviewModalVisible(false)
    }
  }

  const handleStopPreview = async () => {
    try {
      await previewAPI.stop()
      stopPreviewLogPolling()
      setPreviewRunning(false)
      message.success('预览已停止')
    } catch (error: any) {
      console.error(error)
      message.error(error?.response?.data?.message || error?.message || '停止预览失败')
    }
  }

  const startPreviewLogPolling = () => {
    stopPreviewLogPolling()
    let lastLogCount = 0

    const poll = async () => {
      try {
        const response = await previewAPI.getLogs(lastLogCount) as any
        if (response?.logs?.length) {
          setPreviewLogs((prev) => [...prev, ...response.logs])
          lastLogCount = response.total
          setTimeout(() => {
            if (previewLogRef.current) {
              previewLogRef.current.scrollTop = previewLogRef.current.scrollHeight
            }
          }, 50)
        }

        if (response?.status === 'completed' || response?.status === 'error') {
          setPreviewRunning(false)
          stopPreviewLogPolling()
        }
      } catch (error) {
        console.error('Poll preview logs error:', error)
      }
    }

    poll()
    previewPollRef.current = setInterval(poll, 500)
  }

  const stopPreviewLogPolling = () => {
    if (previewPollRef.current) {
      clearInterval(previewPollRef.current)
      previewPollRef.current = null
    }
  }

  const handleClosePreviewModal = () => {
    stopPreviewLogPolling()
    if (previewRunning) {
      handleStopPreview()
    }
    setPreviewModalVisible(false)
  }

  const loadTaskExecutionDetails = async (taskId: string) => {
    const executions = await analyticsAPI.executions(taskId, 1, 0) as ExecutionRecord[]
    const latestExecution = executions?.[0] || null
    setSelectedExecution(latestExecution)

    if (!latestExecution) {
      setTaskLogs([])
      return
    }

    const logs = await analyticsAPI.executionLogs(latestExecution.id, 20, 0) as ExecutionLog[]
    setTaskLogs(logs || [])
  }

  const handleOpenTaskLogs = async (task: Task) => {
    setSelectedTaskForLogs(task)
    setTaskLogsVisible(true)
    await loadTaskExecutionDetails(task.id)
  }

  const stopTaskLogPolling = () => {
    if (taskLogPollRef.current) {
      clearInterval(taskLogPollRef.current)
      taskLogPollRef.current = null
    }
  }

  const handleCloseTaskLogs = () => {
    stopTaskLogPolling()
    setTaskLogsVisible(false)
    setSelectedTaskForLogs(null)
    setSelectedExecution(null)
    setTaskLogs([])
  }

  useEffect(() => {
    if (!taskLogsVisible || !selectedTaskForLogs) {
      stopTaskLogPolling()
      return
    }

    const poll = async () => {
      await loadTaskExecutionDetails(selectedTaskForLogs.id)
      await loadTasks(false)
    }

    poll()
    taskLogPollRef.current = setInterval(poll, 3000)

    return () => {
      stopTaskLogPolling()
    }
  }, [taskLogsVisible, selectedTaskForLogs?.id])

  const getLogColor = (type: string) => {
    switch (type) {
      case 'success':
        return '#52c41a'
      case 'error':
        return '#ff4d4f'
      case 'action':
        return '#1890ff'
      default:
        return '#d9d9d9'
    }
  }

  const renderRangeInput = (
    namePrefix: (string | number)[],
    options: {
      min: number
      max: number
      placeholderMin: string
      placeholderMax: string
    }
  ) => (
    <Space.Compact style={{ width: '100%' }}>
      <Form.Item name={[...namePrefix, 0]} noStyle>
        <InputNumber
          min={options.min}
          max={options.max}
          placeholder={options.placeholderMin}
          style={{ width: 'calc(50% - 16px)' }}
        />
      </Form.Item>
      <div
        style={{
          width: 32,
          lineHeight: '32px',
          textAlign: 'center',
          border: '1px solid #d9d9d9',
          borderLeft: 0,
          borderRight: 0,
          background: '#fafafa',
        }}
      >
        ~
      </div>
      <Form.Item name={[...namePrefix, 1]} noStyle>
        <InputNumber
          min={options.min}
          max={options.max}
          placeholder={options.placeholderMax}
          style={{ width: 'calc(50% - 16px)' }}
        />
      </Form.Item>
    </Space.Compact>
  )

  const behaviorFormItems = (
    <>
      <Divider orientation="left">页面停留设置</Divider>

      <Form.Item label="停留时长">
        {renderRangeInput(['config', 'behavior', 'stayDuration'], {
          min: 1000,
          max: 300000,
          placeholderMin: '最小值 (ms)',
          placeholderMax: '最大值 (ms)',
        })}
      </Form.Item>

      <Divider orientation="left">
        <Space>
          <span>滚动设置</span>
          <Form.Item name={['config', 'behavior', 'scroll', 'enabled']} valuePropName="checked" noStyle>
            <Switch size="small" />
          </Form.Item>
        </Space>
      </Divider>

      <Form.Item
        noStyle
        shouldUpdate={(prev, curr) => prev?.config?.behavior?.scroll?.enabled !== curr?.config?.behavior?.scroll?.enabled}
      >
        {({ getFieldValue }) => {
          if (!getFieldValue(['config', 'behavior', 'scroll', 'enabled'])) {
            return null
          }

          return (
            <>
              <Form.Item label="滚动方向" name={['config', 'behavior', 'scroll', 'direction']}>
                <Select
                  options={[
                    { value: 'down', label: '向下滚动' },
                    { value: 'up', label: '向上滚动' },
                    { value: 'both', label: '双向滚动' },
                  ]}
                />
              </Form.Item>

              <Form.Item label="滚动次数">
                {renderRangeInput(['config', 'behavior', 'scroll', 'scrollCount'], {
                  min: 1,
                  max: 50,
                  placeholderMin: '最小值',
                  placeholderMax: '最大值',
                })}
              </Form.Item>

              <Form.Item label="每次滚动距离">
                {renderRangeInput(['config', 'behavior', 'scroll', 'scrollDistance'], {
                  min: 50,
                  max: 2000,
                  placeholderMin: '最小值 (px)',
                  placeholderMax: '最大值 (px)',
                })}
              </Form.Item>

              <Form.Item label="滚动间隔">
                {renderRangeInput(['config', 'behavior', 'scroll', 'scrollInterval'], {
                  min: 100,
                  max: 10000,
                  placeholderMin: '最小值 (ms)',
                  placeholderMax: '最大值 (ms)',
                })}
              </Form.Item>

              <Form.Item name={['config', 'behavior', 'scroll', 'pauseAtBottom']} valuePropName="checked">
                <Checkbox>滚动到底部后暂停</Checkbox>
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prev, curr) =>
                  prev?.config?.behavior?.scroll?.pauseAtBottom !== curr?.config?.behavior?.scroll?.pauseAtBottom
                }
              >
                {({ getFieldValue }) => {
                  if (!getFieldValue(['config', 'behavior', 'scroll', 'pauseAtBottom'])) {
                    return null
                  }

                  return (
                    <Form.Item label="底部停留时长">
                      {renderRangeInput(['config', 'behavior', 'scroll', 'bottomPauseDuration'], {
                        min: 500,
                        max: 30000,
                        placeholderMin: '最小值 (ms)',
                        placeholderMax: '最大值 (ms)',
                      })}
                    </Form.Item>
                  )
                }}
              </Form.Item>
            </>
          )
        }}
      </Form.Item>

      <Divider orientation="left">
        <Space>
          <span>点击设置</span>
          <Form.Item name={['config', 'behavior', 'click', 'enabled']} valuePropName="checked" noStyle>
            <Switch size="small" />
          </Form.Item>
        </Space>
      </Divider>

      <Form.Item
        noStyle
        shouldUpdate={(prev, curr) => prev?.config?.behavior?.click?.enabled !== curr?.config?.behavior?.click?.enabled}
      >
        {({ getFieldValue }) => {
          if (!getFieldValue(['config', 'behavior', 'click', 'enabled'])) {
            return null
          }

          return (
            <>
              <Form.Item
                label={(
                  <Space size={4}>
                    <span>点击选择器</span>
                    <Tooltip title="填写 CSS 选择器，例如 a.read-more 或 button.next-page">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                )}
                name={['config', 'behavior', 'click', 'selectors']}
              >
                <Select mode="tags" placeholder="输入 CSS 选择器后回车" tokenSeparators={[',']} />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="点击概率" name={['config', 'behavior', 'click', 'clickProbability']}>
                    <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="最大点击次数" name={['config', 'behavior', 'click', 'maxClicks']}>
                    <InputNumber min={1} max={20} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name={['config', 'behavior', 'click', 'moveBeforeClick']} valuePropName="checked">
                <Checkbox>点击前先将鼠标移动到目标元素</Checkbox>
              </Form.Item>
            </>
          )
        }}
      </Form.Item>

      <Divider orientation="left">
        <Space>
          <span>鼠标移动</span>
          <Form.Item name={['config', 'behavior', 'mouseMove', 'enabled']} valuePropName="checked" noStyle>
            <Switch size="small" />
          </Form.Item>
        </Space>
      </Divider>

      <Form.Item
        noStyle
        shouldUpdate={(prev, curr) =>
          prev?.config?.behavior?.mouseMove?.enabled !== curr?.config?.behavior?.mouseMove?.enabled
        }
      >
        {({ getFieldValue }) => {
          if (!getFieldValue(['config', 'behavior', 'mouseMove', 'enabled'])) {
            return null
          }

          return (
            <>
              <Form.Item label="轨迹点数量">
                {renderRangeInput(['config', 'behavior', 'mouseMove', 'movePoints'], {
                  min: 5,
                  max: 100,
                  placeholderMin: '最小值',
                  placeholderMax: '最大值',
                })}
              </Form.Item>

              <Form.Item name={['config', 'behavior', 'mouseMove', 'randomCurve']} valuePropName="checked">
                <Checkbox>使用随机曲线轨迹</Checkbox>
              </Form.Item>
            </>
          )
        }}
      </Form.Item>

      <Divider orientation="left">
        <Space>
          <span>输入模拟</span>
          <Form.Item name={['config', 'behavior', 'input', 'enabled']} valuePropName="checked" noStyle>
            <Switch size="small" />
          </Form.Item>
        </Space>
      </Divider>

      <Form.Item
        noStyle
        shouldUpdate={(prev, curr) => prev?.config?.behavior?.input?.enabled !== curr?.config?.behavior?.input?.enabled}
      >
        {({ getFieldValue }) => {
          if (!getFieldValue(['config', 'behavior', 'input', 'enabled'])) {
            return null
          }

          return (
            <>
              <Form.Item
                label={(
                  <Space size={4}>
                    <span>输入框选择器</span>
                    <Tooltip title="填写 CSS 选择器，例如 input.search 或 #search-box">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                )}
                name={['config', 'behavior', 'input', 'selectors']}
              >
                <Select mode="tags" placeholder="输入 CSS 选择器后回车" tokenSeparators={[',']} />
              </Form.Item>

              <Form.Item
                label={(
                  <Space size={4}>
                    <span>预设文本</span>
                    <Tooltip title="运行时会从这里随机选一条文本输入">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                )}
                name={['config', 'behavior', 'input', 'presetTexts']}
              >
                <Select mode="tags" placeholder="输入文本后回车" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="输入速度">
                    {renderRangeInput(['config', 'behavior', 'input', 'typingSpeed'], {
                      min: 10,
                      max: 500,
                      placeholderMin: '最小值',
                      placeholderMax: '最大值',
                    })}
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="输入概率" name={['config', 'behavior', 'input', 'inputProbability']}>
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
        <Checkbox>随机执行行为顺序</Checkbox>
      </Form.Item>
    </>
  )

  const columns = useMemo(
    () => [
      {
        title: '任务名称',
        dataIndex: 'name',
        key: 'name',
      },
      {
        title: '目标 URL',
        dataIndex: 'targetUrl',
        key: 'targetUrl',
        ellipsis: true,
        width: 240,
        render: (value: string) => sanitizeTargetUrl(value),
      },
      {
        title: '完成数',
        dataIndex: 'totalCount',
        key: 'totalCount',
        align: 'center' as const,
        render: (_: unknown, record: Task) => `${record.completeCount || 0}/${record.totalCount}`,
      },
      {
        title: '进度',
        key: 'progress',
        width: 180,
        render: (_: unknown, record: Task) => {
          const percent = record.totalCount > 0
            ? Math.min(100, Math.round(((record.completeCount || 0) / record.totalCount) * 100))
            : 0

          return (
            <Progress
              percent={percent}
              size="small"
              status={
                record.status === 'failed'
                  ? 'exception'
                  : record.status === 'completed'
                    ? 'success'
                    : 'active'
              }
            />
          )
        },
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (status: Task['status']) => <Tag color={STATUS_COLOR[status]}>{STATUS_TEXT[status]}</Tag>,
      },
      {
        title: '操作',
        key: 'actions',
        width: 320,
        render: (_: unknown, record: Task) => (
          <Space size="small" wrap>
            <Tooltip title="预览模式会显示浏览器窗口，并按正式任务流程执行">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleStartPreview(record)}
                style={{ color: '#1677ff', borderColor: '#1677ff' }}
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
                启动
              </Button>
            )}
            {record.status === 'running' && (
              <Button
                size="small"
                icon={<PauseCircleOutlined />}
                onClick={() => handlePauseTask(record.id)}
              >
                暂停
              </Button>
            )}
            <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenDrawer(record)}>
              编辑
            </Button>
            <Button size="small" onClick={() => handleOpenTaskLogs(record)}>
              日志
            </Button>
            <Popconfirm
              title="确定删除这个任务吗？"
              onConfirm={() => handleDeleteTask(record.id)}
              okText="删除"
              cancelText="取消"
            >
              <Button danger size="small" icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [tasks]
  )

  const fallbackSuccessCount = taskLogs.filter((log) => Boolean(log.success)).length
  const fallbackFailureCount = taskLogs.filter((log) => !Boolean(log.success)).length
  const displayedTotalRequests = selectedExecution
    ? Math.max(selectedExecution.totalRequests || 0, taskLogs.length)
    : taskLogs.length
  const displayedSuccessCount = selectedExecution
    ? Math.max(selectedExecution.successCount || 0, fallbackSuccessCount)
    : fallbackSuccessCount
  const displayedFailureCount = selectedExecution
    ? Math.max(selectedExecution.failureCount || 0, fallbackFailureCount)
    : fallbackFailureCount

  return (
    <div style={{ padding: 20 }}>
      <Card title="任务管理">
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenDrawer()}>
            创建任务
          </Button>
        </div>

        <Table columns={columns} dataSource={tasks} loading={loading} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>

      <Drawer
        title={editingTask ? '编辑任务' : '创建任务'}
        placement="right"
        width={680}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveTask}
          initialValues={buildInitialFormValues()}
        >
          <Divider orientation="left">基本信息</Divider>

          <Form.Item label="任务名称" name="name" rules={[{ required: true, message: '请输入任务名称' }]}>
            <Input placeholder="例如：品牌首页访问任务" />
          </Form.Item>

          <Form.Item label="所属项目" name="projectId" rules={[{ required: true, message: '请选择项目' }]}>
            <Select
              placeholder="请选择项目"
              options={projects.map((project) => ({ value: project.id, label: project.name }))}
            />
          </Form.Item>

          <Form.Item
            label="目标 URL"
            name="targetUrl"
            rules={[{ required: true, message: '请输入目标 URL' }]}
            normalize={(value: string) => sanitizeTargetUrl(value)}
          >
            <Input placeholder="https://example.com" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="总访问次数" name="totalCount" rules={[{ required: true, message: '请输入总访问次数' }]}>
                <InputNumber min={1} max={100000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="并发数" name="concurrency" rules={[{ required: true, message: '请输入并发数' }]}>
                <InputNumber min={1} max={50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="代理池" name="proxyPoolId">
            <Select
              allowClear
              placeholder="可选，不使用代理可留空"
              options={proxyPools.map((pool) => ({
                value: pool.id,
                label: `${pool.name} (${pool.proxyCount} 个代理)`,
              }))}
            />
          </Form.Item>

          <Divider orientation="left">运行设置</Divider>

          <Form.Item label="请求间隔">
            {renderRangeInput(['config', 'delayRange'], {
              min: 0,
              max: 60000,
              placeholderMin: '最小值 (ms)',
              placeholderMax: '最大值 (ms)',
            })}
          </Form.Item>

          <Form.Item label="User-Agent 策略" name={['config', 'userAgentStrategy']}>
            <Select
              options={[
                { value: 'random', label: '随机' },
                { value: 'rotate', label: '轮换' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="showBrowserWindow"
            valuePropName="checked"
            label="运行时显示浏览器窗口"
            extra="开启后，正式任务会像预览一样显示浏览器操作；关闭后仍在后台运行。"
          >
            <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
          </Form.Item>

          <Divider orientation="left">
            <Space>
              <AlertOutlined />
              <span>行为模拟</span>
            </Space>
          </Divider>

          {behaviorFormItems}

          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
              <Button onClick={() => setDrawerVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>

      <Modal
        title={(
          <Space>
            <EyeOutlined style={{ color: '#1677ff' }} />
            <span>预览模式 - {previewTaskName}</span>
            {previewRunning && <Tag color="processing">运行中</Tag>}
          </Space>
        )}
        open={previewModalVisible}
        onCancel={handleClosePreviewModal}
        width={720}
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
          <Alert
            type="info"
            showIcon
            message="预览会使用和正式任务相同的自动化流程，只是固定显示浏览器窗口。"
          />
        </div>

        <div
          ref={previewLogRef}
          style={{
            height: 400,
            overflow: 'auto',
            background: '#1f1f1f',
            borderRadius: 8,
            padding: 16,
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: 13,
          }}
        >
          {previewLogs.length === 0 ? (
            <div style={{ color: '#999', textAlign: 'center', paddingTop: 150 }}>
              {previewRunning ? '等待日志输出...' : '暂无日志'}
            </div>
          ) : (
            previewLogs.map((log, index) => (
              <div key={`${log.time}-${index}`} style={{ marginBottom: 6, lineHeight: 1.6 }}>
                <span style={{ color: '#888', marginRight: 8 }}>[{log.time}]</span>
                <span style={{ color: getLogColor(log.type) }}>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal
        title={selectedTaskForLogs ? `任务日志 - ${selectedTaskForLogs.name}` : '任务日志'}
        open={taskLogsVisible}
        onCancel={handleCloseTaskLogs}
        footer={[
          <Button key="close" onClick={handleCloseTaskLogs}>
            关闭
          </Button>,
        ]}
        width={760}
      >
        <div style={{ marginBottom: 16, lineHeight: 1.8 }}>
          <div>
            <strong>目标地址：</strong>
            {selectedTaskForLogs ? sanitizeTargetUrl(selectedTaskForLogs.targetUrl) : '-'}
          </div>
          <div>
            <strong>当前状态：</strong>
            {selectedExecution ? EXECUTION_STATUS_TEXT[selectedExecution.status] : selectedTaskForLogs ? STATUS_TEXT[selectedTaskForLogs.status] : '-'}
          </div>
          <div>
            <strong>执行进度：</strong>
            {selectedTaskForLogs ? `${selectedTaskForLogs.completeCount || 0}/${selectedTaskForLogs.totalCount}` : '-'}
          </div>
          <div>
            <strong>本次执行：</strong>
            {selectedExecution
              ? `已记录 ${displayedTotalRequests} 次，成功 ${displayedSuccessCount} 次，失败 ${displayedFailureCount} 次`
              : '暂无执行记录'}
          </div>
        </div>

        <div
          style={{
            maxHeight: 420,
            overflow: 'auto',
            background: '#1f1f1f',
            borderRadius: 8,
            padding: 16,
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: 13,
          }}
        >
          {taskLogs.length === 0 ? (
            <div style={{ color: '#999', textAlign: 'center', paddingTop: 120 }}>
              暂无日志
            </div>
          ) : (
            taskLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  marginBottom: 8,
                  lineHeight: 1.6,
                  color: log.success ? '#52c41a' : '#ff7875',
                }}
              >
                <span style={{ color: '#888', marginRight: 8 }}>
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>
                <span>
                  {log.success
                    ? `访问成功，耗时 ${log.responseTime || 0}ms${log.ipUsed ? `，IP ${log.ipUsed}` : ''}`
                    : `访问失败${log.errorMsg ? `，${log.errorMsg}` : ''}`}
                </span>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  )
}

export default TaskConfig
