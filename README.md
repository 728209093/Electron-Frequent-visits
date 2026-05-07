# Traffic Booster

一个功能强大的Electron桌面应用，用于自动化网站访问，内置代理IP自动轮换和完整的浏览器行为模拟。

## 功能特性

- 🚀 **项目管理系统** - 支持创建和管理多个项目
- 📋 **任务模板** - 保存任务模板，快速创建新任务
- 🔄 **代理轮换** - 支持自定义代理池和多种轮换策略
- 🎭 **行为模拟** - 完整的浏览器行为模拟（User-Agent、延迟、交互等）
- ⚡ **并发执行** - 支持多任务并发访问
- 📊 **统计分析** - 详细的执行日志和可视化报表
- ⏰ **定时调度** - 支持一次性、每日、每周定时执行
- 💾 **本地存储** - SQLite数据库，完全本地化

## 技术栈

- **前端**: React 18 + TypeScript + Ant Design 5 + Redux Toolkit
- **桌面框架**: Electron 27
- **后端**: Node.js + Express.js
- **数据库**: SQLite 3
- **自动化**: Puppeteer
- **任务队列**: BullMQ
- **构建工具**: Vite + TypeScript
- **样式**: Tailwind CSS

## 快速开始

### 前置要求
- Node.js 16+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

这将同时启动：
- Electron应用 (热重载)
- 前端开发服务器 (Vite, port 5173)
- 后端服务 (Express, port 3001)

### 构建项目

```bash
# 构建源代码
npm run build

# 打包应用（创建可执行文件）
npm run dist
```

## 项目结构

```
traffic-booster/
├── src/
│   ├── main/                 # Electron主进程
│   │   ├── index.ts         # 主进程入口
│   │   ├── preload.ts       # Preload脚本
│   │   ├── database/        # 数据库
│   │   ├── backend/         # Express服务和路由
│   │   ├── services/        # 业务逻辑服务
│   │   └── utils/           # 工具函数
│   ├── renderer/            # React前端应用
│   │   ├── index.tsx        # 入口文件
│   │   ├── App.tsx          # 主应用组件
│   │   ├── pages/           # 页面组件
│   │   ├── components/      # 可复用组件
│   │   ├── hooks/           # 自定义Hooks
│   │   └── store/           # Redux状态管理
│   └── shared/              # 共享类型和常量
├── public/                  # 静态资源
├── docs/                    # 文档
├── package.json
├── tsconfig.json
├── vite.config.ts
└── electron-builder.json
```

## 主要页面

### Dashboard (仪表板)
- 项目概览统计
- 进行中的任务监控
- 最近活动记录

### Projects (项目管理)
- 创建/编辑/删除项目
- 管理项目中的任务
- 项目统计信息

### Proxy Management (代理池管理)
- 创建和维护代理池
- 批量导入代理
- 代理可用性验证

### Task Configuration (任务配置)
- 目标URL设置
- 代理池选择
- 行为模拟配置
- 调度参数设置

### Analytics (统计分析)
- 执行历史和日志查看
- 详细的数据统计
- 可视化报表

### Settings (设置)
- 应用偏好设置
- 代理检测参数
- 日志管理

## API文档

所有API都运行在 `http://localhost:3001`

### Projects
- `GET /api/projects` - 获取所有项目
- `POST /api/projects` - 创建项目
- `GET /api/projects/:id` - 获取项目详情
- `PUT /api/projects/:id` - 更新项目
- `DELETE /api/projects/:id` - 删除项目

### Tasks
- `GET /api/tasks` - 获取任务列表
- `POST /api/tasks` - 创建任务
- `GET /api/tasks/:id` - 获取任务详情
- `PUT /api/tasks/:id` - 更新任务
- `DELETE /api/tasks/:id` - 删除任务
- `POST /api/tasks/:id/start` - 启动任务
- `POST /api/tasks/:id/stop` - 停止任务
- `POST /api/tasks/:id/pause` - 暂停任务
- `POST /api/tasks/:id/resume` - 恢复任务

### Proxy Pools
- `GET /api/proxy-pools` - 获取代理池列表
- `POST /api/proxy-pools` - 创建代理池
- `GET /api/proxy-pools/:id` - 获取代理池详情
- `PUT /api/proxy-pools/:id` - 更新代理池
- `DELETE /api/proxy-pools/:id` - 删除代理池
- `POST /api/proxy-pools/:id/proxies` - 添加代理
- `DELETE /api/proxy-pools/:id/proxies/:proxyId` - 删除代理
- `POST /api/proxy-pools/:id/verify` - 验证代理

### Analytics
- `GET /api/executions` - 获取执行历史
- `GET /api/executions/:id/logs` - 获取执行日志
- `GET /api/analytics/stats` - 获取统计数据
- `GET /api/analytics/report` - 获取报表

## 数据库架构

- **projects** - 项目表
- **tasks** - 任务表
- **proxy_pools** - 代理池表
- **proxy_list** - 代理列表
- **task_executions** - 任务执行记录
- **execution_logs** - 执行日志

## 开发指南

### 添加新页面
1. 在 `src/renderer/pages/` 中创建页面组件
2. 在 `src/renderer/App.tsx` 中添加路由
3. 在 `src/renderer/components/Sidebar.tsx` 中添加菜单项

### 添加新API
1. 在 `src/main/backend/routes/` 中创建路由文件
2. 在 `src/main/backend/server.ts` 中注册路由
3. 在前端调用API

### 状态管理
使用Redux Toolkit管理全局状态：
1. 在 `src/renderer/store/` 中创建slice
2. 在store中注册reducer
3. 在组件中使用 `useSelector` 和 `useDispatch`

## 许可证

MIT

## 支持

有问题或建议？请提交Issue或PR。
