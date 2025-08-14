/**
 * 智云梯ML异常检测分析器 - 优化版
 * 基于真实CSV数据集和高性能分析
 * Version: 5.0 - 真实数据集集成版
 */

import CSVDataLoader from './CSVDataLoader.js';

class ElevatorMLAnalyzer {
  constructor() {
    this.version = '5.0 - 真实数据集集成版';
    this.model = null;
    this.isInitialized = false;
    this.isInitializing = false;
    this.initPromise = null;
    
    // 集成CSV数据加载器
    this.dataLoader = new CSVDataLoader();
    this.trainingDataCache = new Map();
    this.analysisCache = new Map(); // 分析结果缓存
    this.cacheMaxSize = 100;
    
    // 性能监控
    this.performanceStats = {
      initTime: 0,
      totalAnalyses: 0,
      averageAnalysisTime: 0,
      cacheHitRate: 0,
      dataLoadTime: 0,
      mlInferenceTime: 0
    };
    
    // Web Worker支持（用于后台数据处理）
    this.workerSupported = typeof Worker !== 'undefined';
    this.dataWorker = null;
    
    // 基于真实数据集的精确参数规范
    this.setupParameterSpecs();
  }

  /**
   * 设置参数规范 - 与真实数据集完全一致
   */
  setupParameterSpecs() {
    this.parameterSpecs = {
      // 曳引系统参数 (基于 elevator_traction_filtered.csv)
      'traction': {
        'motorTemperature': {
          'normal_range': [25, 85],
          'warning_range': [85, 100],
          'critical_range': [100, 120],
          'baseline': 45.0,
          'unit': '°C',
          'component': '曳引机',
          'displayName': '电机温度',
          'datasetColumn': 'motorTemperature'
        },
        'bearingTemperature': {
          'normal_range': [30, 100],
          'warning_range': [100, 110],
          'critical_range': [110, 120],
          'baseline': 50.0,
          'unit': '°C',
          'component': '曳引机',
          'displayName': '轴承温度',
          'datasetColumn': 'bearingTemperature'
        },
        'vibrationSpeed': {
          'normal_range': [0.5, 3.5],
          'warning_range': [3.5, 5.0],
          'critical_range': [5.0, 6.0],
          'baseline': 1.2,
          'unit': 'mm/s',
          'component': '曳引机',
          'displayName': '振动速度',
          'datasetColumn': 'vibrationSpeed'
        },
        'current': {
          'normal_range': [16.65, 21.0],
          'warning_range': [21.0, 23.0],
          'critical_range': [23.0, 30],
          'baseline': 18.5,
          'unit': 'A',
          'component': '曳引机',
          'displayName': '电机电流',
          'datasetColumn': 'current'
        },
        'steelRopeWear': {
          'normal_range': [0, 10],
          'warning_range': [10, 12],
          'critical_range': [12, 15],
          'baseline': 2.0,
          'unit': '%',
          'component': '钢丝绳',
          'displayName': '钢丝绳磨损',
          'datasetColumn': 'steelRopeWear'
        },
        'brokenWires': {
          'normal_range': [0, 5],
          'warning_range': [5, 8],
          'critical_range': [8, 10],
          'baseline': 0,
          'unit': '根/股',
          'component': '钢丝绳',
          'displayName': '断丝数',
          'datasetColumn': 'brokenWires'
        },
        'brakeClearance': {
          'normal_range': [0.5, 1.0],
          'warning_range': [1.0, 1.5],
          'critical_range': [1.5, 2.0],
          'baseline': 0.8,
          'unit': 'mm',
          'component': '制动机',
          'displayName': '制动间隙',
          'datasetColumn': 'brakeClearance'
        },
        'brakingTorque': {
          'normal_range': [300, 350],
          'warning_range': [250, 300],
          'critical_range': [200, 250],
          'baseline': 320,
          'unit': 'N·m',
          'component': '制动机',
          'displayName': '制动力矩',
          'datasetColumn': 'brakingTorque'
        }
      },
      
      // 导向系统参数 (基于 elevator_guidance_filtered.csv)
      'guidance': {
        'railDeviation': {
          'normal_range': [0, 0.5],
          'warning_range': [0.5, 1.0],
          'critical_range': [1.0, 1.2],
          'baseline': 0.2,
          'unit': 'mm',
          'component': '导轨',
          'displayName': '导轨垂直度偏差',
          'datasetColumn': 'railDeviation'
        },
        'guideShoeWear': {
          'normal_range': [0, 2],
          'warning_range': [2, 3],
          'critical_range': [3, 4],
          'baseline': 0.5,
          'unit': 'mm',
          'component': '导靴',
          'displayName': '导靴磨损量',
          'datasetColumn': 'guideShoeWear'
        },
        'railJointGap': {
          'normal_range': [0, 0.5],
          'warning_range': [0.5, 1.0],
          'critical_range': [1.0, 2.0],
          'baseline': 0.2,
          'unit': 'mm',
          'component': '导轨',
          'displayName': '导轨接头间隙',
          'datasetColumn': 'railJointGap'
        }
      },
      
      // 电气控制系统参数 (基于 elevator_electrical_filtered.csv)
      'electrical': {
        'voltageFluctuation': {
          'normal_range': [-12, 12],
          'warning_range': [12, 18],
          'critical_range': [18, 25],
          'baseline': 0,
          'unit': '%',
          'component': '电源',
          'displayName': '电压波动',
          'datasetColumn': 'voltageFluctuation'
        },
        'contactVoltageDrops': {
          'normal_range': [10, 50],
          'warning_range': [50, 100],
          'critical_range': [100, 150],
          'baseline': 25,
          'unit': 'mV',
          'component': '电源',
          'displayName': '触点电压降',
          'datasetColumn': 'contactVoltageDrops'
        },
        'controlResponseTime': {
          'normal_range': [0.1, 0.5],
          'warning_range': [0.5, 1.0],
          'critical_range': [1.0, 2.0],
          'baseline': 0.3,
          'unit': 's',
          'component': '控制器',
          'displayName': '控制响应时间',
          'datasetColumn': 'controlResponseTime'
        },
        'currentLoad': {
          'normal_range': [16.65, 21.0],
          'warning_range': [21.0, 23.0],
          'critical_range': [23.0, 30],
          'baseline': 18.5,
          'unit': 'A',
          'component': '负载',
          'displayName': '电流负载',
          'datasetColumn': 'current'
        }
      },
      
      // 门系统参数 (基于 elevator_door_filtered.csv)
      'door': {
        'openCloseTime': {
          'normal_range': [2.0, 4.0],
          'warning_range': [4.0, 6.0],
          'critical_range': [6.0, 8.0],
          'baseline': 2.5,
          'unit': 's',
          'component': '门机',
          'displayName': '开关门时间',
          'datasetColumn': 'openCloseTime'
        },
        'contactResistance': {
          'normal_range': [0.05, 0.5],
          'warning_range': [0.5, 1.0],
          'critical_range': [1.0, 1.5],
          'baseline': 0.1,
          'unit': 'Ω',
          'component': '门锁装置',
          'displayName': '触点电阻',
          'datasetColumn': 'contactResistance'
        },
        'doorCurrent': {
          'normal_range': [4.5, 5.5],
          'warning_range': [5.5, 6.0],
          'critical_range': [6.0, 8.0],
          'baseline': 5.0,
          'unit': 'A',
          'component': '门机',
          'displayName': '门机电流',
          'datasetColumn': 'doorCurrent'
        },
        'mechanicalDepth': {
          'normal_range': [7, 12],
          'warning_range': [5, 7],
          'critical_range': [0, 5],
          'baseline': 9.0,
          'unit': 'mm',
          'component': '门锁装置',
          'displayName': '机械闭合深度',
          'datasetColumn': 'mechanicalDepth'
        }
      }
    };

    // 参数名映射 - 处理前端参数名与数据集参数名的差异
    this.parameterMapping = {
      'motorTemperature': 'motorTemperature',
      'motorCurrent': 'current',
      'voltageFluctuation': 'voltageFluctuation',
      'brakeTemperature': 'bearingTemperature',
      'cableTension': 'steelRopeWear',
      'doorSwitchResponse': 'openCloseTime',
      'vibrationLevel': 'vibrationSpeed',
      'doorCurrent': 'doorCurrent',
      'contactResistance': 'contactResistance',
      'mechanicalDepth': 'mechanicalDepth'
    };
  }

