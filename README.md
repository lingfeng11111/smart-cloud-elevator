# 智云梯 - Smart Cloud Elevator

一个基于 AI/ML 的电梯实时监控、异常检测与寿命预测系统。前端 Vue 3 + Vite，后端 Spring Boot + WebSocket，内置规则引擎与可选 TF.js 轻量模型增强，并可调用云端大模型进行深度分析。

## 目录与架构

```
zhiyunti/
├─ backend/    # Spring Boot 服务（WebSocket、REST、AI代理、H2 数据库）
├─ frontend/   # Vue 3 + Vite 前端（仪表盘、可视化、前端规则/ML分析）
├─ data/       # 示例与真实数据集（CSV 等）
└─ docs/       # 架构与算法说明
```

- 实时通信：`/ws/elevator/status/{elevatorId}`
- 异常分析：前端 规则优先 + ML 增强；后端 调用大模型并结合知识库输出结构化 JSON
- 数据库：默认 H2（开发），控制台 `/h2-console`

## 快速开始

### 1) 后端（Java 11+，Maven 3.6+）

强烈建议用环境变量注入大模型信息，避免在 `application.yml` 暴露密钥。

```bash
# 必需：替换为你的真实值
export SPRING_AI_OPENAI_API_KEY=YOUR_KEY
export SPRING_AI_OPENAI_BASE_URL=https://api.deepseek.com
export SPRING_AI_OPENAI_CHAT_OPTIONS_MODEL=deepseek-chat

cd backend
mvn spring-boot:run
```

- 后端默认地址：`http://localhost:8080`
- H2 控制台：`http://localhost:8080/h2-console`

> 如需使用非 H2 数据库，建议引入 Flyway/Liquibase 并调整 `application.yml`。

### 2) 前端（Node.js 16+）

```bash
cd frontend
npm install
npm run dev
```

- 前端开发地址：`http://localhost:5173`
- WebSocket 将连接后端 `/ws/elevator/status/{elevatorId}`（默认示例电梯 ID 可在前端页面设置）

## 主要能力

- 实时监控：楼层、速度、门状态、方向、温度、载荷等指标
- 异常检测：阈值规则 + 在线统计（EWMA/CUSUM 元信息）+ 可选 TF.js 轻量模型增强
- 云端深度分析：Spring AI 调用大模型，结合 `knowledge.jsonl` 输出结构化结论（严重等级/建议/RUL）
- 可视化：Dashboard、系统关系视图、参数曲线、3D 组件

更多细节见 `docs/architecture-and-algorithms.md`。

## 配置要点（安全）

- 不要将密钥写入 `application.yml`；使用环境变量覆盖 `spring.ai.openai.*`
- 若曾提交过密钥，请立即在服务商重置并强制失效旧密钥

## 常见问题

- 前端/后端联不通：检查后端端口（8080）、前端代理与 WebSocket URL 是否一致
- H2 控制台无法登录：确保 JDBC URL、用户名（默认 `sa`）与驱动匹配
- 大模型响应非 JSON：后端已做清洗与解析，但建议在提示词中强制 `json_object` 格式

## 变更说明

- backend、frontend 现为普通文件夹，已与父仓库分离（非子模块）。

## 许可证

MIT License

## 维护者

- lingfeng11111（GitHub） 