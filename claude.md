# 智云梯 (Smart Cloud Elevator) - 项目架构分析文档

> **文档版本**: v1.0  
> **创建时间**: 2025年  
> **用途**: 为Claude AI提供完整的项目架构理解  
> **项目定位**: 基于AI/ML的电梯实时监控、异常检测与寿命预测系统

---

## 1. 项目概览

### 1.1 技术栈总览
```
前端: Vue 3 + Vite + Element Plus + ECharts + Three.js + TensorFlow.js
后端: Spring Boot 3.5 + MyBatis Plus + WebSocket + Spring AI + H2数据库
AI集成: DeepSeek API + 知识库增强 + 前端ML推理
数据处理: Python数据生成器 + CSV数据集 + 实时数据流
```

### 1.2 核心功能
- **实时监控**: WebSocket双向通信，电梯状态实时更新
- **异常检测**: 前端规则引擎 + TensorFlow.js ML模型 + 后端AI深度分析
- **寿命预测**: 基于异常数据的RUL (Remaining Useful Life) 预测
- **智能诊断**: 结合知识库的故障诊断和维修建议
- **3D可视化**: Three.js 3D电梯组件展示
- **权限管理**: 基于角色的多用户访问控制

---

## 2. 架构设计

### 2.1 系统架构图
```
┌─────────────────┐    WebSocket     ┌─────────────────┐
│   Vue 3 前端    │ ←──────────────→ │  Spring Boot    │
│                 │                  │     后端        │
│ • Dashboard     │    HTTP/REST     │                 │
│ • 3D Visualizer │ ←──────────────→ │ • Controllers   │
│ • ML Analyzer   │                  │ • Services      │
│ • Rule Engine   │                  │ • WebSocket     │
└─────────────────┘                  └─────────────────┘
         │                                    │
         │ TensorFlow.js                      │ Spring AI
         ▼                                    ▼
┌─────────────────┐                  ┌─────────────────┐
│   前端ML推理    │                  │   DeepSeek API  │
│                 │                  │   + 知识库      │
│ • 规则引擎      │                  │                 │
│ • 异常检测      │                  │ • 深度分析      │
│ • 实时分析      │                  │ • 寿命预测      │
└─────────────────┘                  └─────────────────┘
```

### 2.2 数据流架构
```
传感器数据 → 前端采集 → 规则检测 → ML增强 → 后端API → AI分析 → 存储 → 可视化展示
     ↓           ↓         ↓        ↓        ↓        ↓       ↓         ↓
  WebSocket   阈值判断  TF.js模型  批量上传  深度分析  数据库  实时推送  Dashboard
```

---

## 3. 前端架构详解

### 3.1 技术组件
```javascript
// 核心依赖
- Vue 3.5.13 (Composition API)
- Vite 6.3.5 (构建工具)
- Element Plus 2.6.2 (UI组件库)
- ECharts 5.6.0 + vue-echarts 7.0.3 (图表)
- Three.js 0.178.0 (3D渲染)
- TensorFlow.js 4.22.0 (机器学习)
- Axios 1.10.0 (HTTP客户端)
- Pinia 3.0.3 (状态管理)
```

### 3.2 目录结构
```
frontend/src/
├── api/                    # API接口封装
│   ├── abnormalData.js    # 异常数据API
│   ├── maintenance.js     # 维护管理API
│   ├── users.js          # 用户管理API
│   └── config.js         # API配置
├── components/            # Vue组件
│   ├── ElevatorVisualizer.vue      # 电梯可视化主组件
│   ├── TractionModelViewer.vue     # 曳引系统3D展示
│   ├── DoorModelViewer.vue         # 门系统3D展示
│   ├── ElectricalModelViewer.vue   # 电气系统3D展示
│   ├── GuidanceModelViewer.vue     # 导向系统3D展示
│   ├── AICenterNotification.vue    # AI中心通知
│   ├── MLPerformanceMonitor.vue    # ML性能监控
│   └── SystemDashboard.vue         # 系统仪表盘
├── services/              # 核心服务
│   ├── elevatorSocketService.js    # WebSocket通信
│   ├── ElevatorMLAnalyzer.js      # ML分析引擎
│   ├── DataCollectionService.js   # 数据采集服务
│   ├── CSVDataLoader.js           # CSV数据加载器
│   └── authService.js             # 认证服务
├── views/                 # 页面视图
│   ├── Dashboard.vue              # 主仪表盘
│   ├── TractionSystem.vue         # 曳引系统详情
│   ├── DoorSystem.vue             # 门系统详情
│   ├── ElectricalSystem.vue       # 电气系统详情
│   ├── GuidanceSystem.vue         # 导向系统详情
│   ├── AbnormalData.vue           # 异常数据管理
│   └── MaintenanceLog.vue         # 维护日志
├── composables/           # Vue组合式函数
│   └── useAIAnalysis.js           # AI分析逻辑
└── utils/                # 工具函数
    ├── request.js                 # HTTP请求封装
    └── date.js                    # 日期处理
```

