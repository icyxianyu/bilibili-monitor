# Bilibili 直播监控工具

实时监控 Bilibili 直播间，支持弹幕采集、AI 语义分析、Webhook 推送和 Web 数据看板。

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填写 BILIBILI_ROOM_ID 和 LLM_API_KEY

# 3. 启动后端
pnpm dev:backend

# 4. 启动前端（新终端）
pnpm dev:web
```

访问 http://localhost:3001 打开监控面板，或 http://localhost:3000/health 检查后端状态。

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
| `BILIBILI_ROOM_ID` | 监控的直播间 ID | **必填** |
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
| `GET /health` | 健康检查 |
| `GET /api/stream/status` | 直播间当前状态 |
| `GET /api/events` | 事件历史（分页，支持 type 过滤） |
| `GET /api/danmaku` | 弹幕历史 |
| `GET /api/analysis/latest` | 最新 AI 分析结果 |
| `GET /sse` | Server-Sent Events 实时推送 |
