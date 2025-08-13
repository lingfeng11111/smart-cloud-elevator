/**
 * CSV数据加载器 - 用于加载真实的电梯数据集
 * 优化性能，支持增量加载和缓存
 */
class CSVDataLoader {
  constructor() {
    this.cache = new Map();
    this.loadingPromises = new Map();
    this.sampleCache = new Map();
    this.batchSize = 100; // 批量处理大小
    
    // Web Worker支持
    this.worker = null;
    this.workerPromises = new Map();
    this.initWorker();
    
    // 系统文件映射
    this.systemFiles = {
      'door': '/data/elevator_door_filtered.csv',
      'traction': '/data/elevator_traction_filtered.csv',
      'electrical': '/data/elevator_electrical_filtered.csv',
      'guidance': '/data/elevator_guidance_filtered.csv'
    };

    // 参数映射 - 将前端参数名映射到数据集中的参数名
    this.parameterMapping = {
      'motorTemperature': 'motorTemperature',
      'bearingTemperature': 'bearingTemperature',
      'vibrationSpeed': 'vibrationSpeed',
      'current': 'current',
      'steelRopeWear': 'steelRopeWear',
      'brokenWires': 'brokenWires',
      'brakeClearance': 'brakeClearance',
      'brakingTorque': 'brakingTorque',
      'railDeviation': 'railDeviation',
      'guideShoeWear': 'guideShoeWear',
      'railJointGap': 'railJointGap',
      'voltageFluctuation': 'voltageFluctuation',
      'contactVoltageDrops': 'contactVoltageDrops',
      'controlResponseTime': 'controlResponseTime',
      'currentLoad': 'current',
      'openCloseTime': 'openCloseTime',
      'contactResistance': 'contactResistance',
      'doorCurrent': 'doorCurrent',
      'mechanicalDepth': 'mechanicalDepth'
    };
  }

  /**
   * 初始化Web Worker
   */
  initWorker() {
    // 暂时禁用Worker，避免路径问题
    console.log('📋 使用主线程处理CSV数据（Worker已禁用）');
    this.worker = null;
    return;
    
    // 原Worker初始化代码（暂时注释）
    /*
    try {
      if (typeof Worker !== 'undefined') {
        this.worker = new Worker('/workers/csvDataWorker.js');
        this.worker.onmessage = this.handleWorkerMessage.bind(this);
        this.worker.onerror = (error) => {
          console.error('CSV Worker错误:', error);
          this.worker = null;
        };
        console.log('✅ CSV数据处理Worker已初始化');
      } else {
        console.warn('⚠️ Web Worker不支持，使用主线程处理');
      }
    } catch (error) {
      console.warn('⚠️ Worker初始化失败，使用主线程处理:', error);
      this.worker = null;
    }
    */
  }

  /**
   * 处理Worker消息
   */
  handleWorkerMessage(event) {
    const { type, id, result, error, progress } = event.data;
    
    if (type === 'WORKER_READY') {
      console.log('📋 CSV数据处理Worker就绪');
      return;
    }
    
    const promise = this.workerPromises.get(id);
    if (!promise) return;
    
    switch (type) {
      case 'PARSE_CSV_COMPLETE':
      case 'FILTER_DATA_COMPLETE':
      case 'ANALYZE_SAMPLES_COMPLETE':
      case 'GET_ANOMALY_CASES_COMPLETE':
        promise.resolve(result);
        this.workerPromises.delete(id);
        break;
      case 'ERROR':
        promise.reject(new Error(error));
        this.workerPromises.delete(id);
        break;
      case 'PARSE_PROGRESS':
        if (promise.onProgress) {
          promise.onProgress(progress);
        }
        break;
    }
  }

  /**
   * 向Worker发送任务
   */
  sendWorkerTask(type, data, onProgress = null) {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker不可用'));
        return;
      }
      
