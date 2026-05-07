import React from 'react'
import { Row, Col, Card, Statistic, Button, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  FolderOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'

interface DashboardProps {
  onNavigate?: (page: string) => void
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { t } = useTranslation()

  const handleCreateProject = () => {
    if (onNavigate) {
      onNavigate('projects')
    }
  }

  const handleManageProxies = () => {
    if (onNavigate) {
      onNavigate('proxies')
    }
  }

  const handleViewAnalytics = () => {
    if (onNavigate) {
      onNavigate('analytics')
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard.totalProjects')}
              value={0}
              prefix={<FolderOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard.runningTasks')}
              value={0}
              prefix={<PlayCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard.completedToday')}
              value={0}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard.failedTasks')}
              value={0}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title={t('dashboard.quickActions')} style={{ marginBottom: '24px' }}>
        <Space>
          <Button type="primary" size="large" onClick={handleCreateProject}>
            {t('dashboard.createProject')}
          </Button>
          <Button size="large" onClick={handleManageProxies}>
            {t('dashboard.manageProxies')}
          </Button>
          <Button size="large" onClick={handleViewAnalytics}>
            {t('dashboard.viewAnalytics')}
          </Button>
        </Space>
      </Card>

      <Card title={t('dashboard.recentActivity')}>
        <p>{t('dashboard.noActivities')}</p>
      </Card>
    </div>
  )
}

export default Dashboard
