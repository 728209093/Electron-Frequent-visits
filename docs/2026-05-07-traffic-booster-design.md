# 网站访问量刷取工具 - 系统设计文档

**项目名称**: Traffic Booster (流量增强器)  
**设计日期**: 2026年5月7日  
**目标平台**: Windows/macOS/Linux (Electron跨平台)  
**核心技术栈**: Electron + React + Node.js + SQLite + Puppeteer

---

## 一、项目概述

### 1.1 产品定义
一个桌面应用程序，用于自动化对目标网站的访问，支持：
- 自定义代理IP轮换访问
- 完整的浏览器行为模拟（User-Agent、延迟、交互等）
- 多任务并发执行
- 任务模板和项目管理
- 详细的执行统计和历史记录
- 定时和循环执行调度

### 1.2 核心特性
1. **项目管理系统** - 支持创建多个项目，每个项目包含多个任务
2. **通用工具设计** - 支持任意网站，用户自定义配置
3. **自定义代理** - 用户上传和维护自己的代理池
4. **超级配置** - 支持完整的行为模拟和并发访问
5. **本地数据存储** - SQLite数据库，数据隐私和安全

---

## 二、总体架构

### 2.1 系统架构图

```
┌─────────────────────────────────────────────────────┐
│            Electron Main Process                     │
│    (窗口管理、IPC通信、数据库访问、任务调度)        │
└──────────────────┬──────────────────────────────────┘
                   │ IPC RPC Channel
         ┌─────────┴─────────┐
         │                   │
    ┌────▼────────┐    ┌────▼──────────┐
    │  渲染进程    │    │ 后端服务进程  │
    │  (UI/React) │    │  (Express)     │
    └─────────────┘    └────┬──────────┘
                            │
            ┌───────────────┬┴──────────────┐
            │               │               │
        ┌───▼───────┐  ┌───▼───────┐  ┌──▼───────┐
        │任务队列    │  │Worker线程池│ │ 代理管理  │
        │(Bull)     │  │            │ │ & 浏览器  │
        └───────────┘  └───────────┘  └──────────┘
                            │
                        ┌───▼────────┐
                        │  SQLite DB  │
                        └─────────────┘
```

### 2.2 核心模块

| 模块 | 职责 | 技术选型 |
|------|------|--------|
| **项目管理服务** | 项目/任务CRUD、模板管理 | Express + SQLite |
| **代理管理服务** | 代理池维护、可用性检测 | Node.js内存 + 定期验证 |
| **任务执行引擎** | 任务队列、调度、并发控制 | Bull队列 + Worker Threads |
| **浏览器自动化** | 页面访问、行为模拟 | Puppeteer + 代理轮换 |
| **统计分析服务** | 数据汇总、报表生成 | SQLite聚合 |
| **UI层** | 项目/任务管理、配置、统计展示 | React + Ant Design |

---

## 三、数据模型

### 3.1 数据库表结构

#### Projects（项目表）
```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
```

#### Tasks（任务表）
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL,
  targetUrl TEXT NOT NULL,
  status TEXT DEFAULT 'draft', -- draft, running, paused, completed, failed
  proxyPoolId TEXT,
  concurrency INTEGER DEFAULT 1,
  totalCount INTEGER NOT NULL,
  completeCount INTEGER DEFAULT 0,
  
  -- 调度配置
  scheduleType TEXT DEFAULT 'once', -- once, daily, weekly
  scheduleTime TEXT, -- HH:mm:ss
  
  -- 行为模拟配置（JSON格式）
  config TEXT, -- {
            --   "delayRange": [1000, 5000],
            --   "userAgentStrategy": "random", -- random, rotate
            --   "useHeadless": false,
            --   "screenSize": "1920x1080",
            --   "language": "zh-CN",
            --   "timezone": "Asia/Shanghai",
            --   "acceptCookie": true,
            --   "scrollBehavior": true,
            --   "jsExecution": true
            -- }
  
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
```

#### ProxyPools（代理池表）
```sql
CREATE TABLE proxy_pools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  proxyCount INTEGER DEFAULT 0,
  lastVerifyTime INTEGER,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
