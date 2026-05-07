import React, { useState, useEffect } from 'react'
import {
  Tabs,
  Table,
  Button,
  Space,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Tag,
  Card,
  Divider,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { proxyAPI } from '../api'

interface ProxyPool {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

interface Proxy {
  id: string
  poolId: string
  ip: string
  port: number
  username?: string
  password?: string
  status: 'healthy' | 'unhealthy'
  lastCheck: string
  createdAt: string
}

const ProxyManagement: React.FC = () => {
  const { t } = useTranslation()
  const [pools, setPools] = useState<ProxyPool[]>([])
  const [proxies, setProxies] = useState<Proxy[]>([])
  const [selectedPoolId, setSelectedPoolId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [drawerType, setDrawerType] = useState<'pool' | 'proxy'>('pool')
  const [editingItem, setEditingItem] = useState<any>(null)
  const [form] = Form.useForm()

  // 加载数据
  useEffect(() => {
    loadPools()
  }, [])

  useEffect(() => {
    if (selectedPoolId) {
      loadProxies(selectedPoolId)
    }
  }, [selectedPoolId])

  const loadPools = async () => {
    setLoading(true)
    try {
      const response = await proxyAPI.getPools()
      setPools(response || [])
      if (response.data && response.data.length > 0) {
        setSelectedPoolId(response.data[0].id)
      }
    } catch (error) {
      message.error(t('common.loadFailed'))
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadProxies = async (poolId: string) => {
    setLoading(true)
    try {
      const response = await proxyAPI.getProxiesByPool(poolId)
      setProxies(response || [])
    } catch (error) {
      message.error(t('common.loadFailed'))
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // 处理池操作
  const handleOpenPoolDrawer = (pool?: ProxyPool) => {
    setDrawerType('pool')
    if (pool) {
      setEditingItem(pool)
      form.setFieldsValue(pool)
    } else {
      setEditingItem(null)
      form.resetFields()
    }
    setDrawerVisible(true)
  }

  const handleSavePool = async (values: any) => {
    try {
      if (editingItem) {
        await proxyAPI.updatePool(editingItem.id, values)
        message.success(t('proxies.poolUpdated'))
      } else {
        await proxyAPI.createPool(values)
        message.success(t('proxies.poolCreated'))
      }
      setDrawerVisible(false)
      loadPools()
    } catch (error) {
      message.error(t('common.saveFailed'))
      console.error(error)
    }
  }

  const handleDeletePool = async (id: string) => {
    try {
      await proxyAPI.deletePool(id)
      message.success(t('proxies.poolDeleted'))
      loadPools()
    } catch (error) {
      message.error(t('common.deleteFailed'))
      console.error(error)
    }
  }

  // 处理代理操作
  const handleOpenProxyDrawer = (proxy?: Proxy) => {
    setDrawerType('proxy')
    if (proxy) {
      setEditingItem(proxy)
      form.setFieldsValue(proxy)
    } else {
      setEditingItem(null)
      form.resetFields()
    }
    setDrawerVisible(true)
  }

  const handleSaveProxy = async (values: any) => {
    if (!selectedPoolId) {
      message.error(t('proxies.selectPool'))
      return
    }

    try {
      const data = { ...values, poolId: selectedPoolId }
      if (editingItem) {
        await proxyAPI.updateProxy(editingItem.id, data)
        message.success(t('proxies.proxyUpdated'))
      } else {
        await proxyAPI.addProxy(selectedPoolId, data)
        message.success(t('proxies.proxyAdded'))
      }
      setDrawerVisible(false)
      loadProxies(selectedPoolId)
    } catch (error) {
      message.error(t('common.saveFailed'))
      console.error(error)
    }
  }

  const handleDeleteProxy = async (id: string) => {
    try {
      await proxyAPI.deleteProxy(id)
      message.success(t('proxies.proxyDeleted'))
      loadProxies(selectedPoolId)
    } catch (error) {
      message.error(t('common.deleteFailed'))
      console.error(error)
    }
  }

  const handleVerifyProxy = async (id: string) => {
    try {
      await proxyAPI.verifyProxy(id)
      message.success(t('proxies.verifyStarted'))
      loadProxies(selectedPoolId)
    } catch (error) {
      message.error(t('common.actionFailed'))
      console.error(error)
    }
  }

  // 代理池列表列定义
  const poolColumns = [
    {
      title: t('proxies.poolName'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('proxies.description'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
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
      render: (_, record: ProxyPool) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenPoolDrawer(record)}
          >
            {t('common.edit')}
          </Button>
          <Popconfirm
            title={t('common.deleteConfirm')}
            onConfirm={() => handleDeletePool(record.id)}
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

  // 代理列表列定义
  const proxyColumns = [
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: t('proxies.port'),
      dataIndex: 'port',
      key: 'port',
      width: 80,
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const icon = status === 'healthy' ? <CheckCircleOutlined style={{ color: 'green' }} /> : <ExclamationCircleOutlined style={{ color: 'red' }} />
        const color = status === 'healthy' ? 'green' : 'red'
        return (
          <Tag icon={icon} color={color}>
            {t(`proxies.${status}`)}
          </Tag>
        )
      },
    },
    {
      title: t('proxies.lastCheck'),
      dataIndex: 'lastCheck',
      key: 'lastCheck',
      render: (text: string) => text ? new Date(text).toLocaleString() : '-',
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 200,
      render: (_, record: Proxy) => (
        <Space size="small" wrap>
          <Button
            size="small"
            onClick={() => handleVerifyProxy(record.id)}
          >
            {t('proxies.verify')}
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenProxyDrawer(record)}
          >
            {t('common.edit')}
          </Button>
          <Popconfirm
            title={t('common.deleteConfirm')}
            onConfirm={() => handleDeleteProxy(record.id)}
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
      <Tabs
        items={[
          {
            key: 'pools',
            label: t('proxies.pools'),
            children: (
              <Card title={t('proxies.managePools')}>
                <div style={{ marginBottom: '16px' }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handleOpenPoolDrawer()}
                  >
                    {t('proxies.createPool')}
                  </Button>
                </div>
                <Table
                  columns={poolColumns}
                  dataSource={pools}
                  loading={loading}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          {
            key: 'proxies',
            label: t('proxies.proxies'),
            children: (
              <Card title={t('proxies.manageProxies')}>
                {selectedPoolId && (
                  <>
                    <div style={{ marginBottom: '16px' }}>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => handleOpenProxyDrawer()}
                      >
                        {t('proxies.addProxy')}
                      </Button>
                    </div>
                    <Table
                      columns={proxyColumns}
                      dataSource={proxies}
                      loading={loading}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                    />
                  </>
                )}
                {!selectedPoolId && (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    {t('proxies.selectPoolFirst')}
                  </div>
                )}
              </Card>
            ),
          },
        ]}
      />

      {/* 新增/编辑抽屉 */}
      <Drawer
        title={
          drawerType === 'pool'
            ? editingItem
              ? t('proxies.editPool')
              : t('proxies.createPool')
            : editingItem
            ? t('proxies.editProxy')
            : t('proxies.addProxy')
        }
        placement="right"
        width={400}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={drawerType === 'pool' ? handleSavePool : handleSaveProxy}
        >
          {drawerType === 'pool' ? (
            <>
              <Form.Item
                label={t('proxies.poolName')}
                name="name"
                rules={[{ required: true, message: t('proxies.nameRequired') }]}
              >
                <Input placeholder={t('proxies.nameRequired')} />
              </Form.Item>
              <Form.Item
                label={t('proxies.description')}
                name="description"
              >
                <Input.TextArea rows={3} />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item
                label="IP"
                name="ip"
                rules={[{ required: true, message: 'IP required' }]}
              >
                <Input placeholder="192.168.1.1" />
              </Form.Item>
              <Form.Item
                label={t('proxies.port')}
                name="port"
                rules={[{ required: true, message: t('proxies.portRequired') }]}
              >
                <InputNumber min={1} max={65535} />
              </Form.Item>
              <Form.Item
                label={t('proxies.username')}
                name="username"
              >
                <Input />
              </Form.Item>
              <Form.Item
                label={t('proxies.password')}
                name="password"
              >
                <Input.Password />
              </Form.Item>
            </>
          )}

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

export default ProxyManagement