  /**
   * 异步初始化ML模型（优化版 + 可视化）
   */
  async initialize() {
    if (this.isInitialized) return true;
    if (this.isInitializing) return this.initPromise;
    
    this.isInitializing = true;
    const startTime = performance.now();
    
    // 🎯 ML可视化 - 初始化开始
    console.log(`\n` +
      ` =======================================\n` +
      ` [智云梯ML引擎] 初始化开始\n` +
      `版本: ${this.version}\n` +
      `架构: TensorFlow.js + 规则引擎混合\n` +
      `时间: ${new Date().toLocaleTimeString()}\n` +
      `=======================================`);
    
    this.initPromise = this._initializeOptimized();
    
    try {
      await this.initPromise;
      this.performanceStats.initTime = performance.now() - startTime;
      this.isInitialized = true;
      
      // 🎉 初始化成功可视化
      console.log(`[ML初始化完成] 智云梯ML引擎准备就绪:`);
      console.log(`┌─ 初始化耗时: ${this.performanceStats.initTime.toFixed(1)}ms`);
      console.log(`├─ 神经网络: 已构建 (24→16→8→1)`);
      console.log(`├─  数据缓存: 已启用`);
      console.log(`├─ 规则引擎: 已加载`);
      console.log(`└─ 状态: 就绪`);
      console.log(`=======================================\n`);
      
      return true;
    } catch (error) {
      console.warn(` [ML初始化失败] 降级到纯规则引擎:\n   错误: ${error.message}`);
      console.log(`[降级模式] 使用规则引擎继续服务`);
      console.log(`======================================\n`);
      this.isInitializing = false;
      return false;
    }
  }

  /**
   * 优化的模型初始化方法（可视化增强）
   */
  async _initializeOptimized() {
    return new Promise((resolve, reject) => {
      const initFunction = async () => {
        try {
          // Step 1: 检查TensorFlow.js环境
          console.log(`🔍 [Step 1] 检查TensorFlow.js运行环境...`);
          if (typeof tf === 'undefined') {
            console.log(`⚠️  TensorFlow.js不可用，切换到纯规则引擎模式`);
            resolve();
            return;
          }
          console.log(`TensorFlow.js环境检查通过 (版本: ${tf.version.tfjs})`);

          // Step 2: 构建神经网络架构
          console.log(` [Step 2] 构建神经网络架构...`);
          console.log(`   ┌─ 输入层: 12维特征向量`);
          console.log(`   ├─ 隐藏层1: 24个神经元 (ReLU + L2正则化)`);
          console.log(`   ├─ Dropout: 30%防过拟合`);
          console.log(`   ├─ 隐藏层2: 16个神经元 (ReLU + L2正则化)`);
          console.log(`   ├─ Dropout: 20%防过拟合`);
          console.log(`   ├─ 隐藏层3: 8个神经元 (ReLU)`);
          console.log(`   └─ 输出层: 1个神经元 (Sigmoid激活)`);

          this.model = tf.sequential({
            layers: [
              tf.layers.dense({ 
                inputShape: [12], // 扩展特征数以支持更多上下文
                units: 24, 
                activation: 'relu',
                kernelInitializer: 'glorotUniform',
                kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
              }),
              tf.layers.dropout({ rate: 0.3 }),
              tf.layers.dense({ 
                units: 16, 
                activation: 'relu',
                kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
              }),
              tf.layers.dropout({ rate: 0.2 }),
              tf.layers.dense({ 
                units: 8, 
                activation: 'relu' 
              }),
              tf.layers.dense({ 
                units: 1, 
                activation: 'sigmoid' 
              })
            ]
          });

          console.log(`神经网络架构构建完成`);

          // Step 3: 编译模型
          console.log(`[Step 3] 编译神经网络模型...`);
          this.model.compile({
            optimizer: tf.train.adam(0.0005), // 降低学习率
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
          });
          console.log(`模型编译完成 (优化器: Adam, 学习率: 0.0005)`);

          // Step 4: 预加载训练数据（后台异步）
          console.log(`[Step 4] 启动训练数据预加载...`);
          this._preloadTrainingDataAsync();

          console.log(`神经网络初始化流程完成`);
          resolve();
        } catch (error) {
          console.error(`神经网络初始化失败:`, error);
          reject(error);
        }
      };

      // 使用requestIdleCallback进行非阻塞初始化
      if (window.requestIdleCallback) {
        window.requestIdleCallback(initFunction, { timeout: 2000 });
      } else {
        setTimeout(initFunction, 0);
      }
    });
  }

  /**
   * 异步预加载训练数据（可视化增强）
   */
  async _preloadTrainingDataAsync() {
    try {
      console.log(`\n[数据预加载] 开始后台加载训练数据...`);
      
      // 分批加载不同系统的数据
      const systems = ['traction', 'door', 'electrical', 'guidance'];
      console.log(`目标系统: ${systems.join(', ')}`);
      
      const loadPromises = systems.map(system => 
        this.dataLoader.loadCSVData(this._getSystemDisplayName(system))
          .catch(error => {
            console.warn(`${system} 数据加载失败:`, error.message);
            return [];
          })
      );

      const results = await Promise.all(loadPromises);
      let totalSamples = 0;
      
      console.log(`📈 [加载结果] 各系统数据统计:`);
      results.forEach((data, index) => {
        if (data.length > 0) {
          this.trainingDataCache.set(systems[index], data);
          totalSamples += data.length;
          console.log(`   ├─ ${this._getSystemDisplayName(systems[index])}: ${data.length} 个样本`);
        } else {
          console.log(`   ├─ ${this._getSystemDisplayName(systems[index])}: 无数据`);
        }
      });

      console.log(`训练数据预加载完成，总计 ${totalSamples} 个样本`);
      console.log(`缓存状态: ${this.trainingDataCache.size}个系统已缓存`);
      
      // 如果有足够的数据，进行快速训练
      if (totalSamples > 100) {
        console.log(` [自动训练] 样本数量充足，启动模型训练...`);
        await this._quickTrainWithRealData();
      } else {
        console.log(` [跳过训练] 样本数量不足(${totalSamples} < 100)，仅使用规则引擎`);
      }
      
    } catch (error) {
      console.warn(`[数据预加载失败]`, error);
    }
  }

