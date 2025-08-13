import axios from 'axios';
import { abnormalDataApi } from '../api';

/**
 * 数据采集服务
 * 负责收集智云梯系统数据，检测异常，并将异常数据发送给后端
 */
class DataCollectionService {
  /**
   * 初始化数据采集服务
   * @param {Object} options - 配置选项
   * @param {number} options.collectionInterval - 数据采集间隔(毫秒)
   * @param {number} options.batchSize - 异常数据批量发送大小
   */
  constructor(options = {}) {
    this.collectionInterval = options.collectionInterval || 5000; // 默认5秒采集一次
    this.batchSize = options.batchSize || 10; // 默认批量发送10条异常数据
    this.isCollecting = false;
    this.collectionTimer = null;
    this.anomalyQueue = [];
    this.lastSentTimestamp = Date.now();
    this.elevatorId = null;
    this.aiCheckTimer = null; // AI分析结果检查定时器
    this.aiAnalysisCallbacks = []; // AI分析结果回调函数列表
    this.anomalyCallbacks = []; // 异常检测回调函数列表
    
    // 日志导入的API
    console.log('DataCollectionService初始化，abnormalDataApi:', abnormalDataApi);

    // 轻量在线检测状态（不改变原有功能）：EWMA 与 CUSUM
    // key: `${systemName}::${paramName}`
    this._ewmaState = new Map(); // key -> { mean, var }
    this._cusumState = new Map(); // key -> { pos, neg }
    this._normalRangeCache = new Map(); // 可选缓存解析的正常范围
    this._detectorConfig = {
      ewmaAlpha: 0.2,      // EWMA 平滑系数（0-1）
      zThreshold: 3,       // z 分数参考阈值（仅用于解释，不改变判断）
      cusumKScale: 0.5,    // k = cusumKScale * std
      cusumHScale: 5       // h = cusumHScale * std
    };
  }

  /**
   * 设置智云梯ID
   * @param {string} elevatorId - 智云梯唯一标识
   */
  setElevatorId(elevatorId) {
    this.elevatorId = elevatorId;
  }

  /**
   * 开始数据采集（新接口，与Dashboard.vue兼容）
   * @returns {boolean} 是否成功启动采集
   */
  start() {
    if (this.isCollecting) {
      console.warn('数据采集已在进行');
      return false;
    }

    // 默认设置电梯ID
    if (!this.elevatorId) {
      this.elevatorId = 'EL-001';
    }

    this.isCollecting = true;

    // 不再自动检查AI分析结果
    console.log(`数据采集服务已启动，间隔: ${this.collectionInterval}ms`);
    return true;
  }

  /**
   * 停止数据采集（新接口，与Dashboard.vue兼容）
   */
  stop() {
    if (!this.isCollecting) {
      return;
    }

    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = null;
    }

    this.isCollecting = false;

