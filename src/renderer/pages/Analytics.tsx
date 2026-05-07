import React, { useState, useEffect } from 'react'
import {
  Table,
  Card,
  Statistic,
  Row,
  Col,
  Button,
  Drawer,
  Tabs,
  Tag,
  Space,
  DatePicker,
  Select,
} from 'antd'
import { DownloadOutlined, EyeOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { analyticsAPI } from '../api'

interface ExecutionRecord {
  id: string
  taskId: string
  startTime: string
  endTime: string
  status: 'completed' | 'failed' | 'stopped'
  successCount: number
  failedCount: number
  totalRequests: number
}

interface Log {
  id: string
  executionId: string
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
}

interface Statistics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
}

const Analytics: React.FC = () => {
  const { t } = useTranslation()
  const [executions, setExecutions] = useState<ExecutionRecord[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [stats, setStats] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [selectedExecution, setSelectedExecution] = useState<ExecutionRecord | null>(null)

  // 加载数据
  useEffect(() => {
    loadExecutionHistory()
    loadStatistics()
  }, [])

  const loadExecutionHistory = async () => {
    setLoading(true)
    try {
      const response = await analyticsAPI.getExecutionHistory()
      setExecutions(response || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadStatistics = async () => {
    try {
      const response = await analyticsAPI.getStatistics()
      setStats(response)
    } catch (error) {
      console.error(error)
    }
  }

  const loadExecutionLogs = async (executionId: string) => {
    try {
      const response = await analyticsAPI.getExecutionLogs(executionId)
      setLogs(response || [])
    } catch (error) {
      console.error(error)
    }
  }

  // 查看详情
  const handleViewDetails = async (execution: ExecutionRecord) => {
    setSelectedExecution(execution)
    setDrawerVisible(true)
    await loadExecutionLogs(execution.id)
  }

  // 导出数据
  const handleExportReport = async () => {
    try {
      const response = await analyticsAPI.generateReport()
      // 创建下载链接
      const blob = new Blob([JSON.stringify(response.data)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (error) {
      console.error(error)
    }
  }

  // 执行历史表列
  const executionColumns = [
    {
      title: t('analytics.task'),
      dataIndex: 'taskId',
      key: 'taskId',
      width: 150,
    },
    {
      title: t('analytics.startTime'),
      dataIndex: 'startTime',
      key: 'startTime',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: t('analytics.endTime'),
      dataIndex: 'endTime',
      key: 'endTime',
      render: (text: string) => text ? new Date(text).toLocaleString() : '-',
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: { [key: string]: string } = {
          completed: 'green',
          failed: 'red',
          stopped: 'orange',
        }
        return <Tag color={colors[status]}>{t(`analytics.${status}`)}</Tag>
      },
    },
    {
      title: t('analytics.successCount'),
      dataIndex: 'successCount',
      key: 'successCount',
      width: 100,
      align: 'center' as const,
    },
    {
      title: t('analytics.failedCount'),
      dataIndex: 'failedCount',
      key: 'failedCount',
      width: 100,
      align: 'center' as const,
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 100,
      render: (_, record: ExecutionRecord) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
        >
          {t('analytics.viewDetails')}
        </Button>
      ),
    },
  ]

  // 日志表列
  const logColumns = [
    {
      title: t('analytics.timestamp'),
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (text: string) => new Date(text).toLocaleString(),
      width: 180,
    },
    {
      title: t('analytics.level'),
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: string) => {
        const colors: { [key: string]: string } = {
          info: 'blue',
          warning: 'orange',
          error: 'red',
        }
        return <Tag color={colors[level]}>{level.toUpperCase()}</Tag>
      },
    },
    {
      title: t('analytics.message'),
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
  ]

  return (
    <div style={{ padding: '20px' }}>
      {/* 统计信息 */}
      {stats && (
        <Card style={{ marginBottom: '20px' }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title={t('analytics.totalRequests')}
                value={stats.totalRequests}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={t('analytics.successfulRequests')}
                value={stats.successfulRequests}
                suffix={`/ ${stats.totalRequests}`}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={t('analytics.failedRequests')}
                value={stats.failedRequests}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={t('analytics.averageResponseTime')}
                value={stats.averageResponseTime}
                suffix="ms"
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* 执行历史 */}
      <Card title={t('analytics.executionHistory')}>
        <div style={{ marginBottom: '16px' }}>
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportReport}
            >
              {t('analytics.exportReport')}
            </Button>
          </Space>
        </div>

        <Table
          columns={executionColumns}
          dataSource={executions}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 详情抽屉 */}
      <Drawer
        title={t('analytics.executionDetails')}
        placement="right"
        width={800}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedExecution && (
          <Tabs
            items={[
              {
                key: 'info',
                label: t('analytics.info'),
                children: (
                  <div>
                    <p><strong>{t('analytics.task')}:</strong> {selectedExecution.taskId}</p>
                    <p><strong>{t('analytics.startTime')}:</strong> {new Date(selectedExecution.startTime).toLocaleString()}</p>
                    <p><strong>{t('analytics.endTime')}:</strong> {selectedExecution.endTime ? new Date(selectedExecution.endTime).toLocaleString() : '-'}</p>
                    <p><strong>{t('common.status')}:</strong> <Tag color={selectedExecution.status === 'completed' ? 'green' : 'red'}>{selectedExecution.status}</Tag></p>
                    <p><strong>{t('analytics.successCount')}:</strong> {selectedExecution.successCount}</p>
                    <p><strong>{t('analytics.failedCount')}:</strong> {selectedExecution.failedCount}</p>
                    <p><strong>{t('analytics.totalRequests')}:</strong> {selectedExecution.totalRequests}</p>
                  </div>
                ),
              },
              {
                key: 'logs',
                label: t('analytics.logs'),
                children: (
                  <Table
                    columns={logColumns}
                    dataSource={logs}
                    rowKey="id"
                    pagination={{ pageSize: 20 }}
                    size="small"
                  />
                ),
              },
            ]}
          />
        )}
      </Drawer>
    </div>
  )
}

export default Analytics