### 3.3 核心服务详解

#### 3.3.1 WebSocket服务 (elevatorSocketService.js)
```javascript
功能:
- 实时双向通信 (ws://localhost:8080/ws/elevator/status/{elevatorId})
- 命令发送: 楼层控制、门控制、紧急停止
- 状态订阅: 实时电梯状态更新
- 连接管理: 自动重连、错误处理

关键方法:
- connect(elevatorId, callback) - 建立连接
- goToFloor(elevatorId, floor) - 发送楼层指令  
- toggleDoor(elevatorId) - 门控制
- emergencyStop(elevatorId) - 紧急停止
```

#### 3.3.2 ML分析引擎 (ElevatorMLAnalyzer.js)
```javascript
特点:
- 版本: v5.0 - 真实数据集集成版
- 架构: 规则引擎 + TensorFlow.js 混合分析
- 数据源: CSV数据集 + 实时传感器数据
- 缓存优化: 分析结果缓存 + 训练数据缓存

核心算法:
1. 增强规则引擎 - 基于真实数据集的阈值分析
2. 神经网络模型 - 12维特征向量的异常检测
3. 历史上下文分析 - Z分数、异常率统计
4. 混合决策 - 规则+ML结果融合

参数体系:
- 曳引系统: 电机温度、电流、振动、轴承温度等
- 导向系统: 导轨偏差、导靴磨损、接头间隙
- 电气系统: 电压波动、触点电阻、响应时间  
- 门系统: 开关门时间、接触电阻、机械深度
```

#### 3.3.3 数据采集服务 (DataCollectionService.js)
```javascript
功能:
- 周期性数据采样 (默认5秒间隔)
- 多指标阈值检测
- 异常数据批量上报 (默认批次大小5)
- 回调机制支持UI联动

工作流程:
采样 → 阈值检测 → 异常入队 → 批量提交 → 后端API
```

---

## 4. 后端架构详解

### 4.1 技术组件
```xml
- Spring Boot 3.5.0 (核心框架)
- MyBatis Plus 3.5.11 (ORM框架)
- Spring AI 1.0.0-M8 (AI集成)
- H2 Database (内嵌数据库)
- WebSocket (实时通信)
- Lombok (代码简化)
- Jackson (JSON处理)
```

### 4.2 包结构
```
backend/src/main/java/com/example/V1/
├── config/                # 配置类
│   ├── WebSocketConfig.java        # WebSocket配置
│   ├── AiPredictsLifespanConfig.java  # AI寿命预测配置
│   ├── BuildPromptWithKnowleConfig.java # AI提示词构建
│   ├── KnowledgeLoader.java        # 知识库加载器
│   ├── CorsConfig.java             # 跨域配置
│   └── MybatisPlusConfig.java      # MyBatis配置
├── controller/            # 控制器层
│   ├── DataETableController.java   # 异常数据控制器
│   ├── AiTableController.java      # AI分析控制器
│   ├── MaintainTableController.java # 维护管理控制器
│   └── UsersController.java        # 用户管理控制器
├── service/               # 服务层
│   ├── impl/
│   │   ├── DataETableServiceImpl.java # 异常数据服务实现
│   │   ├── AiTableServiceImpl.java    # AI分析服务实现
│   │   ├── Elevator.java              # 电梯状态机
│   │   └── MaintainTableServiceImpl.java # 维护服务实现
│   └── interface定义...
├── entity/                # 实体类
│   ├── DataETable.java             # 异常数据实体
│   ├── AiTable.java                # AI分析结果实体
│   ├── MaintainTable.java          # 维护记录实体
│   ├── Users.java                  # 用户实体
│   └── PromptKnowledge.java        # 知识库实体
├── Handler/               # 处理器
│   ├── ElevatorSocketHandler.java  # WebSocket处理器
│   └── LocalDateTimeTypeHandler.java # 时间类型处理器
├── Dto/                   # 数据传输对象
└── mapper/                # 数据访问层
```

