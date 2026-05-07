import React from 'react'
import { Menu, MenuProps } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  DesktopOutlined,
  FolderOutlined,
  CheckSquareOutlined,
  ApiOutlined,
  BarChartOutlined,
  SettingOutlined,
} from '@ant-design/icons'

interface SidebarProps {
  onNavigate: (page: string) => void
  onCollapse: (collapsed: boolean) => void
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigate, onCollapse }) => {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = React.useState(false)

  const items: MenuProps['items'] = [
    {
      key: 'dashboard',
      icon: <DesktopOutlined />,
      label: t('sidebar.dashboard'),
      onClick: () => onNavigate('dashboard'),
    },
    {
      key: 'projects',
      icon: <FolderOutlined />,
      label: t('sidebar.projects'),
      onClick: () => onNavigate('projects'),
    },
    {
      key: 'tasks',
      icon: <CheckSquareOutlined />,
      label: t('sidebar.tasks'),
      onClick: () => onNavigate('tasks'),
    },
    {
      key: 'proxies',
      icon: <ApiOutlined />,
      label: t('sidebar.proxies'),
      onClick: () => onNavigate('proxies'),
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined />,
      label: t('sidebar.analytics'),
      onClick: () => onNavigate('analytics'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: t('sidebar.settings'),
      onClick: () => onNavigate('settings'),
    },
  ]

  const handleCollapse = () => {
    const newCollapsed = !collapsed
    setCollapsed(newCollapsed)
    onCollapse(newCollapsed)
  }

  return (
    <div className="sidebar-content">
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <h2 style={{ margin: 0, color: '#fff' }}>TB</h2>
      </div>
      <Menu
        theme="dark"
        defaultSelectedKeys={['dashboard']}
        mode="inline"
        items={items}
      />
    </div>
  )
}

export default Sidebar
