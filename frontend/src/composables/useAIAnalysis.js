import { ref, nextTick } from 'vue';
import { abnormalDataApi } from '../api';
import aiSimulationApi from '../api/aiSimulation';
import CSVDataLoader from '../services/CSVDataLoader.js';

// 延迟导入ML分析器，只在需要时加载
let ElevatorMLAnalyzer = null;
let mlAnalyzerLoadPromise = null;

// 异步加载ML分析器
const loadMLAnalyzer = async () => {
  if (mlAnalyzerLoadPromise) return mlAnalyzerLoadPromise;
  
  mlAnalyzerLoadPromise = (async () => {
    try {
      const module = await import('../services/ElevatorMLAnalyzer');
      ElevatorMLAnalyzer = module.default;
      console.log('✅ ML分析器模块加载完成');
      return true;
    } catch (error) {
      console.error('❌ ML分析器模块加载失败:', error);
      return false;
    }
  })();
  
  return mlAnalyzerLoadPromise;
};

// 根据系统名称获取系统ID的辅助函数
const getSysIdByName = (systemName) => {
  const systemMap = {
    '曳引系统': 'sys-001',
    '导向系统': 'sys-002',
    '电气控制系统': 'sys-003',
    '门系统': 'sys-004'
  };
  return systemMap[systemName] || 'sys-001';
};

