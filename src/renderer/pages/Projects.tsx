import React, { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Space,
  Drawer,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
  Card,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { projectAPI } from '../api'

interface Project {
  id: string
  name: string
  description: string
  url: string
  targetTraffic: number
  status: 'active' | 'paused' | 'completed'
  createdAt: string
  updatedAt: string
}

const Projects: React.FC = () => {
  const { t } = useTranslation()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [form] = Form.useForm()

  // 加载项目列表
  const loadProjects = async () => {
    setLoading(true)
    try {
      const response = await projectAPI.getAll()
      setProjects(response || [])
    } catch (error) {
      message.error(t('common.loadFailed'))
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  // 打开新增/编辑抽屉
  const handleOpenDrawer = (project?: Project) => {
    if (project) {
      setEditingProject(project)
      form.setFieldsValue(project)
    } else {
      setEditingProject(null)
      form.resetFields()
    }
    setDrawerVisible(true)
  }

  // 保存项目
  const handleSaveProject = async (values: any) => {
    try {
      if (editingProject) {
        await projectAPI.update(editingProject.id, values)
        message.success(t('projects.updated'))
      } else {
        await projectAPI.create(values)
        message.success(t('projects.created'))
      }
      setDrawerVisible(false)
      loadProjects()
    } catch (error) {
      message.error(t('common.saveFailed'))
      console.error(error)
    }
  }

  // 删除项目
  const handleDeleteProject = async (id: string) => {
    try {
      await projectAPI.delete(id)
      message.success(t('projects.deleted'))
      loadProjects()
    } catch (error) {
      message.error(t('common.deleteFailed'))
      console.error(error)
    }
  }

  // 表格列定义
  const columns = [
    {
      title: t('projects.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('projects.url'),
      dataIndex: 'url',
      key: 'url',
      width: 200,
      ellipsis: true,
    },
    {
      title: t('projects.targetTraffic'),
      dataIndex: 'targetTraffic',
      key: 'targetTraffic',
      align: 'center' as const,
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: { [key: string]: string } = {
          active: 'green',
          paused: 'orange',
          completed: 'blue',
        }
        const displayStatus = status || 'active'
        return <Tag color={colors[displayStatus]}>{t(`common.${displayStatus}`)}</Tag>
      },
    },
    {
      title: t('common.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleDateString(),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 150,
      render: (_, record: Project) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenDrawer(record)}
          >
            {t('common.edit')}
          </Button>
          <Popconfirm
            title={t('common.deleteConfirm')}
            description={t('projects.deleteConfirmMessage')}
            onConfirm={() => handleDeleteProject(record.id)}
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
      <Card title={t('projects.title')}>
        <div style={{ marginBottom: '16px' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenDrawer()}
          >
            {t('projects.create')}
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={projects}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 新增/编辑抽屉 */}
      <Drawer
        title={editingProject ? t('projects.edit') : t('projects.create')}
        placement="right"
        width={400}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveProject}
        >
          <Form.Item
            label={t('projects.name')}
            name="name"
            rules={[{ required: true, message: t('projects.nameRequired') }]}
          >
            <Input placeholder={t('projects.nameRequired')} />
          </Form.Item>

          <Form.Item
            label={t('projects.description')}
            name="description"
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item
            label={t('projects.url')}
            name="url"
            rules={[{ required: true, message: t('projects.urlRequired') }]}
          >
            <Input placeholder="https://example.com" />
          </Form.Item>

          <Form.Item
            label={t('projects.targetTraffic')}
            name="targetTraffic"
            rules={[{ required: true, message: t('projects.trafficRequired') }]}
          >
            <Input type="number" placeholder="1000" />
          </Form.Item>

          <Form.Item
            label={t('common.status')}
            name="status"
            initialValue="active"
          >
            <Select>
              <Select.Option value="active">{t('common.active')}</Select.Option>
              <Select.Option value="paused">{t('common.paused')}</Select.Option>
              <Select.Option value="completed">{t('common.completed')}</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
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

export default Projects