  /**
   * 使用真实数据进行快速训练（增强可视化）
   */
  async _quickTrainWithRealData() {
    if (!this.model) return;

    const trainingStartTime = performance.now();
    
    try {
      // 训练可视化开始
      console.log(`\n` +
        ` =======================================\n` +
        `[神经网络训练] 开始训练模型\n` +
        ` 开始时间: ${new Date().toLocaleTimeString()}\n` +
        `训练目标: 异常检测准确率 > 85%\n` +
        `=======================================`);
      
      console.log(` [训练配置] 训练参数设置:`);
      console.log(`   ├─ 训练轮次: 3 epochs (快速训练)`);
      console.log(`   ├─ 批次大小: 32 samples/batch`);
      console.log(`   ├─ 验证分割: 20% (训练/验证 = 80%/20%)`);
      console.log(`   ├─ 数据打乱: 启用`);
      console.log(`   └─ 早停机制: 关闭 (快速模式)`);
      
      const { features, labels } = await this._prepareTrainingData();
      
      if (features && labels && features.shape[0] > 0) {
        const totalSamples = features.shape[0];
        const trainingSamples = Math.floor(totalSamples * 0.8);
        const validationSamples = totalSamples - trainingSamples;
        
        console.log(`\n[数据概览] 训练数据统计:`);
        console.log(`   ├─ 总样本数: ${totalSamples}`);
        console.log(`   ├─ 训练样本: ${trainingSamples}`);
        console.log(`   ├─ 验证样本: ${validationSamples}`);
        console.log(`   ├─ 特征维度: ${features.shape[1]}维`);
        console.log(`   └─ 数据类型: 二分类 (正常/异常)`);

        console.log(`\n [开始训练] 模型训练进行中...`);
        
        // 记录每轮训练的详细信息
        let bestLoss = Infinity;
        let bestAcc = 0;
        
        // 快速训练（少量epoch避免阻塞）
        await this.model.fit(features, labels, {
          epochs: 3,
          batchSize: 32,
          verbose: 0,
          shuffle: true,
          validationSplit: 0.2,
          callbacks: {
            onEpochBegin: (epoch) => {
              console.log(`\n [Epoch ${epoch + 1}/3] 开始训练第${epoch + 1}轮...`);
            },
            onEpochEnd: (epoch, logs) => {
              const loss = logs.loss.toFixed(4);
              const acc = (logs.acc * 100).toFixed(1);
              const valLoss = logs.val_loss ? logs.val_loss.toFixed(4) : 'N/A';
              const valAcc = logs.val_acc ? (logs.val_acc * 100).toFixed(1) : 'N/A';
              
              // 更新最佳指标
              if (logs.loss < bestLoss) bestLoss = logs.loss;
              if (logs.acc > bestAcc) bestAcc = logs.acc;
              
              console.log(` [Epoch ${epoch + 1}] 训练完成:`);
              console.log(`   ├─ 训练损失: ${loss} ${logs.loss < 0.5 ? '✅' : logs.loss < 0.8 ? '⚠️' : '❌'}`);
              console.log(`   ├─ 训练准确率: ${acc}% ${logs.acc > 0.85 ? '✅' : logs.acc > 0.7 ? '⚠️' : '❌'}`);
              console.log(`   ├─ 验证损失: ${valLoss} ${logs.val_loss && logs.val_loss < 0.5 ? '✅' : '⚠️'}`);
              console.log(`   └─ 验证准确率: ${valAcc}% ${logs.val_acc && logs.val_acc > 0.8 ? '✅' : '⚠️'}`);
              
              // 分析训练状态
              if (logs.loss < logs.val_loss && Math.abs(logs.loss - logs.val_loss) > 0.1) {
                console.log(`    分析: 可能存在过拟合趋势`);
              } else if (logs.acc < 0.7) {
                console.log(`   分析: 准确率偏低，建议增加训练数据`);
              } else {
                console.log(`   分析: 训练进展良好`);
              }
            }
          }
        });

        // 清理训练数据
        features.dispose();
        labels.dispose();
        
        const trainingTime = (performance.now() - trainingStartTime).toFixed(1);
        
        //  训练完成总结
        console.log(`\n [训练完成] 神经网络训练结束:`);
        console.log(`┌─   总训练时间: ${trainingTime}ms`);
        console.log(`├─  最佳损失: ${bestLoss.toFixed(4)}`);
        console.log(`├─  最佳准确率: ${(bestAcc * 100).toFixed(1)}%`);
        console.log(`├─  模型状态: ${bestAcc > 0.8 ? '优秀' : bestAcc > 0.7 ? '良好' : '需要改进'}`);
        console.log(`├─  模型已保存到内存`);
        console.log(`└─ 可开始推理分析`);
        console.log(`=======================================\n`);
        
      } else {
        console.log(` [训练失败] 无有效训练数据`);
        console.log(`=======================================\n`);
      }
    } catch (error) {
      console.error(`[训练错误] 模型训练失败:`, error);
      console.log(`=======================================\n`);
    }
  }

  /**
   * 准备训练数据
   */
  async _prepareTrainingData() {
    const allFeatures = [];
    const allLabels = [];

    for (const [systemKey, data] of this.trainingDataCache.entries()) {
      // 限制每个系统的样本数量以平衡数据
      const samples = data.slice(0, 200);
      
      for (const sample of samples) {
        const features = this._buildEnhancedFeatureVector(sample);
        const label = this._getLabelFromSample(sample);
        
        if (features && features.length === 12) {
          allFeatures.push(features);
          allLabels.push([label]);
        }
      }
    }

    if (allFeatures.length === 0) {
      return { features: null, labels: null };
    }

    return {
      features: tf.tensor2d(allFeatures),
      labels: tf.tensor2d(allLabels)
    };
  }

  /**
   * 从样本获取标签
   */
  _getLabelFromSample(sample) {
    if (sample.severityLevel === 'critical') return 1.0;
    if (sample.severityLevel === 'warning') return 0.7;
    return 0.0;
  }

  /**
   * 构建增强的特征向量（12维）
   */
  _buildEnhancedFeatureVector(sample) {
    try {
      const value = typeof sample === 'object' ? sample.value : parseFloat(sample.eData || sample);
      
      if (isNaN(value)) return null;

      // 基础特征
      const normalizedValue = this._normalizeValue(value);
      const logFeature = Math.log(Math.abs(value) + 1) / 10;
      const squareFeature = (value * value) / 10000;
      
      // 上下文特征（从真实数据中提取）
      const loadWeight = sample.loadWeight || 500;
      const speed = sample.speed || 1.0;
      const operatingHours = sample.operatingHours || 5000;
      const ambientTemp = sample.ambientTemp || 25;
      const humidity = sample.humidity || 50;
      const maintenanceDays = sample.maintenanceDaysSince || 30;
      
      // 标准化上下文特征
      const normalizedLoad = Math.min(1, loadWeight / 1000);
      const normalizedSpeed = Math.min(1, speed / 2);
      const normalizedHours = Math.min(1, operatingHours / 10000);
      const normalizedTemp = (ambientTemp - 20) / 20;
      const normalizedHumidity = humidity / 100;
      const normalizedMaintenance = Math.min(1, maintenanceDays / 90);

      return [
        normalizedValue,
        logFeature,
        squareFeature,
        normalizedLoad,
        normalizedSpeed,
        normalizedHours,
        normalizedTemp,
        normalizedHumidity,
        normalizedMaintenance,
        Math.sin(Date.now() / 1000 / 3600) * 0.1, // 时间特征
        Math.random() * 0.05, // 噪声特征
        sample.anomalyScore || 0 // 原始异常评分
      ];
    } catch (error) {
      console.warn('构建特征向量失败:', error);
      return null;
    }
  }

  /**
   * 值标准化
   */
  _normalizeValue(value) {
    return Math.min(1, Math.max(0, value / 100));
  }