export function useAIAnalysis(stopElevator) {
  // AI通知相关状态
  const centerAIResult = ref({
    id: '',
    timestamp: Date.now(),
    systemId: '',
    code: 0,
    systemInfo: {
      name: '',
      status: ''
    },
    summary: '',
    details: []
  });
  const showCenterNotification = ref(false);
  
  // 紧急修复：强制重置弹窗状态
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      showCenterNotification.value = false;
      analysisStep.value = 'idle';
      console.log('🔧 已强制重置弹窗状态');
    }, 100);
  }
  const aiRecommendation = ref('');
  const isProcessingAI = ref(false);
  const analysisStep = ref('idle'); // 'idle', 'simulating', 'analyzing'
  
  // 调试：监控analysisStep的变化
  if (typeof window !== 'undefined') {
    let originalAnalysisValue = analysisStep.value;
    Object.defineProperty(analysisStep, 'value', {
      get() {
        return originalAnalysisValue;
      },
      set(newValue) {
        console.log(`📊 analysisStep 变化: ${originalAnalysisValue} -> ${newValue}`);
        originalAnalysisValue = newValue;
      }
    });
  }
  
  // 新增：前端ML分析相关状态
  const quickAnalysisResult = ref(null);
  const showQuickAnalysis = ref(false);
  const isQuickAnalyzing = ref(false);
  const deepAnalysisResult = ref(null);
  const showDeepAnalysis = ref(false);
  const isDeepAnalyzing = ref(false);
  const simulatedData = ref(null); // 新增：存储AI模拟的异常数据
  
  // ML分析器实例（延迟初始化）
  let mlAnalyzer = null;
  let isMLInitialized = false;
  let mlInitPromise = null;
  
  // CSV数据加载器实例（带错误处理）
  let csvDataLoader = null;
  try {
    csvDataLoader = new CSVDataLoader();
  } catch (error) {
    console.error('CSV数据加载器初始化失败:', error);
    csvDataLoader = {
      // 提供降级的API
      loadCSVData: () => Promise.resolve([]),
      getParameterSamples: () => Promise.resolve([]),
      getAnomalyCases: () => Promise.resolve([]),
      clearCache: () => {},
      getCacheStatus: () => ({ dataCache: 0, sampleCache: 0 })
    };
  }

  // 性能监控
  const performanceMetrics = ref({
    initTime: 0,
    analysisTime: 0,
    ruleEngineUsage: 0,
    mlModelUsage: 0,
    dataLoadTime: 0,
    cacheHitRate: 0
  });

  // 数据集状态
  const datasetStatus = ref({
    loaded: false,
    loading: false,
    error: null,
    stats: {
      '曳引系统': { samples: 0, normal: 0, warning: 0, critical: 0 },
      '导向系统': { samples: 0, normal: 0, warning: 0, critical: 0 },
      '电气控制系统': { samples: 0, normal: 0, warning: 0, critical: 0 },
      '门系统': { samples: 0, normal: 0, warning: 0, critical: 0 }
    }
  });

  // 统一的错误处理函数
  const handleError = (error, type) => {
    console.error(`${type}失败:`, error);
    const errorMessages = {
      simulation: {
        system: 'AI数据模拟',
        summary: '获取模拟数据异常，已切换到备用模式'
      },
      backend: {
        system: '云端AI分析',
        summary: '云端分析服务暂时不可用，建议稍后重试'
      },
      ml: {
        system: '智能分析引擎',
        summary: '本地智能分析遇到问题，已降级到规则引擎'
      }
    };
    const config = errorMessages[type] || errorMessages.ml;

    centerAIResult.value = {
      id: `ai-error-${type}-${Date.now()}`,
      timestamp: Date.now(),
      code: 1, // 错误状态
      systemInfo: { name: config.system, status: '降级模式' },
      summary: config.summary,
      details: [error.message || '系统将继续使用基础分析功能']
    };
  };

  /**
   * 智能初始化ML分析器（懒加载 + 渐进式增强）
   */
  const initializeMLAnalyzer = async () => {
    if (isMLInitialized) return true;
    if (mlInitPromise) return mlInitPromise;
    
    mlInitPromise = (async () => {
      const startTime = performance.now();
      
      try {
        console.log('🧠 智能分析引擎正在启动...');
        
        // 1. 首先加载ML分析器模块
        const loadSuccess = await loadMLAnalyzer();
        if (!loadSuccess) {
          throw new Error('ML模块加载失败');
        }
        
        // 2. 创建分析器实例
        mlAnalyzer = new ElevatorMLAnalyzer();
        
        // 3. 异步初始化（不阻塞UI）
        const initSuccess = await mlAnalyzer.initialize();
        
        if (initSuccess) {
          isMLInitialized = true;
          const initTime = Math.round(performance.now() - startTime);
          performanceMetrics.value.initTime = initTime;
          console.log(`✅ 智能分析引擎启动完成 (${initTime}ms)`);
          return true;
        } else {
          throw new Error('ML分析器初始化失败');
        }
      } catch (error) {
        console.warn('⚠️ 智能分析引擎启动失败，切换到规则引擎模式:', error);
        // 不抛出错误，而是优雅降级
        return false;
      }
    })();
    
    return mlInitPromise;
  };

  /**
   * 快速前端分析（优化版：规则优先 + ML增强）
   */
  const performQuickAnalysis = async (abnormalData, contextData = {}) => {
    const startTime = performance.now();
    isQuickAnalyzing.value = true;
    
    try {
      // 优先使用规则引擎（无需等待ML初始化）
      const ruleResult = performRuleBasedAnalysis(abnormalData);
      
      // 如果规则引擎置信度高，直接返回结果
      if (ruleResult.confidence >= 0.9) {
        performanceMetrics.value.ruleEngineUsage += 1;
        return formatAnalysisResult(ruleResult, startTime, 'rule');
      }
      
      // 规则不确定时，尝试ML增强
      let enhancedResult = ruleResult;
      try {
        // 非阻塞式ML初始化
        const initSuccess = await Promise.race([
          initializeMLAnalyzer(),
          new Promise(resolve => setTimeout(() => resolve(false), 2000)) // 2秒超时
        ]);
        
        if (initSuccess && mlAnalyzer) {
          console.log('🔬 启用ML增强分析...');
          const mlResult = await mlAnalyzer.quickAnalyze(abnormalData, contextData);
          
          if (mlResult.success) {
            enhancedResult = combineRuleAndMLResults(ruleResult, mlResult);
            performanceMetrics.value.mlModelUsage += 1;
          }
        } else {
          console.log('⚡ 使用快速规则分析模式');
        }
      } catch (mlError) {
        console.warn('ML增强失败，使用规则结果:', mlError);
      }
      
      return formatAnalysisResult(enhancedResult, startTime, enhancedResult.source || 'hybrid');
      
    } catch (error) {
      console.error('快速分析失败:', error);
      handleError(error, 'ml');
      throw error;
    } finally {
      isQuickAnalyzing.value = false;
      performanceMetrics.value.analysisTime = Math.round(performance.now() - startTime);
    }
  };

  // 改进的规则引擎 - 提供更精确的问题定位
  const performRuleBasedAnalysis = (data) => {
    const rules = {
      motorTemperature: {
        displayName: '电机温度',
        unit: '°C',
        baseline: '40-60°C',
        normal: { min: 35, max: 70 },
        warning: { min: 70, max: 85 },
        critical: { min: 85, max: 120 },
        description: '电机工作温度监测',
        faultTypes: {
          overheating: { threshold: 85, description: '电机过热，可能原因：负载过重、轴承磨损、冷却不足' },
          abnormalHeat: { threshold: 70, description: '温度偏高，建议检查电机负载和通风散热' }
        }
      },
      motorCurrent: {
        displayName: '电机电流',
        unit: 'A',
        baseline: '8-12A',
        normal: { min: 6, max: 15 },
        warning: { min: 15, max: 20 },
        critical: { min: 20, max: 30 },
        description: '电机运行电流监测',
        faultTypes: {
          overcurrent: { threshold: 20, description: '电流过大，可能原因：机械阻力增加、电机故障、过载运行' },
          currentSpike: { threshold: 15, description: '电流偏高，建议检查机械传动系统和电机状态' }
        }
      },
      voltageFluctuation: {
        displayName: '电压波动',
        unit: '%',
        baseline: '±2%',
        normal: { min: 0, max: 3 },
        warning: { min: 3, max: 6 },
        critical: { min: 6, max: 15 },
        description: '电源电压稳定性监测',
        faultTypes: {
          voltageInstability: { threshold: 6, description: '电压严重波动，可能原因：电源质量问题、接触不良、负载突变' },
          minorFluctuation: { threshold: 3, description: '电压轻微波动，建议检查电源连接和负载情况' }
        }
      },
      brakeTemperature: {
        displayName: '制动器温度',
        unit: '°C',
        baseline: '30-50°C',
        normal: { min: 25, max: 60 },
        warning: { min: 60, max: 80 },
        critical: { min: 80, max: 120 },
        description: '制动系统温度监测',
        faultTypes: {
          brakeOverheat: { threshold: 80, description: '制动器过热，可能原因：频繁制动、制动片磨损、散热不良' },
          brakeHeat: { threshold: 60, description: '制动温度偏高，建议检查制动系统和散热' }
        }
      },
      cableTension: {
        displayName: '钢丝绳张力',
        unit: 'kN',
        baseline: '8-12kN',
        normal: { min: 7, max: 14 },
        warning: { min: 14, max: 18 },
        critical: { min: 18, max: 25 },
        description: '钢丝绳张力监测',
        faultTypes: {
          excessiveTension: { threshold: 18, description: '钢丝绳张力过大，可能原因：负载不平衡、导轨阻力大、机械故障' },
          highTension: { threshold: 14, description: '张力偏高，建议检查负载分布和导轨润滑' }
        }
      },
      doorSwitchResponse: {
        displayName: '门开关响应',
        unit: 'ms',
        baseline: '100-300ms',
        normal: { min: 50, max: 400 },
        warning: { min: 400, max: 800 },
        critical: { min: 800, max: 2000 },
        description: '门系统响应时间监测',
        faultTypes: {
          slowResponse: { threshold: 800, description: '门响应严重延迟，可能原因：门机故障、机械卡阻、控制系统问题' },
          delayedResponse: { threshold: 400, description: '门响应时间偏长，建议检查门机和控制系统' }
        }
      },
      vibrationLevel: {
        displayName: '振动水平',
        unit: 'mm/s',
        baseline: '0.5-2.0mm/s',
        normal: { min: 0, max: 2.5 },
        warning: { min: 2.5, max: 5.0 },
        critical: { min: 5.0, max: 10.0 },
        description: '系统振动监测',
        faultTypes: {
          excessiveVibration: { threshold: 5.0, description: '振动严重超标，可能原因：导轨磨损、轴承故障、系统失衡' },
          highVibration: { threshold: 2.5, description: '振动水平偏高，建议检查机械部件对齐和磨损情况' }
        }
      }
    };

    const parameter = data.eName;
    const value = parseFloat(data.eData);
    const rule = rules[parameter];

    if (!rule) {
      return {
        severity: 'warning',
        confidence: 0.6,
        anomalyScore: 0.5,
        faultType: '未知参数异常',
        faultDescription: '检测到未知参数异常，建议联系技术支持',
        recommendation: '需要专业技术人员进一步诊断',
        parameterInfo: {
          displayName: data.eName,
          baseline: 'N/A',
          unit: '',
          deviation: 'N/A',
          description: '未知参数'
        }
      };
    }

    let severity, confidence, anomalyScore, faultType, faultDescription, recommendation;

    // 精确的故障分析
    if (value >= rule.critical.min) {
      severity = 'critical';
      confidence = 0.95;
      anomalyScore = 0.9 + (value - rule.critical.min) / (rule.critical.max - rule.critical.min) * 0.1;
      
      // 寻找匹配的故障类型
      const faultTypeKey = Object.keys(rule.faultTypes).find(key => 
        value >= rule.faultTypes[key].threshold
      );
      
      if (faultTypeKey) {
        const fault = rule.faultTypes[faultTypeKey];
        faultType = faultTypeKey === 'overheating' || faultTypeKey === 'overcurrent' || faultTypeKey === 'excessiveTension' || faultTypeKey === 'voltageInstability' || faultTypeKey === 'brakeOverheat' || faultTypeKey === 'slowResponse' || faultTypeKey === 'excessiveVibration' ? 
          fault.description.split('，')[0] : '严重异常';
        faultDescription = fault.description;
        recommendation = '立即停止运行，联系专业维修人员进行紧急检修';
      } else {
        faultType = '严重异常';
        faultDescription = `${rule.displayName}严重超标，可能导致设备损坏或安全事故`;
        recommendation = '立即停止运行，联系专业维修人员';
      }
    } else if (value >= rule.warning.min && value < rule.critical.min) {
      severity = 'warning';
      confidence = 0.85;
      anomalyScore = 0.6 + (value - rule.warning.min) / (rule.warning.max - rule.warning.min) * 0.3;
      
      const faultTypeKey = Object.keys(rule.faultTypes).find(key => 
        value >= rule.faultTypes[key].threshold && rule.faultTypes[key].threshold < rule.critical.min
      );
      
      if (faultTypeKey) {
        const fault = rule.faultTypes[faultTypeKey];
        faultType = faultTypeKey.includes('abnormal') || faultTypeKey.includes('minor') || faultTypeKey.includes('delayed') || faultTypeKey.includes('high') ? 
          fault.description.split('，')[0] : '轻度异常';
        faultDescription = fault.description;
        recommendation = '安排预防性维护，密切监控参数变化';
      } else {
        faultType = '轻度异常';
        faultDescription = `${rule.displayName}超出正常范围，建议关注后续变化`;
        recommendation = '安排预防性维护检查';
      }
    } else {
      severity = 'normal';
      confidence = 0.9;
      anomalyScore = Math.abs(value - (rule.normal.min + rule.normal.max) / 2) / ((rule.normal.max - rule.normal.min) / 2) * 0.3;
      faultType = '参数正常';
      faultDescription = `${rule.displayName}在正常范围内，系统运行正常`;
      recommendation = '继续正常监控，定期检查维护';
    }

    // 计算偏差百分比
    const normalCenter = (rule.normal.min + rule.normal.max) / 2;
    const deviation = Math.abs((value - normalCenter) / normalCenter * 100).toFixed(1);

    return {
      severity,
      confidence,
      anomalyScore: Math.min(anomalyScore, 1.0),
      faultType,
      faultDescription,
      recommendation,
      analysisSource: 'rule_engine',
      parameterInfo: {
        displayName: rule.displayName,
        baseline: rule.baseline,
        unit: rule.unit,
        deviation: `${deviation}%`,
        description: rule.description,
        normalRange: `${rule.normal.min}-${rule.normal.max}${rule.unit}`,
        warningRange: `${rule.warning.min}-${rule.warning.max}${rule.unit}`,
        criticalRange: `${rule.critical.min}+${rule.unit}`
      }
    };
  };

  /**
   * 合并规则和ML结果
   */
  const combineRuleAndMLResults = (ruleResult, mlResult) => {
    // 严重性：取更严重的
    const severityPriority = { normal: 0, warning: 1, critical: 2 };
    const finalSeverity = severityPriority[ruleResult.severity] >= severityPriority[mlResult.severity]
      ? ruleResult.severity : mlResult.severity;
    
    // 置信度：加权平均（规则权重0.6，ML权重0.4）
    const finalConfidence = ruleResult.confidence * 0.6 + mlResult.confidence * 0.4;
    
    // 异常评分：加权平均
    const finalAnomalyScore = ruleResult.anomalyScore * 0.6 + mlResult.anomalyScore * 0.4;
    
    return {
      severity: finalSeverity,
      confidence: Math.round(finalConfidence * 1000) / 1000,
      anomalyScore: Math.round(finalAnomalyScore * 1000) / 1000,
      source: 'hybrid',
      recommendation: mlResult.recommendation || generateEnhancedRecommendation(finalSeverity, ruleResult.parameterInfo),
      parameterInfo: ruleResult.parameterInfo, // 保留参数信息
      details: {
        ruleResult,
        mlResult: {
          severity: mlResult.severity,
          confidence: mlResult.confidence,
          anomalyScore: mlResult.anomalyScore
        }
      }
    };
  };

  /**
   * 生成增强的建议（基于参数信息）
   */
  const generateEnhancedRecommendation = (severity, parameterInfo) => {
    if (!parameterInfo) return generateSimpleRecommendation(severity);
    
    const { description, baseline, deviation, unit } = parameterInfo;
    
    const recommendations = {
      normal: {
        main: `${description}在正常范围内，建议继续监控。`,
        specific: `当前偏差为${deviation}，相对基准值${baseline}属于正常波动。`
      },
      warning: {
        main: `${description}超出正常范围，建议加强监控并安排检查。`,
        specific: `当前偏差为${deviation}，超出基准值${baseline}，需要关注趋势变化。`
      },
      critical: {
        main: `${description}严重异常，建议立即停机检修！`,
        specific: `当前偏差为${deviation}，严重偏离基准值${baseline}，存在安全隐患。`
      }
    };
    
    return recommendations[severity] || generateSimpleRecommendation(severity);
  };

  /**
   * 生成简单建议
   */
  const generateSimpleRecommendation = (severity) => {
    const recommendations = {
      normal: { main: '参数在正常范围内，建议继续监控。', specific: '' },
      warning: { main: '参数超出正常范围，建议加强监控并安排检查。', specific: '请关注相关系统状态变化。' },
      critical: { main: '参数严重异常，建议立即停机检修！', specific: '立即联系维修人员进行紧急处理。' }
    };
    return recommendations[severity];
  };

  /**
   * 格式化分析结果 - ML分析完成后直接显示为最终结果
   */
  const formatAnalysisResult = (result, startTime, analysisType) => {
    const analysisTime = Math.round(performance.now() - startTime);
    
    // 确保recommendation格式正确
    let finalRecommendation = result.recommendation;
    if (!finalRecommendation) {
      finalRecommendation = generateEnhancedRecommendation(result.severity, result.parameterInfo);
    }
    
    // 存储ML分析详细结果
    quickAnalysisResult.value = {
      severity: result.severity,
      confidence: result.confidence,
      anomalyScore: result.anomalyScore,
      faultType: result.faultType || '未知异常',
      faultDescription: result.faultDescription || '检测到参数异常',
      recommendation: finalRecommendation,
      analysisTime: analysisTime,
      needsDeepAnalysis: result.confidence < 0.8 || result.severity === 'critical',
      parameterInfo: result.parameterInfo,
      details: result.details || {}
    };
    
    console.log('📊 quickAnalysisResult已更新:', {
      severity: quickAnalysisResult.value.severity,
      faultType: quickAnalysisResult.value.faultType,
      recommendation: quickAnalysisResult.value.recommendation,
      hasRecommendationMain: quickAnalysisResult.value.recommendation?.main ? 'YES' : 'NO'
    });
    
    // 先更新为最终状态以确保UI显示正确的颜色
    console.log('🔄 formatAnalysisResult: 更新分析状态为 final-result');
    analysisStep.value = 'final-result';
    
    // 使用nextTick确保DOM更新
    nextTick(() => {
      console.log('🔄 Vue nextTick: UI更新完成, analysisStep:', analysisStep.value);
    });
    
    // 直接更新为最终结果，显示为故障/警告弹窗
    centerAIResult.value = {
      id: `ml-final-${Date.now()}`,
      timestamp: Date.now(),
      code: result.severity === 'critical' ? 1 : 0, // 1=故障(红色), 0=警告(黄色)
      systemInfo: {
        name: simulatedData.value?.systemName || '智能分析系统',
        status: result.severity === 'critical' ? '故障' : result.severity === 'warning' ? '警告' : '正常'
      },
      summary: result.faultDescription || `ML分析检测到${result.severity === 'critical' ? '严重故障' : '潜在警告'}`,
      details: [
        `故障类型: ${result.faultType}`,
        `置信度: ${(result.confidence * 100).toFixed(1)}%`,
        result.parameterInfo ? `参数: ${result.parameterInfo.displayName}` : '',
        result.parameterInfo ? `当前值偏离基准: ${result.parameterInfo.deviation}` : '',
        `分析时间: ${analysisTime}ms`
      ].filter(Boolean),
      mtDataId: null // 后续需要保存到数据库时设置
    };

    // 设置AI建议（增加调试和错误处理）
    console.log('🔍 formatAnalysisResult - 检查recommendation:', result.recommendation);
    if (result.recommendation) {
      if (typeof result.recommendation === 'object' && result.recommendation.main) {
        // 对象格式的建议
        aiRecommendation.value = result.recommendation.main + 
          (result.recommendation.specific ? ` ${result.recommendation.specific}` : '');
      } else if (typeof result.recommendation === 'string') {
        // 字符串格式的建议
        aiRecommendation.value = result.recommendation;
      } else {
        console.warn('⚠️ recommendation格式异常:', result.recommendation);
        aiRecommendation.value = '系统建议: 请根据分析结果进行相应处理';
      }
      console.log('✅ AI建议已设置:', aiRecommendation.value);
    } else {
      console.warn('⚠️ 没有找到recommendation，使用默认建议');
      aiRecommendation.value = '系统建议: 请根据分析结果进行相应处理';
    }

    // 如果是严重故障，自动停止电梯
    if (result.severity === 'critical') {
      console.log('🚨 检测到严重故障，自动停止电梯');
      stopElevator();
    }
    
    // 确保状态更新
    console.log('📊 formatAnalysisResult完成，centerAIResult已更新:', centerAIResult.value);
    
    console.log('📊 ML分析结果格式化完成:', {
      severity: result.severity,
      code: centerAIResult.value.code,
      faultType: result.faultType,
      willStopElevator: result.severity === 'critical'
    });
    
    return result;
  };



  /**
   * 用户请求深度分析（修正版 - 发送ML结果+DeepSeek数据给后端）
   */
  const requestDeepAnalysis = async (data) => {
    const { mlResult, simulatedData: deepSeekData } = data;
    
    if (!deepSeekData || !mlResult) {
      console.error('缺少DeepSeek数据或ML分析结果，无法进行深度分析');
      return;
    }

    isDeepAnalyzing.value = true;
    analysisStep.value = 'deep-analyzing';

    // 显示深度分析进行中的主弹窗
    showCenterNotification.value = true;
    centerAIResult.value = {
      id: `deep-analysis-${Date.now()}`,
      timestamp: Date.now(),
      code: 0,
      systemInfo: { name: '云端AI深度分析', status: '分析中' },
      summary: '正在调用云端大模型进行深度分析...',
      details: [
        `DeepSeek数据 - 参数: ${deepSeekData.eName}`, 
        `DeepSeek数据 - 数值: ${deepSeekData.eData}`, 
        `DeepSeek数据 - 系统: ${deepSeekData.systemName}`,
        `前端ML分析 - 预测: ${mlResult.faultType}`,
        `前端ML分析 - 置信度: ${(mlResult.confidence * 100).toFixed(1)}%`,
        `前端ML分析 - 异常评分: ${mlResult.anomalyScore.toFixed(3)}`
      ]
    };

    try {
      // 准备发送给后端的完整数据：DeepSeek原始数据 + ML分析结果
      const requestData = {
        // DeepSeek AI生成的原始异常数据
        ...deepSeekData,
        
        // 前端ML模型的分析结果
        mlAnalysisResult: {
          severity: mlResult.severity,
          confidence: mlResult.confidence,
          faultType: mlResult.faultType,
          faultDescription: mlResult.faultDescription,
          recommendation: mlResult.recommendation,
          anomalyScore: mlResult.anomalyScore,
          analysisTime: mlResult.analysisTime,
          analysisSource: mlResult.analysisSource || 'frontend_ml'
        },
        
        // 标记数据来源
        dataSource: {
          simulation: 'DeepSeek AI',
          analysis: 'Frontend ML Model',
          requestType: 'deep_analysis'
        }
      };

      console.log('🚀 发送深度分析请求 - DeepSeek数据 + ML分析结果:', requestData);

      // 调用后端云端深度分析
      const backendResponse = await abnormalDataApi.sendDataToAI(requestData);

      if (!backendResponse || !backendResponse.data) {
        throw new Error('云端AI分析服务暂时不可用');
      }

      // 处理后端分析结果
      const resultData = (backendResponse.data && typeof backendResponse.data.data === 'string')
        ? JSON.parse(backendResponse.data.data)
        : backendResponse.data;

      // 更新深度分析结果
      deepAnalysisResult.value = {
        status: 'completed',
        severity: resultData.aiCode === 1 ? 'critical' : 'warning',
        analysis: resultData.aiResult || '云端深度分析完成',
        recommendation: resultData.建议 || '请根据分析结果进行操作',
        confidence: 0.95,
        source: 'cloud_ai_with_ml_context',
        mtDataId: resultData.mtDataId,
        // 保留原始数据链路
        dataChain: {
          deepSeek: deepSeekData,
          frontendML: mlResult,
          cloudAI: resultData
        }
      };

      // 更新主结果显示
      centerAIResult.value = {
        id: resultData.id || `deep-analysis-${Date.now()}`,
        timestamp: Date.now(),
        code: resultData.aiCode,
        systemId: getSysIdByName(resultData.systemName),
        systemInfo: { 
          name: '云端AI深度分析', 
          status: resultData.aiCode === 1 ? '故障' : '警告' 
        },
        summary: resultData.aiResult || '云端深度分析完成',
        details: [
          `DeepSeek模拟: ${resultData.systemSqName} ${resultData.eData}`,
          `前端ML预测: ${mlResult.faultType} (置信度${(mlResult.confidence * 100).toFixed(1)}%)`,
          `云端AI确认: ${resultData.aiResult}`,
          `综合建议: ${resultData.建议}`
        ],
        mtDataId: resultData.mtDataId
      };

      aiRecommendation.value = resultData.建议 || '请根据云端AI深度分析结果进行操作。';

      if (resultData.aiCode === 1) {
        console.log('🚨 云端AI确认严重故障，自动停止电梯');
        stopElevator();
      }

      analysisStep.value = 'deep-completed';
      showCenterNotification.value = true;

    } catch (error) {
      console.error('云端AI深度分析失败:', error);
      
      deepAnalysisResult.value = {
        status: 'error',
        message: '云端深度分析失败: ' + error.message,
        error: error.message
      };
      
      handleError(error, 'backend');
      analysisStep.value = 'idle';
    } finally {
      isDeepAnalyzing.value = false;
    }
  };

  /**
   * 预加载数据集
   */
  const preloadDatasets = async () => {
    if (datasetStatus.value.loading) return;
    
    datasetStatus.value.loading = true;
    datasetStatus.value.error = null;
    
    try {
      console.log('📊 开始预加载数据集...');
      const startTime = performance.now();
      
      const systems = ['曳引系统', '导向系统', '电气控制系统', '门系统'];
      const loadPromises = systems.map(system => 
        csvDataLoader.loadCSVData(system).catch(error => {
          console.warn(`预加载 ${system} 失败:`, error);
          return [];
        })
      );
      
      const results = await Promise.all(loadPromises);
      const loadTime = performance.now() - startTime;
      
      // 统计信息
      const stats = {
        '曳引系统': { samples: 0, normal: 0, warning: 0, critical: 0 },
        '导向系统': { samples: 0, normal: 0, warning: 0, critical: 0 },
        '电气控制系统': { samples: 0, normal: 0, warning: 0, critical: 0 },
        '门系统': { samples: 0, normal: 0, warning: 0, critical: 0 }
      };
      
      systems.forEach((system, index) => {
        const data = results[index] || [];
        if (data && Array.isArray(data)) {
          stats[system] = {
            samples: data.length,
            normal: data.filter(d => d && d.severityLevel === 'normal').length,
            warning: data.filter(d => d && d.severityLevel === 'warning').length,
            critical: data.filter(d => d && d.severityLevel === 'critical').length
          };
        }
      });
      
      datasetStatus.value = {
        loaded: true,
        loading: false,
        error: null,
        stats,
        loadTime
      };
      
      performanceMetrics.value.dataLoadTime = loadTime;
      console.log(`✅ 数据集预加载完成 (${loadTime.toFixed(1)}ms)`, stats);
      
    } catch (error) {
      datasetStatus.value = {
        loaded: false,
        loading: false,
        error: error.message,
        stats: {}
      };
      console.error('数据集预加载失败:', error);
    }
  };

  // 删除这个函数，异常数据应该完全由DeepSeek生成，不需要基于真实数据

  /**
   * 生成异常数据并进行智能分析（修正版 - DeepSeek数据生成 + ML分析）
   */
  const generateAbnormalData = async (systemType) => {
    if (analysisStep.value !== 'idle') return;

    try {
      // 阶段 1: DeepSeek AI数据模拟 (蓝色弹窗)
      analysisStep.value = 'simulating';
      showCenterNotification.value = true;
      
      centerAIResult.value = {
        id: `simulation-${Date.now()}`,
        timestamp: Date.now(),
        code: 0,
        systemInfo: { name: 'DeepSeek AI数据模拟', status: '生成中' },
        summary: '正在生成模拟异常数据...',
        details: [`系统类型: ${systemType}`, '数据来源: DeepSeek AI智能模拟']
      };
      
      // 使用DeepSeek AI生成异常数据
      console.log('🤖 使用DeepSeek AI生成异常数据...');
      const abnormalData = await aiSimulationApi.generateSimulatedAbnormalDataWithAI(systemType);
      simulatedData.value = abnormalData;

      // 显示DeepSeek生成完成的数据
      centerAIResult.value = {
        id: `simulation-complete-${Date.now()}`,
        timestamp: Date.now(),
        code: 0,
        systemInfo: { name: 'DeepSeek AI数据模拟', status: '完成' },
        summary: 'DeepSeek AI异常数据已生成',
        details: [
          `系统: ${abnormalData.systemName}`, 
          `组件: ${abnormalData.systemSqName}`, 
          `参数: ${abnormalData.eName}`, 
          `数值: ${abnormalData.eData}`,
          `数据来源: DeepSeek AI模拟`
        ]
      };
      
      // 短暂延迟让用户看到DeepSeek生成的数据，然后自动进入ML分析
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 阶段 2: 前端ML分析DeepSeek的数据
      console.log('🧠 开始前端ML分析DeepSeek数据...');
      analysisStep.value = 'ml-analyzing';
      
      // 执行ML分析
      await performQuickAnalysis(abnormalData);
      
      // ML分析完成后，用户可以选择深度分析或直接分配人员
      showCenterNotification.value = true;
      
      console.log('🎯 ML分析DeepSeek数据完成，用户可选择深度分析或分配人员:', {
        analysisStep: analysisStep.value,
        centerAIResultCode: centerAIResult.value?.code,
        quickAnalysisResult: quickAnalysisResult.value?.severity,
        deepSeekData: abnormalData
      });
      
    } catch (error) {
      showCenterNotification.value = true;
      handleError(error, 'simulation');
      analysisStep.value = 'idle';
    }
  };



  /**
   * 关闭快速分析面板
   */
  const closeQuickAnalysis = () => {
    showQuickAnalysis.value = false;
    quickAnalysisResult.value = null;
  };

  /**
   * 关闭深度分析面板
   */
  const closeDeepAnalysis = () => {
    showDeepAnalysis.value = false;
    deepAnalysisResult.value = null;
  };

  /**
   * 获取性能统计
   */
  const getPerformanceStats = () => {
    return {
      ...performanceMetrics.value,
      mlInitialized: isMLInitialized,
      totalAnalyses: performanceMetrics.value.ruleEngineUsage + performanceMetrics.value.mlModelUsage,
      mlUsageRate: performanceMetrics.value.mlModelUsage / Math.max(1, performanceMetrics.value.ruleEngineUsage + performanceMetrics.value.mlModelUsage)
    };
  };

  return {
    // 原有的状态和方法
    centerAIResult,
    showCenterNotification,
    aiRecommendation,
    isProcessingAI,
    analysisStep,
    generateAbnormalData,
    
    // 混合分析相关
    quickAnalysisResult,
    showQuickAnalysis,
    isQuickAnalyzing,
    deepAnalysisResult,
    showDeepAnalysis,
    isDeepAnalyzing,
    simulatedData,
    
    // 用户交互方法
    requestDeepAnalysis,
    closeQuickAnalysis,
    closeDeepAnalysis,
    
    // 性能和状态监控
    initializeMLAnalyzer,
    performQuickAnalysis,
    getPerformanceStats,
    performanceMetrics,
    
    // 数据集状态（仅用于性能监控，不用于数据生成）
    datasetStatus,
    preloadDatasets,
    
    // CSV数据访问（仅用于ML模型训练和性能监控）
    csvDataLoader
  };
}