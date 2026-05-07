import React from 'react'
import { ConfigProvider, Layout, Button } from 'antd'
import { Provider } from 'react-redux'
import { useTranslation } from 'react-i18next'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import store from './store'
import Sidebar from './components/Sidebar'
import LanguageSwitch from './components/LanguageSwitch'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import TaskConfig from './pages/TaskConfig'
import ProxyManagement from './pages/ProxyManagement'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import './App.css'

const { Header, Sider, Content, Footer } = Layout

const AppContent: React.FC = () => {
  const { t, i18n } = useTranslation()
  const [collapsed, setCollapsed] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState('dashboard')

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />
      case 'projects':
        return <Projects />
      case 'tasks':
        return <TaskConfig />
      case 'proxies':
        return <ProxyManagement />
      case 'analytics':
        return <Analytics />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard onNavigate={setCurrentPage} />
    }
  }

  // 根据语言选择 Ant Design 的国际化配置
  const antdLocale = i18n.language === 'zh' ? zhCN : enUS

  return (
    <ConfigProvider locale={antdLocale}>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={200}
          className="sidebar"
        >
          <Sidebar onNavigate={setCurrentPage} onCollapse={setCollapsed} />
        </Sider>
        <Layout>
          <Header className="header">
            <div className="header-content">
              <h1>{t('common.appName')}</h1>
              <div className="header-right">
                <LanguageSwitch />
              </div>
            </div>
          </Header>
          <Content className="content">
            {renderPage()}
          </Content>
          <Footer style={{ textAlign: 'center' }}>
            {t('common.appName')} © 2026
          </Footer>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  )
}

export default App