  /**
   * 智能分析主函数（优化版 + 增强可视化）
   */
  async quickAnalyze(abnormalData) {
    const startTime = performance.now();
    this.performanceStats.totalAnalyses++;

    //  分析可视化开始
    console.log(`\n` +
      ` =======================================\n` +
      ` [智能异常分析] 开始分析\n` +
      ` 输入数据: ${abnormalData.eName} = ${abnormalData.eData}\n` +
      ` 开始时间: ${new Date().toLocaleTimeString()}\n` +
      ` 分析目标: 异常严重性评估\n` +
      `=======================================`);

    // 检查缓存
    const cacheKey = this._generateCacheKey(abnormalData);
    if (this.analysisCache.has(cacheKey)) {
      console.log(` [缓存命中] 使用缓存结果，跳过计算`);
      this.performanceStats.cacheHitRate = 
        (this.performanceStats.cacheHitRate * (this.performanceStats.totalAnalyses - 1) + 1) / 
        this.performanceStats.totalAnalyses;
      const cachedResult = this.analysisCache.get(cacheKey);
      console.log(` [缓存结果] 严重性: ${cachedResult.severity}, 置信度: ${cachedResult.confidence.toFixed(2)}`);
      console.log(`=======================================\n`);
      return cachedResult;
    }

    try {
      console.log(` [分析流程] 开始多层分析架构:`);
      console.log(`   ├─ 第1层: 增强规则引擎分析`);
      console.log(`   ├─ 第2层: TensorFlow.js ML推理`);
      console.log(`   └─ 第3层: 混合决策融合`);
      
      // 优先使用增强的规则引擎
      console.log(`\n [第1层] 启动增强规则引擎...`);
      const ruleStartTime = performance.now();
      const ruleResult = await this._enhancedRuleBasedAnalysis(abnormalData);
      const ruleTime = (performance.now() - ruleStartTime).toFixed(1);
      
      console.log(` [规则引擎] 分析完成 (${ruleTime}ms):`);
      console.log(`   ├─ 严重性等级: ${ruleResult.severity} ${this._getSeverityEmoji(ruleResult.severity)}`);
      console.log(`   ├─ 置信度: ${ruleResult.confidence.toFixed(2)} ${ruleResult.confidence >= 0.9 ? '✅' : '⚠️'}`);
      console.log(`   ├─ 异常评分: ${ruleResult.anomalyScore.toFixed(3)}`);
      console.log(`   └─ 故障类型: ${ruleResult.faultType}`);
      
      // 如果规则引擎置信度足够高，直接返回
      if (ruleResult.confidence >= 0.9) {
        console.log(`\n [决策] 规则引擎置信度高(${ruleResult.confidence.toFixed(2)})，无需ML增强`);
        console.log(`⚡ [性能优化] 跳过深度学习推理，节省计算资源`);
        
        const result = this.formatAnalysisResult(ruleResult, startTime, 'enhanced_rule');
        this._cacheResult(cacheKey, result);
        
        const totalTime = (performance.now() - startTime).toFixed(1);
        console.log(` [分析完成] 总耗时: ${totalTime}ms`);
        console.log(`=======================================\n`);
        return result;
      }

      // 尝试ML增强
      if (this.isInitialized && this.model) {
        try {
          console.log(`\n [第2层] 启动TensorFlow.js ML推理...`);
          const mlStartTime = performance.now();
          
          console.log(` [特征工程] 构建12维特征向量:`);
          const features = this._buildEnhancedFeatureVector(abnormalData);
          if (features) {
            console.log(`   ├─ 特征维度: ${features.length}维`);
            console.log(`   ├─ 标准化值: ${features[0].toFixed(3)}`);
            console.log(`   ├─ 对数特征: ${features[1].toFixed(3)}`);
            console.log(`   ├─ 平方特征: ${features[2].toFixed(3)}`);
            console.log(`   └─ 上下文特征: ${features.slice(3, 6).map(f => f.toFixed(2)).join(', ')}`);
          }
          
          console.log(` [神经网络推理] 输入特征到模型...`);
          console.log(`   ├─ 网络架构: 12→24→16→8→1`);
          console.log(`   ├─ 激活函数: ReLU + Sigmoid`);
          console.log(`   └─ 正则化: L2 + Dropout`);
          
          const mlResult = await this.performMLAnalysis(abnormalData);
          const mlTime = (performance.now() - mlStartTime).toFixed(1);
          
          console.log(` [ML推理] 神经网络分析完成 (${mlTime}ms):`);
          console.log(`   ├─ ML严重性: ${mlResult.severity} ${this._getSeverityEmoji(mlResult.severity)}`);
          console.log(`   ├─ ML置信度: ${mlResult.confidence.toFixed(2)}`);
          console.log(`   ├─ 异常概率: ${(mlResult.anomalyScore * 100).toFixed(1)}%`);
          console.log(`   └─ 推理时间: ${mlResult.inferenceTime.toFixed(1)}ms`);
          
          console.log(`\n [第3层] 混合决策融合...`);
          const enhancedResult = this.combineResults(ruleResult, mlResult);
          
          console.log(` [决策融合] 规则引擎(70%) + ML模型(30%):`);
          console.log(`   ├─ 融合严重性: ${enhancedResult.severity} ${this._getSeverityEmoji(enhancedResult.severity)}`);
          console.log(`   ├─ 融合置信度: ${enhancedResult.confidence.toFixed(2)}`);
          console.log(`   └─ 最终评分: ${enhancedResult.anomalyScore.toFixed(3)}`);
          
          const result = this.formatAnalysisResult(enhancedResult, startTime, 'hybrid');
          this._cacheResult(cacheKey, result);
          
          const totalTime = (performance.now() - startTime).toFixed(1);
          console.log(`\n [混合分析完成] AI+ML双重验证:`);
          console.log(`┌─  总分析时间: ${totalTime}ms`);
          console.log(`├─  规则引擎: ${ruleTime}ms`);
          console.log(`├─  神经网络: ${mlTime}ms`);
          console.log(`├─  最终结果: ${enhancedResult.severity}级异常`);
          console.log(`└─  分析置信度: ${(enhancedResult.confidence * 100).toFixed(1)}%`);
          console.log(`=======================================\n`);
          return result;
          
        } catch (mlError) {
          console.warn(` [ML错误] 神经网络推理失败: ${mlError.message}`);
          console.log(` [降级处理] 切换到纯规则引擎模式`);
        }
      } else {
        console.log(` [ML状态] 神经网络模型未就绪:`);
        console.log(`   ├─ 初始化状态: ${this.isInitialized ? '✅' : '❌'}`);
        console.log(`   ├─ 模型加载: ${this.model ? '✅' : '❌'}`);
        console.log(`   └─ 降级模式: 纯规则引擎`);
      }

      // 降级到规则引擎
      console.log(`\n⚡ [降级分析] 使用规则引擎最终结果`);
      const result = this.formatAnalysisResult(ruleResult, startTime, 'rule_fallback');
      this._cacheResult(cacheKey, result);
      
      const totalTime = (performance.now() - startTime).toFixed(1);
      console.log(`[规则分析完成] 分析耗时: ${totalTime}ms`);
      console.log(`=======================================\n`);
      return result;

    } catch (error) {
      console.error(` [严重错误] 分析过程异常:`, error);
      const fallbackResult = this.createFallbackResult(abnormalData);
      const result = this.formatAnalysisResult(fallbackResult, startTime, 'fallback');
      console.log(`[紧急降级] 使用默认分析结果`);
      console.log(`=======================================\n`);
      return result;
    } finally {
      this.updatePerformanceStats(startTime);
    }
  }

  /**
   * 获取严重性等级对应的表情符号
   */
  _getSeverityEmoji(severity) {
    const emojiMap = {
      'normal': '✅',
      'warning': '⚠️',
      'critical': '🚨'
    };
    return emojiMap[severity] || '❓';
  }

