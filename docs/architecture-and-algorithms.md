# 智能电梯监控系统：架构与算法技术参考

更新时间：2025-08-13

本文档面向研发/架构/运维团队，梳理当前系统亮点，并围绕“设备状态监测/监控”提出一套可落地的新算法与工程化改进路径，帮助项目更完整、更独特、更可维护。

---

## 1. 项目概览与目录

- 前端（Vue 3 + Vite）：`frontend/`
  - 核心文件与模块：
    - WebSocket 客户端：`frontend/src/services/elevatorSocketService.js`
    - 异常采集/阈值检测：`frontend/src/services/DataCollectionService.js`
    - AI 前端模拟/直连 DeepSeek：`frontend/src/api/aiSimulation.js`
    - 异常数据 API：`frontend/src/api/abnormalData.js`
    - 主看板：`frontend/src/views/Dashboard.vue`
    - 系统关系图：`frontend/src/views/SystemRelationshipChart.vue`
    - 路由与权限：`frontend/src/router/index.js`

- 后端（Spring Boot + MyBatis-Plus + WebSocket + Spring AI）：`backend/`
  - WebSocket 配置：`backend/src/main/java/com/example/V1/config/WebSocketConfig.java`
  - WebSocket 处理：`backend/src/main/java/com/example/V1/Handler/ElevatorSocketHandler.java`
  - 异常与 AI 分析服务：`backend/src/main/java/com/example/V1/service/impl/DataETableServiceImpl.java`
  - 控制器：
    - 异常数据：`backend/src/main/java/com/example/V1/controller/DataETableController.java`
    - AI 表：`backend/src/main/java/com/example/V1/controller/AiTableController.java`
    - 维护单：`backend/src/main/java/com/example/V1/controller/MaintainTableController.java`
    - 用户：`backend/src/main/java/com/example/V1/controller/UsersController.java`
  - AI/知识/调度等配置：
    - `AiPredictsLifespanConfig.java`, `BuildPromptWithKnowleConfig.java`, `KnowledgeLoader.java`, `ScheduleConfig.java`
  - 配置文件：`backend/src/main/resources/application.yml`
  - 预置数据：`backend/src/main/resources/SQL/h2_data_import.sql`

---

## 2. 现有亮点（算法与独特功能）

- 运行时实时监控与控制（WebSocket）
  - 前端 `ElevatorSocketService` 持续接收状态、发送控制（如层站、开关门、急停）。
  - 后端 `ElevatorSocketHandler` 维护 `elevatorId` 级会话与状态，配合 `service/impl/Elevator.java` 的电梯状态机逻辑（仿真/调度）。

- 前端阈值驱动的异常检测与批量上报
  - `DataCollectionService.js` 周期采样、单/多指标阈值判断、异常队列与批量提交，支持回调联动 UI 和控制策略。

- AI 异常分析与寿命预测（RUL）
  - 后端 `DataETableServiceImpl` 通过 Spring AI 的 `OpenAiChatModel` 生成结构化分析/建议；`/lifetime-analysis` 提供寿命预测接口。
  - 结合 `PromptKnowledge/KnowledgeLoader` 做知识增强提示词构建。

- 可视化能力
  - `Dashboard.vue` 综合状态、控制与异常视图；`SystemRelationshipChart.vue` 系统关系总览；ECharts + 3D 模型组件。

- 权限与业务闭环
  - `router/index.js` 基于角色的路由控制；`MaintainTableController` 等维护单/任务闭环，具备从告警到处置的业务链路。

---

## 3. 当前端到端数据流（简图）

1) WebSocket：`frontend` ⇄ `backend`
- 前端通过 `/ws/elevator/status/{elevatorId}` 订阅状态、发送控制。
- 后端按会话推送实时状态更新，并接收/执行控制指令。

2) 异常管道：`frontend` → `backend`
- 前端采样 → 阈值检测 → 异常入队/批量 → REST 上报 `abnormalData`。
- 后端入库 → 触发 AI 分析 → 存储 AI 结论/建议 → 提供分页/查询/寿命预测接口。

3) AI 路径：`backend`（推荐统一代理）
- 目前前端 `aiSimulation.js` 存在直连 DeepSeek 用法（密钥暴露风险），建议统一迁至后端代理。

---

## 4. 主要风险与工程改进（架构层）