      const id = `${type}_${Date.now()}_${Math.random()}`;
      this.workerPromises.set(id, { resolve, reject, onProgress });
      
      this.worker.postMessage({ type, data, id });
    });
  }

  /**
   * 获取系统对应的数据集
   */
  getSystemFile(systemType) {
    const systemMap = {
      '曳引系统': 'traction',
      '导向系统': 'guidance',
      '电气控制系统': 'electrical',
      '门系统': 'door'
    };
    return this.systemFiles[systemMap[systemType]] || this.systemFiles['traction'];
  }

  /**
   * 异步加载CSV数据（带缓存）
   */
  async loadCSVData(systemType, useCache = true) {
    const fileName = this.getSystemFile(systemType);
    const cacheKey = `${systemType}_${fileName}`;

    // 检查缓存
    if (useCache && this.cache.has(cacheKey)) {
      console.log(`✅ 从缓存加载 ${systemType} 数据`);
      return this.cache.get(cacheKey);
    }

    // 检查是否正在加载
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    // 创建加载Promise
    const loadingPromise = this._loadCSVFile(fileName, systemType);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const data = await loadingPromise;
      
      // 缓存数据
      if (useCache) {
        this.cache.set(cacheKey, data);
      }
      
      console.log(`📊 ${systemType} 数据加载完成，共 ${data.length} 条记录`);
      return data;
    } catch (error) {
      console.error(`❌ 加载 ${systemType} 数据失败:`, error);
      throw error;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  /**
   * 实际加载CSV文件
   */
  async _loadCSVFile(fileName, systemType) {
    try {
      const response = await fetch(fileName);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();
      return await this._parseCSV(csvText, systemType);
    } catch (error) {
      console.warn(`无法加载 ${fileName}，使用模拟数据`);
      return await this._generateFallbackData(systemType);
    }
  }

  /**
   * 解析CSV文本（优化版 - 使用Worker）
   */
  async _parseCSV(csvText, systemType) {
    // 尝试使用Worker进行后台处理
    if (this.worker) {
      try {
        console.log('🔄 使用Worker解析CSV数据...');
        const data = await this.sendWorkerTask('PARSE_CSV', {
          csvText,
          systemType,
          batchSize: this.batchSize
        }, (progress) => {
          console.log(`📊 解析进度: ${progress.percentage}% (${progress.processed}/${progress.total})`);
        });
        
        console.log(`✅ Worker解析完成，共 ${data.length} 条记录`);
        return data;
      } catch (error) {
        console.warn('Worker解析失败，降级到主线程:', error);
      }
    }

    // 降级到主线程处理
    return this._parseCSVMainThread(csvText, systemType);
  }

  /**
   * 主线程CSV解析（降级方案）
   */
  _parseCSVMainThread(csvText, systemType) {
    const lines = csvText.split('\n');
    if (lines.length < 2) {
      throw new Error('CSV文件格式错误');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    // 批量处理以避免阻塞UI
    const batchProcess = (startIndex) => {
      return new Promise((resolve) => {
        const endIndex = Math.min(startIndex + this.batchSize, lines.length);
        
        for (let i = startIndex; i < endIndex; i++) {
          if (lines[i].trim()) {
            try {
              const values = this._parseCSVLine(lines[i]);
              if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                  row[header] = values[index];
                });
                
                // 只保留有效的数据行
                if (row.parameter_name && row.parameter_value && !isNaN(parseFloat(row.parameter_value))) {
                  data.push(this._normalizeDataRow(row));
                }
              }
            } catch (error) {
              // 跳过解析错误的行
              continue;
            }
          }
        }
        
        if (endIndex < lines.length) {
          setTimeout(() => resolve(batchProcess(endIndex)), 0);
        } else {
          resolve(data);
        }
      });
    };

    return batchProcess(1); // 跳过表头
  }

  /**
   * 解析CSV行（处理引号和转义字符）
   */
  _parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * 标准化数据行
   */
  _normalizeDataRow(row) {
    return {
      timestamp: row.timestamp,
      systemName: row.system_name,
      componentName: row.component_name,
      parameterName: row.parameter_name,
      unit: row.unit,
      value: parseFloat(row.parameter_value),
      anomalyScore: parseFloat(row.anomaly_score) || 0,
      severityLevel: row.severity_level,
      loadWeight: parseFloat(row.load_weight) || 0,
      speed: parseFloat(row.speed) || 0,
      operatingHours: parseFloat(row.operating_hours) || 0,
      ambientTemp: parseFloat(row.ambient_temp) || 25,
      humidity: parseFloat(row.humidity) || 50,
      maintenanceDaysSince: parseInt(row.maintenance_days_since) || 0,
      usageIntensity: row.usage_intensity,
      deviationFromBaseline: parseFloat(row.deviation_from_baseline) || 0,
      deviationPercentage: parseFloat(row.deviation_percentage) || 0,
      compositeRiskScore: parseFloat(row.composite_risk_score) || 0
    };
  }

  /**
   * 生成降级数据（当无法加载CSV时）
   */
  async _generateFallbackData(systemType) {
    console.log(`🔧 为 ${systemType} 生成降级数据`);
    
    const fallbackData = [];
    const parameters = this._getSystemParameters(systemType);
    
    for (let i = 0; i < 50; i++) {
      const param = parameters[Math.floor(Math.random() * parameters.length)];
      fallbackData.push({
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        systemName: systemType,
        componentName: param.component,
        parameterName: param.name,
        unit: param.unit,
        value: this._generateRandomValue(param.range),
        anomalyScore: Math.random(),
        severityLevel: Math.random() > 0.7 ? 'warning' : 'normal',
        loadWeight: 200 + Math.random() * 600,
        speed: 0.5 + Math.random() * 1.5,
        operatingHours: Math.random() * 10000,
        ambientTemp: 20 + Math.random() * 20,
        humidity: 40 + Math.random() * 40,
        maintenanceDaysSince: Math.floor(Math.random() * 90),
        usageIntensity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        deviationFromBaseline: -5 + Math.random() * 10,
        deviationPercentage: -20 + Math.random() * 40,
        compositeRiskScore: Math.random()
      });
    }
    
    return fallbackData;
  }

  /**
   * 获取系统参数定义
   */
  _getSystemParameters(systemType) {
    const systemParams = {
      '曳引系统': [
        { name: 'motorTemperature', component: '曳引机', unit: '°C', range: [25, 120] },
        { name: 'bearingTemperature', component: '曳引机', unit: '°C', range: [30, 120] },
        { name: 'vibrationSpeed', component: '曳引机', unit: 'mm/s', range: [0.5, 6] },
        { name: 'current', component: '曳引机', unit: 'A', range: [16, 30] },
        { name: 'steelRopeWear', component: '钢丝绳', unit: '%', range: [0, 15] }
      ],
      '导向系统': [
        { name: 'railDeviation', component: '导轨', unit: 'mm', range: [0, 1.2] },
        { name: 'guideShoeWear', component: '导靴', unit: 'mm', range: [0, 4] },
        { name: 'railJointGap', component: '导轨', unit: 'mm', range: [0, 2] }
      ],
      '电气控制系统': [
        { name: 'voltageFluctuation', component: '电源', unit: '%', range: [-25, 25] },
        { name: 'contactVoltageDrops', component: '电源', unit: 'mV', range: [10, 150] },
        { name: 'controlResponseTime', component: '控制器', unit: 's', range: [0.1, 2] }
      ],
      '门系统': [
        { name: 'openCloseTime', component: '门机', unit: 's', range: [2, 8] },
        { name: 'contactResistance', component: '门锁装置', unit: 'Ω', range: [0.05, 1.5] },
        { name: 'doorCurrent', component: '门机', unit: 'A', range: [4.5, 8] },
        { name: 'mechanicalDepth', component: '门锁装置', unit: 'mm', range: [0, 12] }
      ]
    };
    
    return systemParams[systemType] || systemParams['曳引系统'];
  }

  /**
   * 生成随机值
   */
  _generateRandomValue(range) {
    return range[0] + Math.random() * (range[1] - range[0]);
  }

  /**
   * 获取参数的历史数据样本
   */
  async getParameterSamples(systemType, parameterName, sampleSize = 20) {
    const cacheKey = `${systemType}_${parameterName}_samples`;
    
    if (this.sampleCache.has(cacheKey)) {
      return this.sampleCache.get(cacheKey);
    }

    try {
      const data = await this.loadCSVData(systemType);
      const mappedParamName = this.parameterMapping[parameterName] || parameterName;
      
      const samples = data
        .filter(row => row.parameterName === mappedParamName)
        .sort(() => Math.random() - 0.5) // 随机排序
        .slice(0, sampleSize)
        .map(row => ({
          value: row.value,
          anomalyScore: row.anomalyScore,
          severity: row.severityLevel,
          timestamp: row.timestamp,
          context: {
            loadWeight: row.loadWeight,
            speed: row.speed,
            operatingHours: row.operatingHours,
            ambientTemp: row.ambientTemp,
            maintenanceDaysSince: row.maintenanceDaysSince
          }
        }));

      this.sampleCache.set(cacheKey, samples);
      return samples;
    } catch (error) {
      console.error('获取参数样本失败:', error);
      return [];
    }
  }

  /**
   * 获取异常案例（优化版 - 使用Worker）
   */
  async getAnomalyCases(systemType, limit = 10) {
    try {
      const data = await this.loadCSVData(systemType);
      
      // 尝试使用Worker处理
      if (this.worker && data.length > 1000) {
        try {
          console.log('🔄 使用Worker获取异常案例...');
          return await this.sendWorkerTask('GET_ANOMALY_CASES', {
            dataset: data,
            limit
          });
        } catch (error) {
          console.warn('Worker处理失败，使用主线程:', error);
        }
      }
      
      // 主线程处理
      return data
        .filter(row => row.severityLevel === 'warning' || row.severityLevel === 'critical')
        .sort((a, b) => b.anomalyScore - a.anomalyScore)
        .slice(0, limit)
        .map(row => ({
          parameterName: row.parameterName,
          value: row.value,
          anomalyScore: row.anomalyScore,
          severity: row.severityLevel,
          deviation: row.deviationFromBaseline,
          deviationPercentage: row.deviationPercentage,
          timestamp: row.timestamp,
          context: {
            componentName: row.componentName,
            loadWeight: row.loadWeight,
            operatingHours: row.operatingHours,
            maintenanceDaysSince: row.maintenanceDaysSince,
            ambientTemp: row.ambientTemp,
            usageIntensity: row.usageIntensity
          }
        }));
    } catch (error) {
      console.error('获取异常案例失败:', error);
      return [];
    }
  }

  /**
   * 清理缓存和资源
   */
  clearCache() {
    this.cache.clear();
    this.sampleCache.clear();
    this.loadingPromises.clear();
    
    // 清理Worker相关资源
    if (this.worker) {
      // 清理未完成的Promise
      for (const [id, promise] of this.workerPromises.entries()) {
        promise.reject(new Error('数据加载器被清理'));
      }
      this.workerPromises.clear();
    }
    
    console.log('🧹 CSV数据缓存和资源已清理');
  }

  /**
   * 销毁资源
   */
  dispose() {
    this.clearCache();
    
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      console.log('🔥 CSV数据处理Worker已终止');
    }
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus() {
    return {
      dataCache: this.cache.size,
      sampleCache: this.sampleCache.size,
      loadingPromises: this.loadingPromises.size,
      totalMemoryEstimate: `${(this.cache.size + this.sampleCache.size) * 50}KB`
    };
  }
}

export default CSVDataLoader;