  /**
   * 增强的规则分析（集成真实数据集统计）
   */
  async _enhancedRuleBasedAnalysis(data) {
    // 获取参数名（处理映射）
    let parameterName = data.eName;
    if (this.parameterMapping[parameterName]) {
      parameterName = this.parameterMapping[parameterName];
    }
    
    const value = parseFloat(data.eData);
    
    // 查找参数规范
    let spec = null;
    let systemKey = null;
    let parameterInfo = null;
    
    // 遍历所有系统寻找匹配的参数
    for (const [sysKey, sysParams] of Object.entries(this.parameterSpecs)) {
      if (sysParams[parameterName]) {
        spec = sysParams[parameterName];
        systemKey = sysKey;
        parameterInfo = this.getParameterDisplayInfo(parameterName, spec);
        break;
      }
    }

    if (!spec) {
      console.warn(`未知参数: ${parameterName}, 原始: ${data.eName}`);
      return this.createUnknownParameterResult(data.eName, value);
    }

    // 尝试获取历史统计数据增强分析
    let historicalContext = null;
    try {
      const systemDisplayName = this._getSystemDisplayName(systemKey);
      const samples = await this.dataLoader.getParameterSamples(systemDisplayName, parameterName, 10);
      if (samples.length > 0) {
        historicalContext = this._analyzeHistoricalContext(value, samples);
      }
    } catch (error) {
      console.warn('获取历史数据失败:', error);
    }

    console.log(`📋 分析参数: ${parameterInfo.displayName} = ${value}${spec.unit}`);
    
    // 确定严重程度（考虑历史上下文）
    let severity, confidence, anomalyScore, faultType, faultDescription, recommendation;

    if (this.isInRange(value, spec.critical_range)) {
      severity = 'critical';
      confidence = historicalContext ? Math.min(0.98, 0.95 + historicalContext.confidenceBoost) : 0.95;
      anomalyScore = 0.8 + Math.min(0.2, this.calculateRangePosition(value, spec.critical_range) * 0.2);
      
      const analysis = this.analyzeCriticalFault(parameterName, value, spec, parameterInfo, historicalContext);
      faultType = analysis.type;
      faultDescription = analysis.description;
      recommendation = {
        main: '立即停止设备运行，联系专业维修人员进行紧急检修',
        specific: analysis.specific
      };
    } else if (this.isInRange(value, spec.warning_range)) {
      severity = 'warning';
      confidence = historicalContext ? Math.min(0.95, 0.90 + historicalContext.confidenceBoost) : 0.90;
      anomalyScore = 0.3 + this.calculateRangePosition(value, spec.warning_range) * 0.4;
      
      const analysis = this.analyzeWarningFault(parameterName, value, spec, parameterInfo, historicalContext);
      faultType = analysis.type;
      faultDescription = analysis.description;
      recommendation = {
        main: '建议安排预防性维护，密切监控参数变化',
        specific: analysis.specific
      };
    } else if (this.isInRange(value, spec.normal_range)) {
      severity = 'normal';
      confidence = 0.95;
      const center = (spec.normal_range[0] + spec.normal_range[1]) / 2;
      const distance = Math.abs(value - center);
      const maxDistance = (spec.normal_range[1] - spec.normal_range[0]) / 2;
      anomalyScore = Math.min(0.2, (distance / maxDistance) * 0.2);
      
      faultType = '参数正常';
      faultDescription = `${parameterInfo.displayName}在正常范围内，系统运行正常`;
      recommendation = {
        main: '参数正常，建议继续监控',
        specific: '保持现有维护计划'
      };
    } else {
      // 超出所有已知范围
      severity = 'critical';
      confidence = 0.90;
      anomalyScore = 1.0;
      faultType = '参数严重超标';
      faultDescription = `${parameterInfo.displayName}严重偏离正常范围，可能存在传感器故障或设备异常`;
      recommendation = {
        main: '立即停止运行并检查传感器和设备状态',
        specific: '参数值异常，需要专业诊断'
      };
    }

    return {
      severity,
      confidence,
      anomalyScore: Math.min(anomalyScore, 1.0),
      source: historicalContext ? 'enhanced_rule_with_history' : 'enhanced_rule',
      faultType,
      faultDescription,
      recommendation,
      parameterInfo: this.buildParameterInfo(parameterName, value, spec, parameterInfo),
      historicalContext
    };
  }

  /**
   * 分析历史上下文
   */
  _analyzeHistoricalContext(currentValue, samples) {
    if (!samples || samples.length === 0) return null;

    const values = samples.map(s => s.value);
    const anomalyScores = samples.map(s => s.anomalyScore);
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
    const zScore = Math.abs((currentValue - mean) / (std || 1));
    
    const anomalousCount = samples.filter(s => s.severity === 'warning' || s.severity === 'critical').length;
    const anomalyRate = anomalousCount / samples.length;
    
    // 计算置信度提升
    let confidenceBoost = 0;
    if (zScore > 2) confidenceBoost += 0.02; // 统计显著性
    if (anomalyRate < 0.1) confidenceBoost += 0.01; // 历史稳定性
    
    return {
      historicalMean: mean,
      historicalStd: std,
      zScore,
      anomalyRate,
      confidenceBoost,
      sampleCount: samples.length
    };
  }

  /**
   * 生成缓存键
   */
  _generateCacheKey(data) {
    return `${data.eName}_${data.eData}_${data.systemName || 'unknown'}`;
  }

  /**
   * 缓存分析结果
   */
  _cacheResult(key, result) {
    if (this.analysisCache.size >= this.cacheMaxSize) {
      // 删除最老的缓存项
      const firstKey = this.analysisCache.keys().next().value;
      this.analysisCache.delete(firstKey);
    }
    this.analysisCache.set(key, result);
  }

  /**
   * 获取系统显示名称
   */
  _getSystemDisplayName(systemKey) {
    const systemNames = {
      'traction': '曳引系统',
      'guidance': '导向系统', 
      'electrical': '电气控制系统',
      'door': '门系统'
    };
    return systemNames[systemKey] || systemKey;
  }

  // 这部分已经被新的优化版本替换

  /**
   * 生成训练数据
   */
  generateTrainingData(numSamples = 200) {
    const features = [];
    const labels = [];

    for (let i = 0; i < numSamples; i++) {
      const sample = this.generateRealisticSample();
      features.push(sample.features);
      labels.push(sample.label);
    }

    return {
      features: tf.tensor2d(features),
      labels: tf.tensor2d(labels, [numSamples, 1])
    };
  }

  /**
   * 生成真实样本 - 基于数据生成器的逻辑
   */
  generateRealisticSample() {
    const isAnomalous = Math.random() < 0.35; // 35%异常样本
    
    // 随机选择系统和参数
    const systems = Object.keys(this.parameterSpecs);
    const system = systems[Math.floor(Math.random() * systems.length)];
    const parameters = Object.keys(this.parameterSpecs[system]);
    const parameter = parameters[Math.floor(Math.random() * parameters.length)];
    const spec = this.parameterSpecs[system][parameter];
    
    let value;
    let label;
    
    if (isAnomalous) {
      // 70%概率为警告，30%概率为严重
      if (Math.random() < 0.7) {
        value = this.randomInRange(spec.warning_range);
        label = 0.6; // 警告级
      } else {
        value = this.randomInRange(spec.critical_range);
        label = 1.0; // 严重级
      }
    } else {
      value = this.randomInRange(spec.normal_range);
      label = 0.0; // 正常
    }
    
    // 构建特征向量
    const features = this.buildFeatureVector({
      eName: parameter,
      eData: value.toString(),
      systemName: this.getSystemDisplayName(system)
    });
    
    return { features, label };
  }

  /**
   * 在范围内生成随机数
   */
  randomInRange([min, max]) {
    return Math.random() * (max - min) + min;
  }

  /**
   * 获取系统显示名称
   */
  getSystemDisplayName(systemKey) {
    const systemNames = {
      'traction': '曳引系统',
      'guidance': '导向系统', 
      'electrical': '电气控制系统',
      'door': '门系统'
    };
    return systemNames[systemKey] || systemKey;
  }

  // 这部分已经被新的优化版本替换

  /**
   * 传统规则分析（保持兼容性）
   */
  ruleBasedAnalysis(data) {
    // 为了保持兼容性，调用新的增强分析方法
    return this._enhancedRuleBasedAnalysisSync(data);
  }

