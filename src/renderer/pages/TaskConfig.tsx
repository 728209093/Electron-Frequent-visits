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
  Checkbox,
  message,
  Popconfirm,
  Tag,
  Card,
  Tabs,
  Collapse,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { taskAPI, projectAPI } from '../api'

interface Task {
  id: string
  projectId: string
  name: string
  description: string
  userAgent: string
  proxyPoolId: string
  concurrency: number
  delayBetweenRequests: number
  status: 'pending' | 'running' | 'paused' | 'completed'
  createdAt: string
  updatedAt: string
}

interface Project {
  id: string
  name: string
}

const TaskConfig: React.FC = () => {
  const { t } = useTranslation()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [form] = Form.useForm()

  // 加载数据
  useEffect(() => {
    loadTasks()
    loadProjects()
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

  // 打开新增/编辑抽屉
  const handleOpenDrawer = (task?: Task) => {
    if (task) {
      setEditingTask(task)
      form.setFieldsValue(task)
    } else {
      setEditingTask(null)
      form.resetFields()
    }
    setDrawerVisible(true)
  }

  // 保存任务
  const handleSaveTask = async (values: any) => {
    try {
      if (editingTask) {
        await taskAPI.update(editingTask.id, values)
        message.success(t('tasks.updated'))
      } else {
        await taskAPI.create(values)
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

  // 表格列定义
  const columns = [
    {
      title: t('tasks.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('projects.title'),
      dataIndex: 'projectId',
      key: 'projectId',
      render: (projectId: string) => {
        const project = projects.find(p => p.id === projectId)
        return project?.name || '-'
      },
    },
    {
      title: t('tasks.concurrency'),
      dataIndex: 'concurrency',
      key: 'concurrency',
      align: 'center' as const,
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: { [key: string]: string } = {
          pending: 'default',
          running: 'green',
          paused: 'orange',
          completed: 'blue',
        }
        return <Tag color={colors[status]}>{t(`common.${status}`)}</Tag>
      },
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 200,
      render: (_, record: Task) => (
        <Space size="small" wrap>
          {record.status === 'pending' && (
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
            description={t('tasks.deleteConfirmMessage')}
            onConfirm={() => handleDeleteTask(record.id)}
            okText={t('common.yes')}
            cancelText={t('common.no')}
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              {t('common.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

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
        width={500}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveTask}
        >
          <Form.Item
            label={t('tasks.name')}
            name="name"
            rules={[{ required: true, message: t('tasks.nameRequired') }]}
          >
            <Input placeholder={t('tasks.nameRequired')} />
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
            label={t('tasks.description')}
            name="description"
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Collapse
            items={[
              {
                key: 'basic',
                label: t('tasks.basicConfig'),
                children: (
                  <>
                    <Form.Item
                      label={t('tasks.concurrency')}
                      name="concurrency"
                      initialValue={5}
                    >
                      <InputNumber min={1} max={50} />
                    </Form.Item>

                    <Form.Item
                      label={t('tasks.delayBetweenRequests')}
                      name="delayBetweenRequests"
                      initialValue={1000}
                    >
                      <InputNumber min={0} placeholder="ms" />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: 'proxy',
                label: t('tasks.proxyConfig'),
                children: (
                  <>
                    <Form.Item
                      label={t('tasks.proxyPool')}
                      name="proxyPoolId"
                    >
                      <Input placeholder={t('tasks.proxyPool')} />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: 'behavior',
                label: t('tasks.behaviorConfig'),
                children: (
                  <>
                    <Form.Item
                      label={t('tasks.userAgent')}
                      name="userAgent"
                    >
                      <Input.TextArea rows={3} />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />

          <Form.Item style={{ marginTop: '20px' }}>
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
    </div>
  )
}

export default TaskConfig