```

#### ProxyList（代理列表表）
```sql
CREATE TABLE proxy_list (
  id TEXT PRIMARY KEY,
  poolId TEXT NOT NULL REFERENCES proxy_pools(id),
  protocol TEXT DEFAULT 'http', -- http, https, socks5
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  username TEXT,
  password TEXT,
  isActive BOOLEAN DEFAULT true,
  lastCheckTime INTEGER,
  failureCount INTEGER DEFAULT 0,
  createdAt INTEGER NOT NULL
);
```

#### TaskExecutions（任务执行记录表）
```sql
CREATE TABLE task_executions (
  id TEXT PRIMARY KEY,
  taskId TEXT NOT NULL REFERENCES tasks(id),
  startTime INTEGER NOT NULL,
  endTime INTEGER,
  status TEXT, -- running, completed, stopped, failed
  totalRequests INTEGER DEFAULT 0,
  successCount INTEGER DEFAULT 0,
  failureCount INTEGER DEFAULT 0,
  averageResponseTime REAL,
  createdAt INTEGER NOT NULL
);
```

#### ExecutionLogs（执行日志表）
```sql
CREATE TABLE execution_logs (
  id TEXT PRIMARY KEY,
  executionId TEXT NOT NULL REFERENCES task_executions(id),
  timestamp INTEGER NOT NULL,
  ipUsed TEXT,
  statusCode INTEGER,
  responseTime INTEGER,
  success BOOLEAN,
  errorMsg TEXT,
  createdAt INTEGER NOT NULL
);
```

---

## 四、前端页面设计

### 4.1 主要页面结构

#### Dashboard（仪表板）
- 项目概览卡片（总数、运行中、完成的）
- 进行中的任务实时监控面板
- 最近7天访问量趋势图
- 快速操作按钮

#### Projects Management（项目管理）
- 项目列表（表格视图，支持筛选、搜索）
- 新建/编辑项目弹窗
- 项目详情页面：
  - 项目基本信息
  - 任务列表（支持新建、编辑、删除、启动/停止）
  - 项目统计和执行历史

#### Task Configuration（任务配置）
- **基础配置板块**
  - 目标URL
  - 目标访问量
  - 并发数（1-50）

- **代理配置板块**
  - 选择代理池下拉菜单
  - 代理轮换策略：
    - 顺序轮换
    - 随机选择
    - 轮询+随机混合

- **行为模拟配置板块**
  - User-Agent随机化开关 + 策略选择
  - 请求延迟范围（最小-最大毫秒）
  - 浏览器无头模式切换
  - 屏幕尺寸预设
  - 地理位置/语言/时区设置
  - Cookie接受开关
  - 页面滚动行为模拟开关
  - JavaScript执行开关

- **调度配置板块**
  - 单次执行
  - 每日定时（时间选择器）
  - 每周定时（周几+时间）
  - 循环执行参数（间隔、重复次数）

- **预览和保存**
  - 配置预览
  - 保存为模板
  - 执行任务

#### Proxy Management（代理池管理）
- 代理池列表（表格：名称、代理数、最后验证时间）
- 新建/编辑代理池弹窗：
  - 代理池名称
  - 代理列表输入（支持粘贴，格式：ip:port 或 ip:port:user:pass）
  - 批量导入（从文件）
  - 验证代理可用性按钮
  - 代理详情表（可删除单个）

#### Analytics（统计分析）
- 执行历史列表（表格：任务名、执行时间、访问量、成功率）
- 详细日志查看：
  - 日志表（IP、状态码、响应时间、成功/失败）
  - 过滤器（按IP、状态码、时间范围）
  - 导出CSV功能
- 可视化报表：
  - 访问成功率趋势
  - IP使用分布
  - 响应时间分布

#### Settings（设置）
- 应用偏好设置
- 代理健康检查间隔
- 日志保留天数
- 数据库维护（清理日志）

### 4.2 UI技术栈
- **框架**: React 18+
- **UI组件库**: Ant Design v5
- **状态管理**: Redux Toolkit
- **图表**: ECharts或Recharts
- **样式**: Tailwind CSS + Less

---

## 五、后端API设计

### 5.1 Projects API
```
GET    /api/projects              获取项目列表
POST   /api/projects              创建项目
GET    /api/projects/:id          获取项目详情
PUT    /api/projects/:id          更新项目
DELETE /api/projects/:id          删除项目
```

### 5.2 Tasks API
```
GET    /api/tasks?projectId=xxx       获取项目任务列表
POST   /api/tasks                     创建任务
GET    /api/tasks/:id                 获取任务详情
PUT    /api/tasks/:id                 更新任务
DELETE /api/tasks/:id                 删除任务
POST   /api/tasks/:id/start           启动任务
POST   /api/tasks/:id/stop            停止任务
POST   /api/tasks/:id/pause           暂停任务
POST   /api/tasks/:id/resume          恢复任务
```

### 5.3 Proxy Pool API
```
GET    /api/proxy-pools               获取代理池列表
POST   /api/proxy-pools               创建代理池
GET    /api/proxy-pools/:id           获取代理池详情
PUT    /api/proxy-pools/:id           更新代理池
DELETE /api/proxy-pools/:id           删除代理池
POST   /api/proxy-pools/:id/verify    验证池中所有代理
POST   /api/proxy-pools/:id/proxies   批量添加代理
DELETE /api/proxy-pools/:id/proxies/:proxyId  删除单个代理
```

### 5.4 Execution & Analytics API
```
GET    /api/executions?taskId=xxx     获取执行历史
GET    /api/executions/:id/logs       获取执行日志
GET    /api/analytics/stats           获取统计数据
GET    /api/analytics/report          生成报表
```

---

## 六、核心业务逻辑

### 6.1 任务执行流程

```
1. 用户配置任务 → 保存到DB
2. 用户点击"启动任务"
3. Main进程接收启动信号
4. 创建TaskExecution记录
5. 将任务推送到Bull队列
6. Worker线程池开始处理：
   a. 从代理池选择代理（按轮换策略）
   b. 初始化Puppeteer浏览器实例
   c. 设置代理、User-Agent、地理位置等
   d. 访问目标URL
   e. 模拟用户行为（滚动、延迟等）
   f. 记录日志到数据库
   g. 下一次迭代或关闭浏览器