  /**
   * 同步版本的增强规则分析（用于兼容性）
   */
  _enhancedRuleBasedAnalysisSync(data) {
    // 获取参数名（处理映射）
    let parameterName = data.eName;
    if (this.parameterMapping[parameterName]) {
      parameterName = this.parameterMapping[parameterName];
    }
    
    const value = parseFloat(data.eData);
    
    // 查找参数规范
    let spec = null;
    let systemKey = null;
    let parameterInfo = null;
    
    // 遍历所有系统寻找匹配的参数
    for (const [sysKey, sysParams] of Object.entries(this.parameterSpecs)) {
      if (sysParams[parameterName]) {
        spec = sysParams[parameterName];
        systemKey = sysKey;
        parameterInfo = this.getParameterDisplayInfo(parameterName, spec);
        break;
      }
    }

    if (!spec) {
      console.warn(`未知参数: ${parameterName}, 原始: ${data.eName}`);
      return this.createUnknownParameterResult(data.eName, value);
    }

    console.log(`📋 分析参数: ${parameterInfo.displayName} = ${value}${spec.unit}`);
    
    // 确定严重程度
    let severity, confidence, anomalyScore, faultType, faultDescription, recommendation;

    if (this.isInRange(value, spec.critical_range)) {
      severity = 'critical';
      confidence = 0.95;
      anomalyScore = 0.85 + Math.min(0.15, this.calculateRangePosition(value, spec.critical_range) * 0.15);
      
      const analysis = this.analyzeCriticalFault(parameterName, value, spec, parameterInfo);
      faultType = analysis.type;
      faultDescription = analysis.description;
      recommendation = {
        main: '立即停止设备运行，联系专业维修人员进行紧急检修',
        specific: analysis.specific
      };
    } else if (this.isInRange(value, spec.warning_range)) {
      severity = 'warning';
      confidence = 0.90;
      anomalyScore = 0.3 + this.calculateRangePosition(value, spec.warning_range) * 0.4;
      
      const analysis = this.analyzeWarningFault(parameterName, value, spec, parameterInfo);
      faultType = analysis.type;
      faultDescription = analysis.description;
      recommendation = {
        main: '建议安排预防性维护，密切监控参数变化',
        specific: analysis.specific
      };
    } else if (this.isInRange(value, spec.normal_range)) {
      severity = 'normal';
      confidence = 0.95;
      const center = (spec.normal_range[0] + spec.normal_range[1]) / 2;
      const distance = Math.abs(value - center);
      const maxDistance = (spec.normal_range[1] - spec.normal_range[0]) / 2;
      anomalyScore = Math.min(0.2, (distance / maxDistance) * 0.2);
      
      faultType = '参数正常';
      faultDescription = `${parameterInfo.displayName}在正常范围内，系统运行正常`;
      recommendation = {
        main: '参数正常，建议继续监控',
        specific: '保持现有维护计划'
      };
    } else {
      // 超出所有已知范围
      severity = 'critical';
      confidence = 0.90;
      anomalyScore = 1.0;
      faultType = '参数严重超标';
      faultDescription = `${parameterInfo.displayName}严重偏离正常范围，可能存在传感器故障或设备异常`;
      recommendation = {
        main: '立即停止运行并检查传感器和设备状态',
        specific: '参数值异常，需要专业诊断'
      };
    }

    return {
      severity,
      confidence,
      anomalyScore: Math.min(anomalyScore, 1.0),
      source: 'rule_engine',
      faultType,
      faultDescription,
      recommendation,
      parameterInfo: this.buildParameterInfo(parameterName, value, spec, parameterInfo)
    };
  }

  /**
   * 检查值是否在指定范围内
   */
  isInRange(value, range) {
    return value >= range[0] && value <= range[1];
  }

  /**
   * 计算在范围内的位置（0-1）
   */
  calculateRangePosition(value, range) {
    const [min, max] = range;
    return Math.min(1, Math.max(0, (value - min) / (max - min)));
  }

  /**
   * 分析严重故障
   */
  analyzeCriticalFault(parameterName, value, spec, parameterInfo) {
    const criticalAnalysis = {
      'motorTemperature': {
        type: '电机严重过热',
        description: '电机温度严重超标，存在烧毁风险',
        specific: '可能原因：负载过重、冷却系统故障、轴承磨损严重'
      },
      'current': {
        type: '电流严重过载',
        description: '电机电流严重超标，存在电气故障风险',
        specific: '可能原因：机械阻力过大、电机故障、控制系统异常'
      },
      'vibrationSpeed': {
        type: '振动严重超标',
        description: '系统振动严重超标，存在机械损坏风险',
        specific: '可能原因：导轨磨损、轴承故障、系统失衡'
      },
      'bearingTemperature': {
        type: '轴承严重过热',
        description: '轴承温度严重超标，存在烧毁风险',
        specific: '可能原因：润滑不足、负载过重、轴承磨损严重'
      },
      'brakeClearance': {
        type: '制动间隙过大',
        description: '制动器间隙严重超标，制动效果不足',
        specific: '可能原因：制动片磨损、调整不当、机械松动'
      },
      'mechanicalDepth': {
        type: '门锁闭合不足',
        description: '门锁机械闭合深度不足，存在安全隐患',
        specific: '可能原因：门锁调整不当、机械磨损、安装问题'
      }
    };

    return criticalAnalysis[parameterName] || {
      type: '严重异常',
      description: `${parameterInfo.displayName}严重超标`,
      specific: '需要专业技术人员立即检查'
    };
  }

  /**
   * 分析警告故障
   */
  analyzeWarningFault(parameterName, value, spec, parameterInfo) {
    const warningAnalysis = {
      'motorTemperature': {
        type: '电机温度偏高',
        description: '电机温度超出正常范围，需要关注',
        specific: '建议检查负载情况和冷却系统'
      },
      'current': {
        type: '电流偏高',
        description: '电机电流超出正常范围',
        specific: '建议检查机械传动系统和电机状态'
      },
      'vibrationSpeed': {
        type: '振动水平偏高',
        description: '系统振动超出正常范围',
        specific: '建议检查机械部件对齐和磨损情况'
      },
      'openCloseTime': {
        type: '门响应时间延长',
        description: '开关门时间超出正常范围',
        specific: '建议检查门机和控制系统'
      },
      'bearingTemperature': {
        type: '轴承温度偏高',
        description: '轴承温度超出正常范围，需要关注',
        specific: '建议检查润滑系统和负载情况'
      }
    };

    return warningAnalysis[parameterName] || {
      type: '轻度异常',
      description: `${parameterInfo.displayName}超出正常范围`,
      specific: '建议安排预防性维护检查'
    };
  }

  /**
   * 创建未知参数结果
   */
  createUnknownParameterResult(parameterName, value) {
    return {
      severity: 'warning',
      confidence: 0.6,
      anomalyScore: 0.5,
      source: 'rule_engine',
      faultType: '未知参数异常',
      faultDescription: `检测到未知参数 ${parameterName} 异常，数值: ${value}`,
      recommendation: {
        main: '建议联系技术人员进行专业诊断',
        specific: '未知参数需要专业分析'
      },
      parameterInfo: {
        displayName: parameterName,
        baseline: 'N/A',
        unit: '',
        deviation: 'N/A',
        description: '未知参数'
      }
    };
  }

  /**
   * 获取参数显示信息
   */
  getParameterDisplayInfo(parameterName, spec) {
    return {
      displayName: spec.displayName || parameterName,
      unit: spec.unit,
      baseline: spec.baseline,
      component: spec.component,
      normalRange: `${spec.normal_range[0]}-${spec.normal_range[1]}${spec.unit}`,
      warningRange: `${spec.warning_range[0]}-${spec.warning_range[1]}${spec.unit}`,
      criticalRange: `${spec.critical_range[0]}+${spec.unit}`
    };
  }