### 4.3 核心服务详解

#### 4.3.1 WebSocket处理器 (ElevatorSocketHandler.java)
```java
功能:
- 维护电梯连接会话 Map<String, Elevator>
- 解析电梯ID从WebSocket路径
- 电梯实例生命周期管理 (start/stop)
- 命令处理和状态推送

连接流程:
1. 提取elevatorId从URL路径
2. 创建Elevator实例并启动
3. 加入连接池管理
4. 处理实时命令和状态同步
```

#### 4.3.2 数据服务实现 (DataETableServiceImpl.java)
```java
核心业务:
1. 异常数据接收 (getgainData)
   - 数据验证和默认值设置
   - 数据库存储
   - AI分析调用
   - 结果存储和返回

2. AI深度分析流程:
   - 构建知识增强提示词
   - 调用DeepSeek API
   - JSON响应解析和清洗
   - 严重等级和建议提取

3. 寿命预测 (getLifetimeAnalysis)
   - 基于历史异常数据
   - AI驱动的RUL计算
   - 专业维护建议

4. 数据查询和分页
   - 支持多条件筛选
   - 携带AI分析结果的复合查询
   - 分页优化
```

#### 4.3.3 AI集成配置
```yaml
# application.yml
spring:
  ai:
    openai:
      api-key: sk-*** # DeepSeek API密钥
      base-url: https://api.deepseek.com
      chat:
        options:
          model: deepseek-chat

# 知识库配置
knowledge.jsonl - 预训练知识库
PromptKnowledge实体 - 知识项结构化存储
```

---

## 5. 数据层设计

### 5.1 数据库设计
```sql
-- 核心表结构
data_e_table:     异常数据主表
ai_table:         AI分析结果表  
maintain_table:   维护记录表
users:           用户表

-- 关联关系
data_e_table.id ← ai_table.e_id (一对一)
maintain_table ← 业务关联维护工单
```

### 5.2 数据集体系
```
data/目录:
├── elevator_traction_specialized_dataset.csv      # 曳引系统专业数据集
├── elevator_door_specialized_dataset.csv          # 门系统专业数据集  
├── elevator_electrical_specialized_dataset.csv    # 电气系统专业数据集
├── elevator_guidance_specialized_dataset.csv      # 导向系统专业数据集
├── elevator_anomaly_master_dataset.csv           # 主数据集(21MB)
└── data_generator.py                              # Python数据生成器

数据特征:
- 基于真实物理规则生成
- 包含正常、警告、严重三个等级
- 多系统参数相关性建模
- 时序特征和上下文环境
```

### 5.3 数据流转
```
1. 实时数据流:
   传感器 → WebSocket → 前端采集 → 阈值检测 → 异常上报 → 后端AI → 存储

2. 历史数据流:  
   CSV数据集 → 前端加载 → ML模型训练 → 推理缓存 → 分析增强

3. AI分析流:
   异常数据 → 知识库增强 → DeepSeek API → JSON解析 → 结构化存储
```

---

## 6. AI/ML集成架构

### 6.1 多层AI架构
```
层级1: 前端实时分析
├── 规则引擎 (基于阈值的快速检测)
├── TensorFlow.js 轻量模型 (12维特征神经网络)  
├── 历史统计分析 (Z分数、异常率)
└── 混合决策 (规则+ML融合)

层级2: 后端深度分析  
├── Spring AI集成
├── DeepSeek API调用
├── 知识库增强提示词
└── 结构化输出 (故障类型、严重等级、维修建议)

层级3: 寿命预测
├── 基于异常历史的统计建模
├── 设备退化趋势分析  
├── RUL计算
└── 维护计划建议
```

### 6.2 模型特征工程
```javascript
// 12维特征向量构建
特征组成:
1. 标准化参数值
2. 对数特征 log(|value| + 1)
3. 平方特征 value²  
4. 负载权重特征
5. 速度特征
6. 运行小时数特征
7. 环境温度特征
8. 湿度特征  
9. 维护间隔特征
10. 时间周期特征
11. 噪声特征
12. 原始异常评分
```

