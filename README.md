# Bilibili 直播监控工具

实时监控 Bilibili 直播间，支持弹幕采集、AI 语义分析、Webhook 推送和 Web 数据看板。

## 技术栈

- **后端**：Node.js + TypeScript + Express + SQLite（better-sqlite3）
- **前端**：Next.js 15 + React 18 + Tailwind CSS + Recharts
- **包管理**：pnpm workspace（Monorepo）

## 项目结构

```
bilibili-monitor/
├── apps/
│   ├── backend/          # 后端服务
│   │   └── src/
│   │       ├── analysis/     # AI 分析引擎（弹幕爆发检测 + LLM 调用）
│   │       ├── api/          # RESTful API + SSE 路由
│   │       ├── bilibili/     # B站协议（WebSocket brotli + HTTP 轮询 + WBI 签名）
│   │       ├── config/       # 环境变量配置
│   │       ├── core/         # 内部事件总线
│   │       ├── db/           # SQLite 数据访问层
│   │       ├── notification/ # Webhook 推送
│   │       └── main.ts       # 应用入口
│   └── web/              # Web 看板
│       ├── app/              # Next.js App Router
│       ├── components/       # 状态卡片、弹幕图表、事件时间线、AI 洞察
│       ├── hooks/            # SSE 连接 Hook
│       └── lib/              # API 客户端封装
└── packages/
    └── shared/           # 前后端共享类型定义
```

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填写 LLM_API_KEY（如需 AI 分析）

# 3. 一键启动（自动检测可用端口）
pnpm dev
```

或分别启动：

```bash
pnpm dev:backend   # 后端，默认 :3000
pnpm dev:web       # 前端，默认 :3001
```

访问 `http://localhost:3001` 打开监控面板（输入直播间号进入），或 `http://localhost:3000/health` 检查后端状态。

## Docker 部署

```bash
cp .env.example .env
# 编辑 .env

docker compose up -d
```

## 功能

- **HTTP 轮询**：每 30s 检测开播/下播/标题/分区变更
- **WebSocket 弹幕流**：实时接收 Bilibili 弹幕（brotli 协议），自动重连
- **弹幕爆发检测**：EMA 基线算法，3× 爆发或 30s 超 50 条触发
- **AI 分析**：弹幕爆发时立即分析 + 每 10 分钟定时分析，使用 OpenAI 兼容接口
- **Webhook 推送**：支持 HMAC-SHA256 签名
- **SSE 实时推送**：前端订阅实时事件
- **Web 看板**：直播状态、弹幕热度图、事件时间线、AI 洞察

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `BILIBILI_COOKIE` | B站 Cookie（可选，提高限速） | - |
| `LLM_BASE_URL` | LLM API 地址 | `https://api.openai.com/v1` |
| `LLM_API_KEY` | LLM API 密钥 | **必填** |
| `LLM_MODEL` | 模型名称 | `gpt-4o-mini` |
| `WEBHOOK_URL` | Webhook 接收地址 | - |
| `WEBHOOK_SECRET` | Webhook 签名密钥 | - |
| `HTTP_PORT` | 后端端口 | `3000` |
| `CORS_ORIGIN` | CORS 允许来源 | `http://localhost:3001` |
| `DATABASE_URL` | SQLite 文件路径 | `./data/monitor.db` |

## API

| 路径 | 说明 |
|------|------|
| `GET /health` | 健康检查（含当前活跃房间） |
| `GET /api/rooms/:roomId/stream/status` | 直播间当前状态 |
| `GET /api/rooms/:roomId/events` | 事件历史（分页，支持 type 过滤） |
| `GET /api/rooms/:roomId/danmaku` | 弹幕历史 |
| `GET /api/rooms/:roomId/analysis/latest` | 最新 AI 分析结果 |
| `POST /api/rooms/:roomId/analysis/manual` | 手动触发 AI 分析 |
| `GET /sse/:roomId` | Server-Sent Events 实时推送 |

## 事件类型

| 类型 | 说明 |
|------|------|
| `stream_start` | 开播 |
| `stream_stop` | 下播 |
| `title_change` | 标题变更 |
| `area_change` | 分区变更 |
| `danmaku_burst` | 弹幕爆发 |
| `llm_analysis` | AI 分析结果 |