  /**
   * 构建参数信息
   */
  buildParameterInfo(parameterName, value, spec, parameterInfo) {
    const deviation = Math.abs(value - spec.baseline);
    const deviationPercentage = spec.baseline !== 0 ? (deviation / spec.baseline * 100).toFixed(1) : '0';
    
    return {
      displayName: parameterInfo.displayName,
      baseline: `${spec.baseline}${spec.unit}`,
      unit: spec.unit,
      deviation: `${deviationPercentage}%`,
      description: `${parameterInfo.component}${parameterInfo.displayName}监测`,
      normalRange: parameterInfo.normalRange,
      warningRange: parameterInfo.warningRange,
      criticalRange: parameterInfo.criticalRange
    };
  }

  /**
   * ML模型分析（优化版）
   */
  async performMLAnalysis(data) {
    if (!this.model) {
      throw new Error('ML模型未初始化');
    }

    const mlStartTime = performance.now();
    
    try {
      // 构建增强特征向量
      const features = this._buildEnhancedFeatureVector(data);
      
      if (!features || features.length !== 12) {
        throw new Error('特征向量构建失败');
      }

      const inputTensor = tf.tensor2d([features]);
      
      try {
        const prediction = this.model.predict(inputTensor);
        const anomalyScore = await prediction.data();
        
        // 记录ML推理时间
        this.performanceStats.mlInferenceTime = performance.now() - mlStartTime;
        
        return {
          severity: anomalyScore[0] > 0.9 ? 'critical' : anomalyScore[0] > 0.7 ? 'warning' : 'normal',
          confidence: Math.min(0.9, 0.7 + (anomalyScore[0] > 0.9 ? 0.2 : 0.1)),
          anomalyScore: anomalyScore[0],
          source: 'enhanced_ml_model',
          inferenceTime: performance.now() - mlStartTime
        };
      } finally {
        inputTensor.dispose();
        if (typeof prediction !== 'undefined' && prediction.dispose) {
          prediction.dispose();
        }
      }
    } catch (error) {
      console.error('ML推理失败:', error);
      throw error;
    }
  }

  /**
   * 构建特征向量（8维）
   */
  buildFeatureVector(data) {
    const value = parseFloat(data.eData);
    const parameter = data.eName;
    
    // 基础特征
    const normalizedValue = this.normalizeParameter(parameter, value);
    const logFeature = Math.log(Math.abs(value) + 1) / 10;
    const squareFeature = (value * value) / 10000;
    
    // 时间特征
    const temporalFeature = Math.sin(Date.now() / 1000 / 3600) * 0.1;
    
    // 参数相关性特征
    const correlationFeature = this.calculateParameterCorrelation(parameter, value);
    
    // 统计特征
    const zScore = this.calculateZScore(parameter, value);
    const outlierScore = this.calculateOutlierScore(parameter, value);
    
    // 噪声特征
    const noiseFeature = Math.random() * 0.1;
    
    return [
      normalizedValue,
      logFeature,
      squareFeature,
      temporalFeature,
      correlationFeature,
      zScore,
      outlierScore,
      noiseFeature
    ];
  }

  /**
   * 参数归一化
   */
  normalizeParameter(parameter, value) {
    // 查找参数规范
    for (const system of Object.values(this.parameterSpecs)) {
      if (system[parameter]) {
        const spec = system[parameter];
        const range = spec.critical_range[1] - spec.normal_range[0];
        return Math.min(1, Math.max(0, (value - spec.normal_range[0]) / range));
      }
    }
    return Math.min(1, value / 100); // 默认归一化
  }

  /**
   * 计算参数相关性
   */
  calculateParameterCorrelation(parameter, value) {
    const correlations = {
      'motorTemperature': value > 80 ? 0.9 : 0.2,
      'current': value > 20 ? 0.8 : 0.1,
      'voltageFluctuation': Math.abs(value) > 10 ? 0.9 : 0.1,
      'vibrationSpeed': value > 2.8 ? 0.8 : 0.2,
      'openCloseTime': value > 3 ? 0.7 : 0.1
    };
    
    return correlations[parameter] || 0.3;
  }

  /**
   * 计算Z分数
   */
  calculateZScore(parameter, value) {
    for (const system of Object.values(this.parameterSpecs)) {
      if (system[parameter]) {
        const spec = system[parameter];
        const mean = spec.baseline;
        const std = (spec.normal_range[1] - spec.normal_range[0]) / 4; // 估算标准差
        return Math.abs((value - mean) / std);
      }
    }
    return 0;
  }

  /**
   * 计算异常值评分
   */
  calculateOutlierScore(parameter, value) {
    for (const system of Object.values(this.parameterSpecs)) {
      if (system[parameter]) {
        const spec = system[parameter];
        const normalCenter = (spec.normal_range[0] + spec.normal_range[1]) / 2;
        const normalRadius = (spec.normal_range[1] - spec.normal_range[0]) / 2;
        const distance = Math.abs(value - normalCenter);
        return Math.min(1, distance / normalRadius);
      }
    }
    return 0;
  }

  /**
   * 结合规则和ML结果
   */
  combineResults(ruleResult, mlResult) {
    const ruleWeight = 0.7;
    const mlWeight = 0.3;
    
    const combinedScore = ruleResult.anomalyScore * ruleWeight + mlResult.anomalyScore * mlWeight;
    const combinedConfidence = Math.max(ruleResult.confidence, mlResult.confidence * 0.9);
    
    // 严重性以规则引擎为主，ML为辅
    let severity = ruleResult.severity;
    if (mlResult.severity === 'critical' && ruleResult.severity === 'warning') {
      severity = 'critical';
    }
    
    return {
      ...ruleResult, // 保持规则引擎的详细信息
      severity,
      confidence: combinedConfidence,
      anomalyScore: combinedScore,
      source: 'hybrid'
    };
  }

  /**
   * 创建降级结果
   */
  createFallbackResult(data) {
    return {
      severity: 'warning',
      confidence: 0.5,
      anomalyScore: 0.6,
      source: 'fallback',
      faultType: '系统分析异常',
      faultDescription: '分析系统遇到问题，建议人工检查',
      recommendation: {
        main: '建议联系技术支持进行人工分析',
        specific: '系统暂时无法提供详细分析'
      },
      parameterInfo: {
        displayName: data.eName,
        baseline: 'N/A',
        unit: '',
        deviation: 'N/A',
        description: '分析异常'
      }
    };
  }

  /**
   * 格式化分析结果
   */
  formatAnalysisResult(result, startTime, analysisSource) {
    const analysisTime = Math.round(performance.now() - startTime);
    
    return {
      success: true,
      severity: result.severity,
      confidence: result.confidence,
      anomalyScore: result.anomalyScore,
      faultType: result.faultType,
      faultDescription: result.faultDescription,
      recommendation: result.recommendation,
      parameterInfo: result.parameterInfo,
      analysisTime,
      analysisSource,
      needsDeepAnalysis: result.confidence < 0.8 || result.severity === 'critical',
      details: {
        source: analysisSource,
        modelVersion: this.version,
        processingTime: analysisTime
      }
    };
  }

  /**
   * 更新性能统计
   */
  updatePerformanceStats(startTime) {
    const analysisTime = performance.now() - startTime;
    this.performanceStats.averageAnalysisTime = 
      (this.performanceStats.averageAnalysisTime * (this.performanceStats.totalAnalyses - 1) + analysisTime) / 
      this.performanceStats.totalAnalyses;
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    return {
      ...this.performanceStats,
      isInitialized: this.isInitialized,
      modelVersion: this.version,
      memoryUsage: this.model ? 'Active' : 'Inactive'
    };
  }

  /**
   * 获取数据集统计信息
   */
  async getDatasetStats() {
    try {
      const stats = {};
      const systems = ['曳引系统', '导向系统', '电气控制系统', '门系统'];
      
      for (const system of systems) {
        try {
          const data = await this.dataLoader.loadCSVData(system);
          stats[system] = {
            totalSamples: data.length,
            normalSamples: data.filter(d => d.severityLevel === 'normal').length,
            warningSamples: data.filter(d => d.severityLevel === 'warning').length,
            criticalSamples: data.filter(d => d.severityLevel === 'critical').length,
            parameters: [...new Set(data.map(d => d.parameterName))],
            dateRange: {
              start: data.length > 0 ? data[0].timestamp : null,
              end: data.length > 0 ? data[data.length - 1].timestamp : null
            }
          };
        } catch (error) {
          stats[system] = { error: error.message };
        }
      }
      
      return stats;
    } catch (error) {
      console.error('获取数据集统计失败:', error);
      return {};
    }
  }

