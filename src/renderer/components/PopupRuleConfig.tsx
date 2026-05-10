import React, { useState } from 'react'
import {
  Card,
  Button,
  Space,
  Form,
  Input,
  InputNumber,
  Switch,
  Select,
  Modal,
  List,
  Tag,
  Tooltip,
  Popconfirm,
  Typography,
  Divider,
  Row,
  Col,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { POPUP_PRESETS } from '../../shared/constants'

const { Text } = Typography

export interface PopupRule {
  name: string
  containerSelector?: string
  buttonSelectors: string[]
  buttonTexts?: string[]
  required: boolean
  priority: number
}

export interface PopupConfig {
  enabled: boolean
  rules: PopupRule[]
  waitTimeout: number
  afterClickDelay: [number, number]
}

interface PopupRuleConfigProps {
  value?: PopupConfig
  onChange?: (value: PopupConfig) => void
}

const defaultPopupConfig: PopupConfig = {
  enabled: true,
  rules: [],
  waitTimeout: 5000,
  afterClickDelay: [500, 1500],
}

const PopupRuleConfig: React.FC<PopupRuleConfigProps> = ({ value, onChange }) => {
  const config = value || defaultPopupConfig
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRule, setEditingRule] = useState<PopupRule | null>(null)
  const [editingIndex, setEditingIndex] = useState<number>(-1)
  const [form] = Form.useForm()

  const handleConfigChange = (newConfig: Partial<PopupConfig>) => {
    onChange?.({ ...config, ...newConfig })
  }

  const handleAddRule = () => {
    setEditingRule(null)
    setEditingIndex(-1)
    form.resetFields()
    form.setFieldsValue({
      name: '',
      containerSelector: '',
      buttonSelectors: [],
      buttonTexts: [],
      required: false,
      priority: config.rules.length + 1,
    })
    setModalVisible(true)
  }

  const handleEditRule = (rule: PopupRule, index: number) => {
    setEditingRule(rule)
    setEditingIndex(index)
    form.setFieldsValue(rule)
    setModalVisible(true)
  }

  const handleDeleteRule = (index: number) => {
    const newRules = [...config.rules]
    newRules.splice(index, 1)
    handleConfigChange({ rules: newRules })
  }

  const handleSaveRule = async () => {
    try {
      const values = await form.validateFields()
      const newRules = [...config.rules]
      
      if (editingIndex >= 0) {
        newRules[editingIndex] = values
      } else {
        newRules.push(values)
      }
      
      // 按优先级排序
      newRules.sort((a, b) => a.priority - b.priority)
      
      handleConfigChange({ rules: newRules })
      setModalVisible(false)
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const handleUsePreset = (presetKey: string) => {
    const preset = (POPUP_PRESETS as any)[presetKey]
    if (preset) {
      // 检查是否已存在同名规则
      const exists = config.rules.some(r => r.name === preset.name)
      if (exists) {
        Modal.warning({
          title: '规则已存在',
          content: `已存在名为"${preset.name}"的规则`,
        })
        return
      }
      
      const newRule: PopupRule = {
        ...preset,
        priority: config.rules.length + 1,
      }
      handleConfigChange({ rules: [...config.rules, newRule] })
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <span>启用弹窗处理</span>
          <Switch
            checked={config.enabled}
            onChange={(checked) => handleConfigChange({ enabled: checked })}
          />
        </Space>
      </div>

      {config.enabled && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Form.Item label="等待超时(ms)" style={{ marginBottom: 0 }}>
                <InputNumber
                  value={config.waitTimeout}
                  onChange={(v) => handleConfigChange({ waitTimeout: v || 5000 })}
                  min={1000}
                  max={30000}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item label="点击后延迟(ms)" style={{ marginBottom: 0 }}>
                <Input.Group compact>
                  <InputNumber
                    value={config.afterClickDelay[0]}
                    onChange={(v) => handleConfigChange({ 
                      afterClickDelay: [v || 500, config.afterClickDelay[1]] 
                    })}
                    min={0}
                    max={10000}
                    placeholder="最小"
                    style={{ width: '50%' }}
                  />
                  <InputNumber
                    value={config.afterClickDelay[1]}
                    onChange={(v) => handleConfigChange({ 
                      afterClickDelay: [config.afterClickDelay[0], v || 1500] 
                    })}
                    min={0}
                    max={10000}
                    placeholder="最大"
                    style={{ width: '50%' }}
                  />
                </Input.Group>
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ margin: '16px 0' }}>
            <Space>
              弹窗规则
              <Tooltip title="规则按优先级顺序执行，数字越小优先级越高">
                <QuestionCircleOutlined />
              </Tooltip>
            </Space>
          </Divider>

          <div style={{ marginBottom: 16 }}>
            <Space wrap>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRule}>
                添加规则
              </Button>
              <Divider type="vertical" />
              <Text type="secondary">快速添加预设：</Text>
              <Button 
                size="small" 
                icon={<ThunderboltOutlined />}
                onClick={() => handleUsePreset('AGE_VERIFICATION')}
              >
                年龄验证
              </Button>
              <Button 
                size="small" 
                icon={<ThunderboltOutlined />}
                onClick={() => handleUsePreset('COOKIE_CONSENT')}
              >
                Cookie同意
              </Button>
              <Button 
                size="small" 
                icon={<ThunderboltOutlined />}
                onClick={() => handleUsePreset('SUBSCRIPTION_POPUP')}
              >
                订阅弹窗
              </Button>
              <Button 
                size="small" 
                icon={<ThunderboltOutlined />}
                onClick={() => handleUsePreset('AD_POPUP')}
              >
                广告弹窗
              </Button>
            </Space>
          </div>

          {config.rules.length === 0 ? (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              background: '#fafafa', 
              borderRadius: '8px',
              border: '1px dashed #d9d9d9'
            }}>
              <Text type="secondary">暂无弹窗规则，点击上方按钮添加</Text>
            </div>
          ) : (
            <List
              dataSource={config.rules}
              renderItem={(rule, index) => (
                <List.Item
                  style={{ 
                    background: '#fafafa', 
                    marginBottom: 8, 
                    padding: '12px 16px',
                    borderRadius: '8px'
                  }}
                  actions={[
                    <Button 
                      type="text" 
                      icon={<EditOutlined />} 
                      onClick={() => handleEditRule(rule, index)}
                    >
                      编辑
                    </Button>,
                    <Popconfirm
                      title="确定删除此规则？"
                      onConfirm={() => handleDeleteRule(index)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button type="text" danger icon={<DeleteOutlined />}>
                        删除
                      </Button>
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Tag color="blue">优先级 {rule.priority}</Tag>
                        <span>{rule.name}</span>
                        {rule.required && <Tag color="red">必须</Tag>}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={4} style={{ marginTop: 8 }}>
                        {rule.buttonTexts && rule.buttonTexts.length > 0 && (
                          <div>
                            <Text type="secondary">按钮文本：</Text>
                            {rule.buttonTexts.map((text, i) => (
                              <Tag key={i} style={{ marginLeft: 4 }}>{text}</Tag>
                            ))}
                          </div>
                        )}
                        {rule.buttonSelectors && rule.buttonSelectors.length > 0 && (
                          <div>
                            <Text type="secondary">CSS选择器：</Text>
                            {rule.buttonSelectors.slice(0, 3).map((sel, i) => (
                              <Tag key={i} color="geekblue" style={{ marginLeft: 4 }}>{sel}</Tag>
                            ))}
                            {rule.buttonSelectors.length > 3 && (
                              <Tag>+{rule.buttonSelectors.length - 3} 更多</Tag>
                            )}
                          </div>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </>
      )}

      {/* 规则编辑弹窗 */}
      <Modal
        title={editingRule ? '编辑弹窗规则' : '添加弹窗规则'}
        open={modalVisible}
        onOk={handleSaveRule}
        onCancel={() => setModalVisible(false)}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="规则名称"
            name="name"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="如：年龄验证、Cookie同意" />
          </Form.Item>

          <Form.Item
            label={
              <Space>
                按钮文本匹配
                <Tooltip title="通过按钮上的文字来查找并点击，支持多个文本（按顺序尝试）">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
            name="buttonTexts"
          >
            <Select
              mode="tags"
              placeholder="输入按钮文本，按回车添加（如：是、确认、同意）"
              tokenSeparators={[',']}
            />
          </Form.Item>

          <Form.Item
            label={
              <Space>
                按钮CSS选择器
                <Tooltip title="直接通过CSS选择器定位按钮，适合有固定class或id的按钮">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
            name="buttonSelectors"
          >
            <Select
              mode="tags"
              placeholder="输入CSS选择器，按回车添加（如：.btn-confirm, #agree-btn）"
              tokenSeparators={[',']}
            />
          </Form.Item>

          <Form.Item
            label={
              <Space>
                弹窗容器选择器（可选）
                <Tooltip title="用于检测弹窗是否存在，如果不填则直接尝试点击按钮">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
            name="containerSelector"
          >
            <Input placeholder="如：.modal, #popup-container" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="优先级"
                name="priority"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={
                  <Space>
                    必须处理
                    <Tooltip title="如果开启，弹窗未找到时会报错">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="required"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

export default PopupRuleConfig