### 6.3 AI提示词架构
```java
// 提示词构建流程
1. 加载知识库 (knowledge.jsonl)
2. 提取相关经验案例 (Q&A对)
3. 结合当前异常数据
4. 构建结构化提示词
5. 强制JSON格式输出
6. 包含故障分析、严重等级、维修建议
```

---

## 7. 实时通信架构

### 7.1 WebSocket通信协议
```javascript
// 连接URL格式
ws://localhost:8080/ws/elevator/status/{elevatorId}

// 消息格式
命令消息: {
  elevatorId: "EL-001",
  command: "GOTO_FLOOR|TOGGLE_DOOR|EMERGENCY_STOP",
  floor?: number,
  timestamp: number
}

状态消息: {
  elevatorId: "EL-001", 
  currentFloor: number,
  targetFloor: number,
  status: string,
  speed: number,
  direction: string,
  doorStatus: string,
  // ... 更多状态字段
}
```

### 7.2 状态管理
```java
// 后端电梯状态机 (Elevator.java)
功能:
- 楼层运动模拟
- 门控制逻辑
- 速度计算
- 异常状态处理
- 周期性状态推送

前端状态同步:
- Vue 3响应式状态
- WebSocket消息驱动更新
- 断线重连机制
- 离线状态提示
```

---

## 8. 用户界面架构

### 8.1 主要视图组件
```vue
Dashboard.vue - 主仪表盘
├── ElevatorVisualizer - 电梯3D可视化
├── ControlPanel - 控制面板
├── AICenterNotification - AI通知中心
├── AbnormalDataLog - 异常数据日志
├── HeaderPanel - 头部面板
└── FooterPanel - 底部面板

SystemViews - 系统详情页
├── TractionSystem.vue - 曳引系统
├── DoorSystem.vue - 门系统  
├── ElectricalSystem.vue - 电气系统
└── GuidanceSystem.vue - 导向系统
```

### 8.2 3D可视化
```javascript
// Three.js 3D组件
TractionModelViewer - 曳引机3D模型
DoorModelViewer - 门机3D模型
ElectricalModelViewer - 电气柜3D模型
GuidanceModelViewer - 导轨3D模型

特性:
- 实时状态反映 (颜色、动画)
- 交互式操作
- 异常状态高亮
- 性能优化渲染
```

### 8.3 权限路由
```javascript
// 角色权限体系
admin: 完整管理权限
maintenance: 维护工作权限

// 路由守卫
beforeEach: JWT Token验证
角色检查: meta.roles数组匹配
默认重定向: 基于角色的首页
```

---

## 9. 部署和配置

### 9.1 开发环境
```bash
# 后端启动
cd backend
mvn spring-boot:run

# 前端启动  
cd frontend
npm install
npm run dev

# 访问地址
前端: http://localhost:5173
后端: http://localhost:8080
H2控制台: http://localhost:8080/h2-console
```

### 9.2 生产构建
```xml
<!-- Maven配置包含前端构建 -->
frontend-maven-plugin:
- 自动安装Node.js 18.17.0
- npm install依赖安装
- npm run build前端构建  
- 静态文件复制到后端resources

最终产物: 单一可执行JAR包
```

### 9.3 关键配置
```yaml
# application.yml关键配置
spring:
  datasource: H2数据库配置
  ai.openai: DeepSeek API配置
  h2.console: 开发调试
  jackson: JSON序列化配置
server:
  port: 8080
mybatis-plus: 
  配置和SQL映射
```

---

## 10. 性能和优化

### 10.1 前端优化
```javascript
// ML分析器优化
- 结果缓存机制 (analysisCache)
- 训练数据缓存 (trainingDataCache)  
- Web Worker支持 (数据处理后台化)
- 按需模型加载
- 推理性能监控

// 3D渲染优化
- 按需渲染
- LOD级别控制
- 几何体复用
- 材质优化
```

### 10.2 后端优化
```java
// 数据库优化
- MyBatis Plus分页
- 索引优化
- 连接池配置

// AI调用优化  
- 异步处理
- 错误重试机制
- 响应缓存
- 提示词优化
```