  /**
   * 获取性能优化建议
   */
  getPerformanceRecommendations() {
    const recommendations = [];
    
    if (this.performanceStats.averageAnalysisTime > 100) {
      recommendations.push('分析时间较长，建议清理缓存或减少特征维度');
    }
    
    if (this.performanceStats.cacheHitRate < 0.3) {
      recommendations.push('缓存命中率较低，建议增加缓存大小');
    }
    
    if (this.analysisCache.size > this.cacheMaxSize * 0.9) {
      recommendations.push('缓存接近满载，建议定期清理');
    }
    
    if (!this.isInitialized) {
      recommendations.push('ML模型未初始化，建议检查TensorFlow.js加载状态');
    }
    
    return recommendations;
  }

  /**
   * 清理缓存和资源
   */
  cleanup() {
    this.analysisCache.clear();
    this.trainingDataCache.clear();
    this.dataLoader.clearCache();
    
    if (this.dataWorker) {
      this.dataWorker.terminate();
      this.dataWorker = null;
    }
    
    console.log('🧹 ML分析器缓存和资源已清理');
  }

  /**
   * 清理资源
   */
  dispose() {
    this.cleanup();
    
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    
    this.isInitialized = false;
    console.log('🔥 ML分析器已完全释放');
  }

  /**
   * 获取增强的性能统计（增强可视化）
   */
  getEnhancedPerformanceStats() {
    //  生成详细的性能报告
    console.log(`\n` +
      ` =======================================\n` +
      ` [ML性能监控] 智云梯ML引擎状态报告\n` +
      `生成时间: ${new Date().toLocaleTimeString()}\n` +
      `引擎版本: ${this.version}\n` +
      `=======================================`);

    console.log(`🔧 [系统状态] ML引擎运行状态:`);
    console.log(`   ├─ 初始化状态: ${this.isInitialized ? '✅ 已就绪' : '❌ 未就绪'}`);
    console.log(`   ├─ 神经网络: ${this.model ? '✅ 已加载' : '❌ 未加载'}`);
    console.log(`   ├─ TensorFlow.js: ${typeof tf !== 'undefined' ? '✅ 可用' : '❌ 不可用'}`);
    console.log(`   └─ Worker支持: ${this.workerSupported ? '✅ 支持' : '❌ 不支持'}`);

    console.log(`\n [性能指标] 分析性能统计:`);
    console.log(`   ├─ 总分析次数: ${this.performanceStats.totalAnalyses} 次`);
    console.log(`   ├─ 平均分析时间: ${this.performanceStats.averageAnalysisTime.toFixed(1)}ms`);
    console.log(`   ├─ 缓存命中率: ${(this.performanceStats.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`   ├─ 初始化时间: ${this.performanceStats.initTime.toFixed(1)}ms`);
    console.log(`   └─ ML推理时间: ${this.performanceStats.mlInferenceTime.toFixed(1)}ms`);

    console.log(`\n [缓存状态] 内存使用情况:`);
    console.log(`   ├─ 分析缓存: ${this.analysisCache.size}/${this.cacheMaxSize} 项`);
    console.log(`   ├─ 训练数据缓存: ${this.trainingDataCache.size} 个系统`);
    console.log(`   ├─ 数据加载器缓存: ${this.dataLoader.getCacheStatus()}`);
    console.log(`   └─ 内存占用: ${this.model ? '活跃使用中' : '空闲'}`);

    // 性能分析和建议
    const recommendations = this.getPerformanceRecommendations();
    if (recommendations.length > 0) {
      console.log(`\n [性能建议] 系统优化建议:`);
      recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    } else {
      console.log(`\n[性能评估] 系统运行状态良好，无需优化`);
    }

    // 健康度评分
    const healthScore = this.calculateSystemHealthScore();
    console.log(`\n [健康评分] ML引擎健康度: ${healthScore.score}/100`);
    console.log(`   ├─ 评级: ${healthScore.grade} ${healthScore.emoji}`);
    console.log(`   ├─ 状态: ${healthScore.status}`);
    console.log(`   └─ 建议: ${healthScore.recommendation}`);

    console.log(`=======================================\n`);

    return {
      ...this.performanceStats,
      isInitialized: this.isInitialized,
      modelVersion: this.version,
      memoryUsage: this.model ? 'Active' : 'Inactive',
      cacheStatus: {
        analysisCache: this.analysisCache.size,
        trainingDataCache: this.trainingDataCache.size,
        dataLoaderCache: this.dataLoader.getCacheStatus()
      },
      recommendations: this.getPerformanceRecommendations(),
      healthScore: healthScore
    };
  }

  /**
   * 计算系统健康度评分
   */
  calculateSystemHealthScore() {
    let score = 0;
    let grade = 'F';
    let emoji = '❌';
    let status = '需要维护';
    let recommendation = '请检查系统配置';

    // 基础功能评分 (40分)
    if (this.isInitialized) score += 20;
    if (this.model) score += 20;

    // 性能指标评分 (30分)
    if (this.performanceStats.averageAnalysisTime < 100) score += 10;
    if (this.performanceStats.cacheHitRate > 0.3) score += 10;
    if (this.performanceStats.mlInferenceTime < 50) score += 10;

    // 缓存效率评分 (20分)
    const cacheUsage = this.analysisCache.size / this.cacheMaxSize;
    if (cacheUsage > 0.1 && cacheUsage < 0.8) score += 10;
    if (this.trainingDataCache.size > 0) score += 10;

    // 稳定性评分 (10分)
    if (this.performanceStats.totalAnalyses > 0) score += 5;
    if (typeof tf !== 'undefined') score += 5;

    // 评级计算
    if (score >= 90) {
      grade = 'A+';
      emoji = '🏆';
      status = '优秀';
      recommendation = '系统运行完美';
    } else if (score >= 80) {
      grade = 'A';
      emoji = '✅';
      status = '良好';
      recommendation = '系统运行稳定';
    } else if (score >= 70) {
      grade = 'B';
      emoji = '⚠️';
      status = '一般';
      recommendation = '建议优化缓存';
    } else if (score >= 60) {
      grade = 'C';
      emoji = '🔶';
      status = '勉强';
      recommendation = '需要性能调优';
    } else {
      grade = 'D';
      emoji = '❌';
      status = '需要维护';
      recommendation = '请检查系统配置';
    }

    return { score, grade, emoji, status, recommendation };
  }

  /**
   * 显示ML引擎启动横幅
   */
  displayStartupBanner() {
    console.log(`\n` +
      ` =======================================\n` +
      `  ███████╗ ███╗   ███╗ ██╗         \n` +
      `  ██╔════╝ ████╗ ████║ ██║         \n` +
      `  ███████╗ ██╔████╔██║ ██║         \n` +
      `  ╚════██║ ██║╚██╔╝██║ ██║         \n` +
      `  ███████║ ██║ ╚═╝ ██║ ███████╗    \n` +
      `  ╚══════╝ ╚═╝     ╚═╝ ╚══════╝    \n` +
      `                                    \n` +
      ` 智云梯 ML 异常检测分析器        \n` +
      ` 版本: ${this.version}           \n` +
      ` 混合架构: 规则引擎 + TensorFlow.js\n` +
      ` 支持: 实时异常检测 + 寿命预测    \n` +
      `=======================================\n`);
  }
}

export default ElevatorMLAnalyzer; 