- WebSocket 韧性不足：缺少指数退避重连、心跳检测、指令 ACK/超时重试、离线队列与初始快照。
- 前端直连 AI：密钥暴露、安全不可控；建议全部经后端代理，并输出严格 JSON。
- 异常模型分裂：阈值仅在前端；建议后端建立统一 JSON Schema 与二次校验/关键指标后验检测。
- 安全：WebSocket CORS 过宽；缺少 JWT 鉴权与 WS 连接鉴权。
- 数据库演进：开发用 H2，缺少迁移工具（Flyway/Liquibase）与生产库配置。
- 可观测性：缺少结构化日志、关联 ID、WS/AI 指标与健康检查。

---

## 5. 新增算法与监控能力建议（可落地清单）

围绕“更准确、更稳健、更可解释”的目标，分层实施：

### 5.1 特征工程与传感融合（所有算法的基础）
- 派生特征：速度/加速度/加加速度（jerk）、门开闭时间分布、温升速率、震动频域特征（FFT 频带能量）。
- 统计窗口：滑窗均值/方差/偏度/峰度、EWMA 指标；工作循环/高峰时段分段特征。
- 设备上下文：载重、环境温度、维护后“里程”特征（`MaintainTable` 重置里程）。

### 5.2 无监督多变量异常检测（在线优先）
- Isolation Forest / LOF / One-Class SVM：多维特征上检测异常分数，适合无标签阶段。
- 在线/流式检测：ADWIN、Page-Hinkley 监测分布漂移（概念漂移报警）。
- 实施建议：后端新增 `anomaly-engine` 模块，使用 Java ML 库（如 Tribuo/Smile/Weka）或独立 Python 微服务（scikit-learn + FastAPI），以 gRPC/HTTP 统一服务接口。

### 5.3 时序异常检测
- 统计类：Holt-Winters/ARIMA 做单指标残差异常；对门开闭时间、层间运行时间等序列建模。
- 深度时序：LSTM/GRU/Temporal CNN 对多变量序列建模，输出异常分数或重构误差（Autoencoder）。
- 实施建议：模型离线训练 + 在线推理服务；版本化模型与阈值，灰度切换。

### 5.4 寿命预测（RUL）与健康指数（HI）
- 统计寿命模型：Weibull/Gompertz 拟合与分组回归（按设备/载荷/环境分层）。
- 生存分析：CoxPH/RSF（随机生存森林）结合维护记录与异常历史。
- 退化建模：依据震动、温升、门故障率构建健康指数 HI，映射到 RUL。
- 贝叶斯更新：新观测到来后对 RUL 进行后验更新，提高稳定性。

### 5.5 诊断与可解释性
- 规则+概率融合：基于知识库（`PromptKnowledge`）的规则引擎 + 朴素贝叶斯/贝叶斯网络对根因进行打分，产出“可执行建议”。
- SHAP/特征归因：对监督模型输出提供关键特征贡献，便于运维理解。

### 5.6 人机协同与主动学习
- 维护反馈闭环：将 `MaintainTable` 的处置结果作为弱标签，持续改进监督/半监督模型。
- 主动学习：对低置信度告警请求人工确认，优化标注效率与模型边界。

### 5.7 异常优先级与调度
- 多维打分：风险×影响×可修复性，计算“处置优先级”。
- 调度建议：结合工单量、地理位置、故障类型，输出推荐调度（可渐进引入约束优化）。

---

## 6. 协议与 Schema（建议）

为减少耦合与演进风险，统一消息/事件/异常的 JSON Schema 与版本：

- 指令（需 ACK/超时重试）
```json
{
  "commandId": "uuid-1234",
  "type": "GO_TO_FLOOR",
  "payload": { "targetFloor": 12 },
  "ts": 1723512345000,
  "version": "v1"
}
```

- 状态事件（初始快照 + 增量）
```json
{
  "event": "STATE_UPDATE",
  "elevatorId": "ELEV-01",
  "state": { "floor": 8, "speed": 1.2, "door": "CLOSED", "mode": "NORMAL" },
  "ts": 1723512348000,
  "version": "v1"
}
```

- 异常记录（前/后端统一校验）
```json
{
  "id": "auto-db-id",
  "elevatorId": "ELEV-01",
  "system": "traction|guidance|electrical|door",
  "metric": "motorTemp",
  "value": 92.3,
  "threshold": 85,
  "unit": "C",
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "detectedAt": "2025-08-13T01:20:45Z",
  "source": "frontend|backend",
  "context": { "speed": 1.2, "load": 78 },
  "version": "v1"
}
```

