# 项目启动指南

## 环境要求

- **Node.js**: 16.0 或更高版本
- **npm**: 7.0 或更高版本
- **Windows 10/11**, **macOS 10.12+**, 或 **Linux**

## 安装步骤

### 1. 安装依赖

在项目根目录运行：

```bash
npm install
```

这会安装所有必要的依赖，包括：
- Electron（桌面框架）
- React 18（前端UI）
- Express.js（后端服务）
- SQLite 3（数据库）
- Puppeteer（浏览器自动化）
- 以及其他所有需要的库

### 2. 启动开发环境

```bash
npm run dev
```

这将同时启动：
- **Electron应用** - 桌面应用窗口（主进程）
- **Vite开发服务器** - 前端热重载（http://localhost:5173）
- **Express后端服务** - API服务（http://localhost:3001）

应用启动后，会打开一个Electron窗口，显示仪表板界面。

### 3. 构建生产版本

#### 构建源代码：

```bash
npm run build
```

这会编译TypeScript并构建前端应用，输出到 `dist/` 目录。

#### 创建可执行程序：

```bash
npm run dist
```

这会使用electron-builder打包应用，生成可安装的应用程序（`.exe`、`.dmg` 等）。

输出文件会在 `release/` 目录中。

## 项目结构概览

```
traffic-booster/
├── src/
│   ├── main/                 # Electron主进程代码
│   │   ├── index.ts         # 入口，创建窗口
│   │   ├── preload.ts       # 安全的IPC接口暴露
│   │   ├── database/        # SQLite数据库初始化和操作
│   │   ├── backend/         # Express服务器和API路由
│   │   │   └── routes/      # API端点定义
│   │   ├── services/        # 业务逻辑（任务执行、数据管理等）
│   │   └── utils/           # 工具函数
│   │
│   ├── renderer/            # React前端应用
│   │   ├── index.tsx        # React应用入口
│   │   ├── App.tsx          # 主应用组件（布局和路由）
│   │   ├── pages/           # 各页面组件
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Projects.tsx (待实现)
│   │   │   ├── TaskConfig.tsx (待实现)
│   │   │   ├── ProxyManagement.tsx (待实现)
│   │   │   ├── Analytics.tsx (待实现)
│   │   │   └── Settings.tsx (待实现)
│   │   ├── components/      # 可复用组件
│   │   │   └── Sidebar.tsx
│   │   ├── hooks/           # React自定义Hooks
│   │   │   └── useAsync.ts
│   │   ├── api/             # API调用函数
│   │   ├── store/           # Redux状态管理
│   │   └── styles/          # 样式文件
│   │
│   └── shared/              # 前后端共享代码
│       ├── types.ts         # TypeScript类型定义
│       └── constants.ts     # 常量定义
│
├── public/                  # 静态资源
│   └── index.html          # HTML模板
│
├── docs/                    # 文档
│   └── 2026-05-07-traffic-booster-design.md  # 完整设计文档
│
├── package.json            # 项目配置和依赖
├── tsconfig.json           # TypeScript配置
├── tsconfig.main.json      # 主进程TS配置
├── tsconfig.renderer.json  # 渲染进程TS配置
├── vite.config.ts          # Vite打包配置
├── electron-builder.json   # 应用打包配置
└── README.md               # 项目说明
```

## 核心技术说明

### 前端（Renderer Process）
- **React 18**: 用户界面框架
- **Ant Design 5**: UI组件库（中文支持）
- **Redux Toolkit**: 状态管理
- **Axios**: HTTP客户端
- **ECharts**: 数据可视化
- **Vite**: 快速构建工具

### 后端（Main Process + Services）
- **Electron**: 桌面应用框架
- **Express.js**: HTTP服务器
- **SQLite 3**: 本地数据库
- **Puppeteer**: 浏览器自动化
- **BullMQ**: 任务队列管理
- **Node.js Worker Threads**: 多线程并发处理

## 数据库

应用使用SQLite 3，数据文件存储在用户本地目录：
- **Windows**: `C:\Users\<username>\AppData\Roaming\traffic-booster\traffic-booster.db`
- **macOS**: `~/Library/Application Support/traffic-booster/traffic-booster.db`
- **Linux**: `~/.config/traffic-booster/traffic-booster.db`

### 数据库表：
1. **projects** - 项目信息
2. **tasks** - 任务配置
3. **proxy_pools** - 代理池
4. **proxy_list** - 代理详情
5. **task_executions** - 执行记录
6. **execution_logs** - 执行日志

## API服务

后端服务运行在 `http://localhost:3001`，提供RESTful API：

### 主要接口：
- `GET /api/projects` - 获取项目列表
- `POST /api/projects` - 创建项目
- `GET /api/tasks` - 获取任务列表
- `POST /api/proxy-pools` - 创建代理池
- `GET /api/analytics/stats` - 获取统计数据

详细API文档见 [README.md](../README.md)

## 开发工作流

### 1. 添加新页面

在 `src/renderer/pages/` 中创建新组件，然后在 `App.tsx` 中添加路由：

```typescript
case 'newpage':
  return <NewPageComponent />
```

### 2. 添加新API接口

在 `src/main/backend/routes/` 中创建新路由文件，然后在 `server.ts` 中注册：

```typescript
app.use(newRoutes(db))
```

### 3. 调用API

在前端使用已定义的API客户端：

```typescript
import { projectAPI } from '@renderer/api'

const projects = await projectAPI.list()
```

### 4. 状态管理

使用Redux Toolkit创建新slice，然后在store中注册。

## 常见问题

### Q: 开发时出现"Cannot find module"错误
A: 确保已运行 `npm install`，并且路径别名在 `tsconfig.json` 中正确配置。

### Q: 后端服务无法启动
A: 检查端口3001是否被占用，或检查Node.js版本是否符合要求。

### Q: SQLite数据库初始化失败
A: 确保用户目录有写入权限，或删除之前的数据库文件重新初始化。

### Q: Puppeteer无法启动浏览器
A: 某些环境可能需要安装额外的系统依赖。参考 [Puppeteer文档](https://pptr.dev/category/guides)。

## 下一步开发

当前项目已完成基础架构搭建。接下来需要完成：

1. **前端页面实现**
   - [ ] Projects 项目管理页面
   - [ ] TaskConfig 任务配置页面
   - [ ] ProxyManagement 代理管理页面
   - [ ] Analytics 统计分析页面
   - [ ] Settings 设置页面

2. **核心功能实现**
   - [ ] Puppeteer集成和浏览器自动化
   - [ ] Worker线程池实现
   - [ ] BullMQ任务队列集成
   - [ ] 代理轮换策略实现
   - [ ] 行为模拟功能（User-Agent、延迟、交互等）

3. **高级功能**
   - [ ] 定时调度任务
   - [ ] WebSocket实时进度推送
   - [ ] 代理可用性检测
   - [ ] 详细的错误处理和重试机制
   - [ ] 数据导出功能

## 支持和帮助

遇到问题？
1. 检查 [完整设计文档](./2026-05-07-traffic-booster-design.md)
2. 查看 [README.md](../README.md)
3. 查看代码中的注释和类型定义
4. 检查浏览器开发工具和终端输出的错误信息

祝开发愉快！🚀