    console.log(`数据采集服务已停止`);
  }

  /**
   * 开始数据采集
   * @param {Object} elevatorData - 智云梯数据对象
   * @param {Function} onAnomalyDetected - 异常检测回调函数
   * @returns {boolean} 是否成功启动采集
   */
  startCollection(elevatorData, onAnomalyDetected) {
    if (this.isCollecting || !this.elevatorId) {
      console.warn('数据采集已在进行或智云梯ID未设置');
      return false;
    }

    this.isCollecting = true;
    this.elevatorData = elevatorData;
    if (onAnomalyDetected && typeof onAnomalyDetected === 'function') {
      this.anomalyCallbacks.push(onAnomalyDetected);
    }

    // 启动定时采集
    this.collectionTimer = setInterval(() => {
      this.collectAndProcessData();
    }, this.collectionInterval);

    // 不再自动检查AI分析结果

    console.log(`智云梯 ${this.elevatorId} 数据采集已启动，间隔: ${this.collectionInterval}ms`);
    return true;
  }

  /**
   * 停止数据采集
   */
  stopCollection() {
    if (!this.isCollecting) {
      return;
    }

    clearInterval(this.collectionTimer);
    this.isCollecting = false;
    this.collectionTimer = null;

    // 发送剩余的异常数据
    if (this.anomalyQueue.length > 0) {
      this.sendAnomalyData();
    }

    // 不再需要清除AI分析结果检查定时器

    console.log(`智云梯 ${this.elevatorId} 数据采集已停止`);
  }

  /**
   * 采集并处理数据
   * @private
   */
  collectAndProcessData() {
    if (!this.elevatorData || !this.elevatorData.value) {
      console.warn('智云梯数据对象无效');
      return;
    }

    const currentData = this.elevatorData.value;
    const timestamp = Date.now();
    
    // 检测异常数据但不自动发送
    const anomalies = this.detectAnomalies(currentData, timestamp);

    // 如果检测到异常，只通知回调，但不自动发送到后端
    if (anomalies.length > 0) {
      // 触发回调
      this.notifyAnomalyCallbacks(anomalies);
      
      // 添加到队列，但不自动发送
      // 只在手动触发模拟异常时才发送
      this.anomalyQueue.push(...anomalies);
    }
  }

  /**
   * 注册异常回调
   * @param {Function} callback - 异常回调函数
   */
  onAnomaly(callback) {
    if (typeof callback === 'function') {
      this.anomalyCallbacks.push(callback);
    }
  }

  /**
   * 通知所有异常回调函数
   * @param {Object} anomalies - 异常数据
   * @private
   */
  notifyAnomalyCallbacks(anomalies) {
    this.anomalyCallbacks.forEach(callback => {
      try {
        callback(anomalies);
      } catch (error) {
        console.error('执行异常回调函数失败:', error);
      }
    });
  }

  /**
   * 生成参数键
   * @param {string} systemName
   * @param {string} paramName
   * @returns {string}
   * @private
   */
  _getParamKey(systemName, paramName) {
    return `${systemName || '未知系统'}::${paramName || '未知参数'}`;
  }

  /**
   * 更新并返回 EWMA 基线（均值与方差）
   * 使用指数加权移动平均与移动方差，在线 O(1)
   * @param {string} key
   * @param {number} x
   * @returns {{mean:number, std:number}}
   * @private
   */
  _updateEwma(key, x) {
    const alpha = this._detectorConfig.ewmaAlpha;
    if (!this._ewmaState.has(key)) {
      // 初始状态：用当前值初始化，避免 NaN
      this._ewmaState.set(key, { mean: x, var: 0 });
      return { mean: x, std: 0 };
    }
    const state = this._ewmaState.get(key);
    const prevMean = state.mean;
    const newMean = (1 - alpha) * prevMean + alpha * x;
    // 指数加权方差近似更新（West 1979 近似法）
    const diffPrev = x - prevMean;
    const diffNew = x - newMean;
    const newVar = (1 - alpha) * (state.var + alpha * diffPrev * diffNew);
    state.mean = newMean;
    state.var = Math.max(newVar, 0);
    this._ewmaState.set(key, state);
    return { mean: state.mean, std: Math.sqrt(state.var) };
  }

  /**
   * 更新并返回 CUSUM 状态
   * @param {string} key
   * @param {number} x
   * @param {number} mean - 当前基线均值
   * @param {number} std - 当前基线标准差
   * @returns {{pos:number, neg:number, k:number, h:number}}
   * @private
   */
  _updateCusum(key, x, mean, std) {
    const eps = 1e-6;
    const s = Math.max(std, eps);
    const k = this._detectorConfig.cusumKScale * s;
    const h = this._detectorConfig.cusumHScale * s;
    if (!this._cusumState.has(key)) {
      this._cusumState.set(key, { pos: 0, neg: 0 });
    }
    const state = this._cusumState.get(key);
    // 一侧/双侧 CUSUM
    state.pos = Math.max(0, state.pos + (x - mean - k));
    state.neg = Math.min(0, state.neg + (x - mean + k));
    this._cusumState.set(key, state);
    return { pos: state.pos, neg: state.neg, k, h };
  }

  /**
   * 检测异常数据
   * @param {Object} data - 智云梯数据
   * @param {number} timestamp - 时间戳
   * @returns {Array} 异常数据数组
   * @private
   */
  detectAnomalies(data, timestamp) {
    const anomalies = [];

    // 检查各系统参数
    if (data.systems && Array.isArray(data.systems)) {
      data.systems.forEach(system => {
        if (system.status === '故障') {
          // 系统级别异常
          anomalies.push({
            elevatorId: this.elevatorId,
            timestamp,
            systemId: system.id,
            systemName: system.name,
            type: 'system',
            status: system.status,
            faultCode: system.faultCode,
            temperature: system.temperature,
            parameters: JSON.stringify(system.parameters)
          });
        }

        // 参数级别异常
        if (system.parameters && Array.isArray(system.parameters)) {
          system.parameters.forEach(param => {
            // 根据不同参数类型判断是否异常
            let isAnomaly = false;
            let anomalyLevel = '';

            // 计算在线统计量（不改变原有判断，仅用于解释/评分）
            let detectionMeta = undefined;
            try {
              const numericValue = typeof param.value === 'number' ? param.value : Number(param.value);
              if (!Number.isNaN(numericValue)) {
                const key = this._getParamKey(system.name, param.name);
                const { mean, std } = this._updateEwma(key, numericValue);
                const z = std > 1e-6 ? (numericValue - mean) / std : 0;
                const { pos, neg, k, h } = this._updateCusum(key, numericValue, mean, std);
                detectionMeta = {
                  ewmaMean: Number.isFinite(mean) ? mean : null,
                  ewmaStd: Number.isFinite(std) ? std : null,
                  zScore: Number.isFinite(z) ? z : null,
                  cusumPos: Number.isFinite(pos) ? pos : null,
                  cusumNeg: Number.isFinite(neg) ? neg : null,
                  cusumK: k,
                  cusumH: h
                };
              }
            } catch (e) {
              // 安全兜底，任何统计异常不影响原有流程
              detectionMeta = undefined;
            }

            switch (param.name) {
              // 曳引系统参数
              case '电机温度':
                if (param.value > 80) {
                  isAnomaly = true;
                  anomalyLevel = param.value > 95 ? 'critical' : 'warning';
                }
                break;
              case '轴承温度':
                if (param.value > 85) {
                  isAnomaly = true;
                  anomalyLevel = param.value > 95 ? 'critical' : 'warning';
                }
                break;
              case '振动速度':
                if (param.value > 2.8) {
                  isAnomaly = true;
                  anomalyLevel = param.value > 4.5 ? 'critical' : 'warning';
                }
                break;
              case '电流':
                if (Math.abs(param.value - 18.5) > 1.85) {
                  isAnomaly = true;
                  anomalyLevel = Math.abs(param.value - 18.5) > 2.775 ? 'critical' : 'warning';
                }
                break;
              case '钢丝绳磨损':
                if (param.value > 8) {
                  isAnomaly = true;
                  anomalyLevel = param.value > 10 ? 'critical' : 'warning';
                }
                break;
              case '断丝数':
                if (param.value > 5) {
                  isAnomaly = true;
                  anomalyLevel = param.value > 8 ? 'critical' : 'warning';
                }
                break;
              case '制动间隙':
                if (param.value < 0.5 || param.value > 1.0) {
                  isAnomaly = true;
                  anomalyLevel = param.value > 1.5 ? 'critical' : 'warning';
                }
                break;
              
              // 导向系统参数
              case '导轨垂直度偏差':
                if (param.value > 0.5) {
                  isAnomaly = true;
                  anomalyLevel = param.value > 1.0 ? 'critical' : 'warning';
                }
                break;
              case '接头间隙':
                if (param.value > 0.45) {
                  isAnomaly = true;
                  anomalyLevel = param.value > 0.5 ? 'critical' : 'warning';
                }
                break;
              case '导靴磨损量':
                if (param.value > 2) {
                  isAnomaly = true;
                  anomalyLevel = param.value > 3 ? 'critical' : 'warning';
                }
                break;
              
              // 电气控制系统参数
              case '电压波动':
                if (Math.abs(param.value) > 10) {
                  isAnomaly = true;
                  anomalyLevel = Math.abs(param.value) > 15 ? 'critical' : 'warning';
                }
                break;
              case '电流负载':
                if (param.value > 100) {
                  isAnomaly = true;
                  anomalyLevel = param.value > 120 ? 'critical' : 'warning';
                }
                break;
              case '触点电压降':
                if (param.value > 50) {
                  isAnomaly = true;
                  anomalyLevel = param.value > 100 ? 'critical' : 'warning';
                }
                break;
              case '控制响应时间':
                if (param.value > 0.5) {
                  isAnomaly = true;
                  anomalyLevel = param.value > 1.0 ? 'critical' : 'warning';
                }
                break;
              
              // 门系统参数
              case '触点电阻':
                if (param.value > 0.5) {
                  isAnomaly = true;
                  anomalyLevel = param.value > 1.0 ? 'critical' : 'warning';
                }
                break;
              case '机械闭合深度':
                if (param.value < 7) {
                  isAnomaly = true;
                  anomalyLevel = param.value < 5 ? 'critical' : 'warning';
                }
                break;
              case '开关门时间':
                if (param.value < 2 || param.value > 3) {
                  isAnomaly = true;
                  anomalyLevel = param.value > 5 ? 'critical' : 'warning';
                }
                break;
              
              default:
                // 对于其他参数，使用通用判断逻辑
                if (param.normal && typeof param.value === 'number') {
                  // 如果有正常范围定义，检查是否在范围内
                  const normalRange = param.normal.toString();
                  if (normalRange.includes('-')) {
                    const [min, max] = normalRange.split('-').map(v => parseFloat(v));
                    if (param.value < min || param.value > max) {
                      isAnomaly = true;
                      anomalyLevel = 'warning';
                    }
                  } else if (normalRange.includes('≤')) {
                    const max = parseFloat(normalRange.replace('≤', ''));
                    if (param.value > max) {
                      isAnomaly = true;
                      anomalyLevel = 'warning';
                    }
                  } else if (normalRange.includes('≥')) {
                    const min = parseFloat(normalRange.replace('≥', ''));
                    if (param.value < min) {
                      isAnomaly = true;
                      anomalyLevel = 'warning';
                    }
                  }
                }
            }

            if (isAnomaly) {
              anomalies.push({
                elevatorId: this.elevatorId,
                timestamp,
                systemId: system.id,
                systemName: system.name,
                type: 'parameter',
                paramName: param.name,
                paramValue: param.value,
                paramUnit: param.unit,
                normalRange: param.normal,
                anomalyLevel,
                // 附加“解释与评分”元信息，用于前端展示与可解释性
                detector: detectionMeta
              });
            }
          });
        }
      });
    }

    return anomalies;
  }

  /**
   * 发送异常数据到后端
   * @private
   */
  async sendAnomalyData() {
    if (this.anomalyQueue.length === 0) {
      return;
    }

    try {
      const dataToSend = [...this.anomalyQueue];
      this.anomalyQueue = []; // 清空队列
      this.lastSentTimestamp = Date.now();

      console.log('准备发送异常数据:', dataToSend);
      
      try {
        // 将异常数据格式化为后端API接受的格式
        for (const anomaly of dataToSend) {
          // 根据不同系统类型构造异常数据对象
          const abnormalData = {
            systemName: anomaly.systemName,
            systemSqName: anomaly.type === 'parameter' ? anomaly.paramName : anomaly.faultCode || '未知',
            eName: this.elevatorId || '智云梯',
            eData: anomaly.type === 'parameter' ? anomaly.paramValue : anomaly.faultCode || 0
          };
          
          // 调用API发送异常数据
          const response = await abnormalDataApi.addAbnormalData(abnormalData);
          console.log(`成功发送异常数据:`, response.data);
        }
      } catch (apiError) {
        console.error('API调用失败，但不影响应用继续运行:', apiError);
        // 模拟成功响应，不将数据放回队列，避免队列无限增长
        console.log('API调用失败，丢弃异常数据');
      }
    } catch (error) {
      console.error('发送异常数据过程中发生严重错误:', error);
      // 发生意外错误时，不再将数据放回队列
    }
  }

  /**
   * 获取AI分析结果
   * @param {Object} anomalyData - 异常数据对象
   * @returns {Promise<Object>} AI分析结果
   */
  async getAIAnalysis(anomalyData) {
    try {
      console.log('尝试获取AI分析结果:', anomalyData);
      
      if (!anomalyData) {
        console.error('错误: 未提供异常数据');
        throw new Error('未提供异常数据');
      }
      
      // 确保必填字段不为空
      if (!anomalyData.systemName) {
        console.warn('systemName为空，设置默认值');
        anomalyData.systemName = '曳引系统';
      }
      
      if (!anomalyData.systemSqName) {
        console.warn('systemSqName为空，设置默认值');
        anomalyData.systemSqName = '未知组件';
      }
      
      try {
        // 调用API发送数据进行AI分析
        const response = await abnormalDataApi.sendDataToAI(anomalyData);
        console.log('AI分析响应:', response);
        
        // 解析响应数据
        let messageContent = '';
        let code = 0;
        
        if (response && response.data) {
          console.log('解析AI响应数据类型:', typeof response.data);
          
          // 检查response.data是否为字符串
          if (typeof response.data === 'string') {
            try {
              // 尝试解析JSON字符串
              const responseData = JSON.parse(response.data);
              console.log('成功解析JSON字符串:', responseData);
              messageContent = responseData.message || '';
              code = responseData.code || 0;
            } catch (e) {
              console.error('解析JSON字符串失败:', e);
              messageContent = response.data;
            }
          } 
          // 检查response.data是否为对象
          else if (typeof response.data === 'object') {
            // 直接从对象中提取数据
            if (response.data.code !== undefined) {
              // 确保code是数字0或1，而不是HTTP状态码
              code = response.data.code === 200 ? 0 : (Number(response.data.code) || 0);
              // 确保code只能是0或1
              code = code > 0 ? 1 : 0;
            }
            
            if (response.data.message) {
              messageContent = response.data.message;
            } else if (response.data.data && typeof response.data.data === 'string') {
              try {
                // 尝试解析嵌套的JSON
                const innerData = JSON.parse(response.data.data);
                messageContent = innerData.message || '';
                if (innerData.code !== undefined) {
                  code = Number(innerData.code) || 0;
                  code = code > 0 ? 1 : 0;
                }
              } catch (e) {
                console.error('解析嵌套JSON失败:', e);
                messageContent = response.data.data;
              }
            }
          }
        }
        
        console.log('解析后的消息内容:', messageContent);
        console.log('解析后的代码值:', code);
        
        // 根据code确定严重性
        const severity = code === 1 ? 'critical' : 'warning';
        
        return {
          id: 'ai-analysis-' + Date.now(),
          timestamp: Date.now(),
          systemName: anomalyData.systemName,
          systemSqName: anomalyData.systemSqName,
          severity: severity,
          code: code,
          systemInfo: {
            name: anomalyData.systemName,
            status: severity === 'critical' ? '故障' : '异常'
          },
          summary: messageContent,
          details: [messageContent],
          recommendations: ['请根据AI分析结果进行相应处理']
        };
      } catch (apiError) {
        console.error('获取AI分析结果API调用失败:', apiError);
        throw apiError;
      }
    } catch (error) {
      console.error('获取AI分析结果过程中发生严重错误:', error);
      throw error;
    }
  }

  /**
   * 检查AI分析结果 - 此方法已弃用，不再自动检查
   */
  async checkAIAnalysisResults() {
    console.log('此方法已弃用，不再自动检查AI分析结果');
  }

  /**
   * 注册AI分析结果回调
   * @param {Function} callback - AI分析结果回调函数
   */
  onAIAnalysisResult(callback) {
    if (typeof callback === 'function') {
      this.aiAnalysisCallbacks.push(callback);
    }
  }

  /**
   * 通知所有AI分析结果回调函数
   * @param {Object} result - AI分析结果
   */
  notifyAIAnalysisCallbacks(result) {
    this.aiAnalysisCallbacks.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('执行AI分析结果回调函数失败:', error);
      }
    });
  }
}

export default DataCollectionService;