7. 任务完成，更新TaskExecution状态
8. 实时推送进度到前端（WebSocket或IPC）
```

### 6.2 代理轮换策略

**顺序轮换**: proxy[i % poolSize]  
**随机选择**: 每次从池中随机选择  
**轮询+随机**: 按顺序选择，但每N个请求随机重置位置  

### 6.3 行为模拟细节

- **User-Agent轮换**: 维护常见User-Agent列表，每次请求随机或轮换选择
- **延迟控制**: 请求间延迟随机范围（可配，default: 2-5秒）
- **浏览器指纹**: 设置viewport、屏幕分辨率、语言、时区
- **JavaScript执行**: 允许页面JavaScript运行，模拟真实用户交互
- **滚动行为**: 模拟页面滚动，等待图片加载
- **Cookie管理**: 自动接受Cookie，持久化Session

---

## 七、并发和性能设计

### 7.1 并发模型
- 使用Node.js Worker Threads实现多线程
- 每个Worker独立运行一个Puppeteer实例
- 通过线程池限制最大并发数（默认5个，可配到50个）
- Bull队列管理任务队列，防止内存溢出

### 7.2 资源管理
- Puppeteer浏览器进程池管理
- 定期关闭长时间未使用的浏览器实例
- 内存监控和告警
- 代理可用性定期检测，自动剔除失效代理

### 7.3 容错和重试
- 网络请求失败自动重试（最多3次）
- 代理失效自动切换
- 任务异常暂停，允许手动恢复
- 详细的错误日志记录

---

## 八、安全和隐私

### 8.1 数据安全
- 所有代理信息存储在本地SQLite数据库
- 敏感信息（如代理密码）支持加密存储（可选）
- 不涉及网络传输，数据完全本地

### 8.2 应用安全
- 只读取代理和任务配置，不修改系统设置
- 所有网络请求通过配置的代理进行
- 无后台上传或跟踪

---

## 九、开发时间线

### MVP阶段（第1周）
- Electron + React基础框架搭建
- SQLite数据库设计和初始化
- 基础CRUD API实现
- 项目和任务管理页面

### 功能阶段（第2周）
- 代理管理模块
- Puppeteer集成和行为模拟
- 任务执行引擎（基础版本）
- 任务启动/停止控制

### 完整阶段（第3周）
- 并发优化和Worker线程池
- Bull队列集成
- 定时调度功能
- 统计和日志系统
- 完整的UI和用户体验

---

## 十、技术栈总结

| 层 | 技术 |
|----|------|
| 桌面框架 | Electron 27+ |
| 前端UI | React 18 + Ant Design 5 |
| 前端状态 | Redux Toolkit |
| 后端框架 | Express.js |
| 数据库 | SQLite 3 |
| 浏览器自动化 | Puppeteer |
| 任务队列 | Bull/bullmq |
| 图表 | ECharts |
| 进程通信 | IPC/RPC |
| 并发处理 | Worker Threads + Promise |

---

## 十一、项目结构（预期）

```
traffic-booster/
├── public/
│   └── icon.png
├── src/
│   ├── main/
│   │   ├── index.ts              # Main进程入口
│   │   ├── preload.ts            # Preload脚本
│   │   ├── app.ts                # 应用主类
│   │   ├── database/             # 数据库相关
│   │   ├── services/             # 业务逻辑服务
│   │   │   ├── ProjectService.ts
│   │   │   ├── TaskService.ts
│   │   │   ├── ProxyService.ts
│   │   │   ├── ExecutionService.ts
│   │   │   └── TaskExecutor.ts
│   │   └── backend/              # 后端Express服务
│   │       ├── server.ts
│   │       └── routes/
│   ├── renderer/
│   │   ├── index.tsx             # 入口
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Projects.tsx
│   │   │   ├── TaskConfig.tsx
│   │   │   ├── ProxyManagement.tsx
│   │   │   ├── Analytics.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── store/                # Redux store
│   │   └── styles/
│   └── shared/
│       ├── types.ts              # 共享类型定义
│       └── constants.ts
├── package.json
├── electron-builder.json
├── tsconfig.json
└── README.md
```

---

**设计完成**。请审阅此文档，确认所有细节都符合你的预期。有任何调整或疑问，请告诉我。

