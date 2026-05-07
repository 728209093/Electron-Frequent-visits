import React from 'react'
import { Select, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { setLanguage } from '../store/languageSlice'
import { RootState } from '../store'
import { GlobalOutlined } from '@ant-design/icons'

const LanguageSwitch: React.FC = () => {
  const { i18n } = useTranslation()
  const dispatch = useDispatch()
  const currentLanguage = useSelector((state: RootState) => state.language.current)

  const handleLanguageChange = (value: 'en' | 'zh') => {
    dispatch(setLanguage(value))
    i18n.changeLanguage(value)
  }

  return (
    <Space>
      <GlobalOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
      <Select
        value={currentLanguage}
        onChange={handleLanguageChange}
        style={{ width: 100 }}
        options={[
          { label: 'English', value: 'en' },
          { label: '中文', value: 'zh' },
        ]}
      />
    </Space>
  )
}

export default LanguageSwitch