- AI 输出（强结构化 + 版本化）
```json
{
  "analysisVersion": "p1-v3",
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "rootCauses": ["overheat", "door-sensor-noise"],
  "confidence": 0.87,
  "recommendedActions": [
    { "action": "reduceLoad", "priority": "P1", "etaHours": 0 },
    { "action": "inspectDoorSensor", "priority": "P2", "etaHours": 24 }
  ],
  "rulDays": 120
}
```

---

## 7. 工程落地与架构改造

- WebSocket 增强（前端 `elevatorSocketService.js` + 后端 `ElevatorSocketHandler`）
  - 指数退避重连（含抖动）、心跳 ping/pong、离线指令队列、ACK/幂等、连接就绪快照。

- AI 后端代理化（移除前端直连）
  - 前端 `aiSimulation.js` 改为调用后端代理；后端统一密钥管理（`application.yml`/环境变量），严格 JSON 输出与校验，错误重试/熔断。

- 统一 Schema 与 SDK
  - 后端 OpenAPI/JSON Schema 发布；自动生成 TypeScript 客户端，减少前端/后端模型偏差。

- 异常分析引擎模块化
  - 新增 `anomaly-engine`（后端）：特征抽取、模型管理、推理服务接口；可选独立 Python 服务化，HTTP/gRPC 接入。

- 数据库与迁移
  - 引入 Flyway/Liquibase；准备 MySQL/Postgres 配置用于测试/生产；保留 H2 用于本地快速启动。

- 安全与鉴权
  - JWT 鉴权与角色控制；WebSocket 连接时校验 Token；CORS 收紧到可信来源。

- 可观测性
  - 结构化日志 + 关联 ID（前端 `commandId` 贯穿）；指标（WS 连接、重连、AI 延迟/错误率、异常入库延迟）；健康检查与合成监控。

---

## 8. 迭代路线（里程碑）

- M1（安全/稳定，1–2 周）
  - AI 代理后端化；WebSocket 心跳/重连/ACK；统一异常/事件 Schema v1。

- M2（一致性/智能化，1 周）
  - 无监督异常检测（IF/LOF/OCSVM）最小可用；模型与阈值版本化；后端二次校验关键指标。

- M3（时序与RUL，1–2 周）
  - 时序异常（Holt-Winters/ARIMA 或 LSTM-AE）上线；初版 RUL（Weibull/生存分析）。

- M4（运营与可视化，0.5–1 周）
  - 可观测性完善；Dashboard 增强：连接状态、指令反馈、AI 建议卡片与筛选；文档与 Onboarding。

---

## 9. 本地运行与配置（简要）

- 后端：配置 `application.yml`（H2/AI base-url/key 等），启动 Spring Boot。
- 前端：`vite.config.js` 代理到 `localhost:8080`，按环境配置 WebSocket base。
- 启动顺序：后端 → 前端 → `Dashboard` 检查实时状态/异常流与寿命预测接口。

---

## 10. 参考与关联代码清单（非穷尽）

- WebSocket：`config/WebSocketConfig.java`、`Handler/ElevatorSocketHandler.java`、`frontend/src/services/elevatorSocketService.js`
- 异常/AI：`service/impl/DataETableServiceImpl.java`、`controller/DataETableController.java`、`frontend/src/services/DataCollectionService.js`、`frontend/src/api/abnormalData.js`
- AI 配置：`backend/src/main/resources/application.yml`（`spring.ai.openai`）
- 知识与提示词：`config/BuildPromptWithKnowleConfig.java`、`config/KnowledgeLoader.java`
- 业务闭环：`MaintainTableController.java`、`AiTableController.java`
- 可视化：`frontend/src/views/Dashboard.vue`、`frontend/src/views/SystemRelationshipChart.vue`

---

## 摘要

- 本系统已具备“实时监控 + 异常检测 + AI 分析 + 维护闭环”的坚实基础。
- 建议优先实现：AI 后端代理化、WebSocket 韧性、统一 Schema 与后端二次检测；随后引入无监督/时序/RUL 等算法提升准确性与可解释性。
- 通过模块化的 `anomaly-engine` 与可观测性建设，确保智能化能力可持续演进并可被业务稳定消费。