### 10.3 通信优化
```javascript
// WebSocket优化
- 心跳检测
- 断线重连
- 消息压缩
- 批量状态更新

// HTTP优化
- Axios拦截器
- 请求去重  
- 响应缓存
- 超时控制
```

---

## 11. 安全考虑

### 11.1 认证授权
```javascript
// JWT Token机制
- 登录验证
- Token刷新
- 角色权限检查
- 路由守卫

// API安全
- CORS配置
- 请求头验证
- 参数校验
- SQL注入防护
```

### 11.2 数据安全
```java
// 敏感信息保护
- 环境变量配置
- API密钥管理
- 数据传输加密
- 日志脱敏
```

---

## 12. 监控和维护

### 12.1 系统监控
```javascript
// 前端监控
- ML模型性能统计
- WebSocket连接状态
- 异常检测准确率
- 用户操作统计

// 后端监控  
- API响应时间
- 数据库性能
- AI服务调用统计
- 系统资源使用
```

### 12.2 日志体系
```java
// 结构化日志
- 操作审计日志
- 异常错误日志  
- 性能分析日志
- WebSocket通信日志
```

---

## 13. 扩展性设计

### 13.1 模块化架构
```
组件化设计:
- 前端组件可独立开发测试
- 后端服务层分离
- AI模块可插拔
- 数据源适配器模式

API版本化:
- RESTful API版本控制
- WebSocket协议向后兼容
- 数据库迁移支持
```

### 13.2 未来扩展方向
```
1. 多电梯支持 (电梯群控)
2. 边缘计算集成 (IoT设备直连)
3. 更复杂的AI模型 (深度学习)
4. 预测性维护优化
5. 移动端APP支持
6. 云服务部署
```

---

## 14. 开发注意事项

### 14.1 代码规范
```javascript
// 前端
- Vue 3 Composition API优先
- TypeScript类型安全(推荐)  
- ESLint代码规范
- 组件命名规范

// 后端
- Spring Boot最佳实践
- MyBatis Plus规范
- Lombok使用规范
- 异常处理统一
```

### 14.2 测试策略
```
单元测试:
- 前端组件测试
- 后端服务测试
- ML模型测试

集成测试:
- API接口测试
- WebSocket通信测试
- 数据库集成测试

性能测试:
- 并发连接测试
- AI推理性能测试
- 3D渲染性能测试
```

---

## 15. 故障排查指南

### 15.1 常见问题
```
1. WebSocket连接失败
   - 检查后端服务状态
   - 验证端口配置
   - 查看网络连接

2. AI分析失败
   - 检查API密钥配置
   - 验证网络连接
   - 查看提示词格式

3. 3D渲染问题
   - 检查WebGL支持
   - 验证Three.js版本
   - 查看浏览器控制台

4. 数据库连接问题  
   - 检查H2数据库文件
   - 验证连接配置
   - 查看SQL执行日志
```

### 15.2 调试工具
```
前端调试:
- Vue DevTools
- Chrome DevTools
- Network面板监控
- Console日志分析

后端调试:
- IDEA调试器
- H2控制台
- 日志文件分析
- Spring Boot Actuator

WebSocket调试:
- 浏览器WebSocket面板
- WebSocket测试工具
- 连接状态监控
```

---

## 16. 总结

智云梯项目是一个技术栈丰富、架构设计完善的现代化电梯监控系统。它成功地将前端Vue生态、后端Spring生态、AI/ML技术和实时通信技术有机结合，形成了一个功能完整、性能优良的监控解决方案。

### 核心优势
1. **技术先进**: 采用最新的技术栈和架构模式
2. **功能完整**: 覆盖监控、分析、预测、维护全流程  
3. **扩展性强**: 模块化设计便于功能扩展
4. **用户体验**: 3D可视化和实时交互提供优秀体验
5. **AI驱动**: 多层AI架构提供智能化分析能力

### 技术亮点
1. **前后端分离**: 清晰的职责分工和API设计
2. **实时通信**: WebSocket双向通信确保数据实时性
3. **混合AI**: 前端轻量级ML + 后端深度AI分析
4. **3D可视化**: Three.js提供丰富的交互体验
5. **数据驱动**: 基于真实数据集的算法优化

这个架构文档为后续的开发、维护和扩展提供了全面的技术指南。 