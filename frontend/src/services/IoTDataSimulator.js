/**
 * 高质量IoT数据模拟器
 * 使用多种算法生成贴近真实物联网设备的传感器数据
 * 
 * 主要算法：
 * - ARMA时间序列建模
 * - Ornstein-Uhlenbeck随机过程
 * - 物理建模（热力学、机械、电气）
 * - 多元高斯噪声
 * - 状态机驱动的工况模拟
 */
class IoTDataSimulator {
  constructor(options = {}) {
    this.config = {
      samplingRate: options.samplingRate || 1000, // 采样率 1Hz
      noiseLevel: options.noiseLevel || 0.02, // 噪声水平 2%
      enablePhysicsModel: options.enablePhysicsModel !== false, // 启用物理建模
      enableCorrelation: options.enableCorrelation !== false // 启用参数关联
    };
    
    this.isRunning = false;
    this.timer = null;
    this.stepCount = 0;
    this.startTime = Date.now();
    
    // 设备运行状态
    this.deviceState = {
      status: 'IDLE', // IDLE, RUNNING, MAINTENANCE, EMERGENCY
      loadWeight: 0,
      speed: 0,
      floor: 1,
      tripCount: 0,
      operatingHours: 0
    };
    
    // 环境条件模拟
    this.environment = {
      ambientTemp: 25.0,
      humidity: 60.0,
      timeOfDay: this.getTimeOfDay(),
      seasonFactor: this.getSeasonFactor()
    };
    
    // 传感器配置与状态
    this.sensors = this.initializeSensors();
    
    // 时间序列生成器状态
    this.timeSeriesState = this.initializeTimeSeriesState();
    
    // 回调函数
    this.callbacks = [];
  }
  
  /**
   * 初始化传感器配置
   */
  initializeSensors() {
    return {
      // 曳引系统传感器
      traction: {
        motorTemperature: {
          value: 45.0,
          baseline: 45.0,
          range: [25, 85],
          criticalRange: [85, 120],
          // 物理参数
          thermalMass: 50.0, // 热质量
          thermalResistance: 0.1, // 热阻
          heatGeneration: 0, // 当前发热功率
          // 噪声参数
          armaCoeffs: { phi: [0.8, -0.2], theta: [0.3] }, // ARMA(2,1)系数
          ouAlpha: 0.95, // OU过程回归系数
          noiseSigma: 0.5,
          // 关联参数
          loadSensitivity: 0.8,
          speedSensitivity: 0.6,
          ambientSensitivity: 0.3
        },
        bearingTemperature: {
          value: 50.0,
          baseline: 50.0,
          range: [30, 90],
          criticalRange: [90, 120],
          thermalMass: 20.0,
          thermalResistance: 0.15,
          heatGeneration: 0,
          armaCoeffs: { phi: [0.85], theta: [0.2] },
          ouAlpha: 0.92,
          noiseSigma: 0.3,
          loadSensitivity: 0.6,
          speedSensitivity: 0.4,
          // 与电机温度的耦合系数
          motorTempCoupling: 0.7
        },
        vibrationSpeed: {
          value: 1.2,
          baseline: 1.2,
          range: [0.5, 2.8],
          criticalRange: [3.5, 6.0],
          // 振动特性参数
          resonantFreq: 15.0, // Hz
          dampingRatio: 0.05,
          // 频率成分
          frequencies: [5, 15, 30], // Hz
          amplitudes: [0.3, 1.0, 0.2],
          phases: [0, 0, 0],
          armaCoeffs: { phi: [0.7, -0.1], theta: [0.4, -0.1] },
          ouAlpha: 0.88,
          noiseSigma: 0.1,
          speedSensitivity: 1.2,
          loadSensitivity: 0.4
        },
        current: {
          value: 18.5,
          baseline: 18.5,
          range: [16, 21],
          criticalRange: [23, 30],
          // 电气参数
          resistance: 0.5, // 欧姆
          inductance: 0.1, // 亨利
          backEmf: 220, // 反电动势
          armaCoeffs: { phi: [0.6], theta: [0.5] },
          ouAlpha: 0.75,
          noiseSigma: 0.2,
          loadSensitivity: 1.5,
          voltageSensitivity: 0.8
        }
      },
      
      // 钢丝绳传感器
      steelRopes: {
        wear: {
          value: 2.0,
          baseline: 2.0,
          range: [0, 8],
          criticalRange: [10, 15],
          wearRate: 0.0001, // 每秒磨损率
          loadAcceleration: 1.2,
          armaCoeffs: { phi: [0.999], theta: [] }, // 几乎是积分过程
          noiseSigma: 0.02
        },
        brokenWires: {
          value: 0,
          baseline: 0,
          range: [0, 3],
          criticalRange: [5, 10],
          failureRate: 0.00001,
          wearDependency: 2.0,
          poissonLambda: 0.001
        }
      },
      
      // 制动器传感器
      brakes: {
        clearance: {
          value: 0.8,
          baseline: 0.8,
          range: [0.5, 1.0],
          criticalRange: [1.2, 2.0],
          armaCoeffs: { phi: [0.95], theta: [0.1] },
          ouAlpha: 0.98,
          noiseSigma: 0.02,
          wearSensitivity: 0.3
        },
        brakingTorque: {
          value: 320,
          baseline: 320,
          range: [300, 350],
          criticalRange: [250, 400],
          armaCoeffs: { phi: [0.9], theta: [0.2] },
          ouAlpha: 0.85,
          noiseSigma: 5.0,
          wearSensitivity: 0.4
        }
      },
      
      // 导向系统传感器
      guidance: {
        railDeviation: {
          value: 0.2,
          baseline: 0.2,
          range: [0, 0.4],
          criticalRange: [0.6, 1.2],
          armaCoeffs: { phi: [0.95], theta: [0.1] },
          ouAlpha: 0.98,
          noiseSigma: 0.02,
          wearSensitivity: 0.5
        },
        guideShoeWear: {
          value: 0.5,
          baseline: 0.5,
          range: [0, 1.5],
          criticalRange: [2.5, 4.0],
          wearRate: 0.00005,
          speedSensitivity: 0.8,
          armaCoeffs: { phi: [0.999], theta: [] },
          noiseSigma: 0.01
        }
      },
      
      // 电气系统传感器
      electrical: {
        voltageFluctuation: {
          value: 0,
          baseline: 0,
          range: [-5, 5],
          criticalRange: [-12, 12],
          // 电网波动模型
          gridFreq: 50, // Hz
          harmonics: [3, 5, 7], // 谐波次数
          harmonicAmps: [0.5, 0.3, 0.2],
          armaCoeffs: { phi: [0.4], theta: [0.8] },
          ouAlpha: 0.6,
          noiseSigma: 0.8,
          timeOfDayPattern: true
        },
        contactVoltageDrops: {
          value: 25,
          baseline: 25,
          range: [10, 45],
          criticalRange: [60, 100],
          contactResistance: 0.1,
          armaCoeffs: { phi: [0.9], theta: [0.2] },
          ouAlpha: 0.85,
          noiseSigma: 1.0,
          currentSensitivity: 0.8,
          agingSensitivity: 0.6
        }
      },
      
      // 门系统传感器
      door: {
        openCloseTime: {
          value: 2.5,
          baseline: 2.5,
          range: [2.0, 3.0],
          criticalRange: [4.0, 6.0],
          mechanicalInertia: 2.0,
          frictionCoeff: 0.1,
          armaCoeffs: { phi: [0.8], theta: [0.3] },
          ouAlpha: 0.9,
          noiseSigma: 0.05,
          wearSensitivity: 0.4
        },
        contactResistance: {
          value: 0.1,
          baseline: 0.1,
          range: [0.05, 0.3],
          criticalRange: [0.6, 1.2],
          oxidationRate: 0.00001,
          armaCoeffs: { phi: [0.95], theta: [0.1] },
          ouAlpha: 0.92,
          noiseSigma: 0.002,
          humiditySensitivity: 0.3
        }
      }
    };
  }
  
  /**
   * 初始化时间序列状态
   */
  initializeTimeSeriesState() {
    const state = {};
    
    // 为每个传感器初始化ARMA和OU过程状态
    Object.keys(this.sensors).forEach(systemKey => {
      state[systemKey] = {};
      Object.keys(this.sensors[systemKey]).forEach(sensorKey => {
        const sensor = this.sensors[systemKey][sensorKey];
        const armaCoeffs = sensor.armaCoeffs || { phi: [0.5], theta: [0.2] };
        
        state[systemKey][sensorKey] = {
          // ARMA过程历史值
          armaHistory: new Array(Math.max(armaCoeffs.phi ? armaCoeffs.phi.length : 1, 1)).fill(0),
          maHistory: new Array(Math.max(armaCoeffs.theta ? armaCoeffs.theta.length : 1, 1)).fill(0),
          // OU过程状态
          ouValue: 0,
          // 振动频率相位
          phaseAccumulator: sensor.phases ? [...sensor.phases] : []
        };
      });
    });
    
    return state;
  }
  
  /**
   * 获取当前时段
   */
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }
  
  /**
   * 获取季节因子
   */
  getSeasonFactor() {
    const month = new Date().getMonth();
    // 夏季(6-8月)温度偏高，冬季(12-2月)温度偏低
    if (month >= 5 && month <= 7) return 1.2; // 夏季
    if (month >= 11 || month <= 1) return 0.8; // 冬季
    return 1.0; // 春秋季
  }
  
  /**
   * Box-Muller变换生成高质量正态分布随机数
   */
  boxMuller(mu = 0, sigma = 1) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); // 避免log(0)
    while(v === 0) v = Math.random();
    
    const z0 = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z0 * sigma + mu;
  }
  
  /**
   * Ornstein-Uhlenbeck过程
   * 模拟有回归性的随机过程
   */
  ornsteinUhlenbeck(current, alpha, sigma, dt = 1.0) {
    const drift = -alpha * current * dt;
    const diffusion = sigma * Math.sqrt(dt) * this.boxMuller();
    return current + drift + diffusion;
  }
  
  /**
   * ARMA过程生成
   */
  generateARMA(sensor, state) {
    const armaCoeffs = sensor.armaCoeffs || { phi: [0.5], theta: [0.2] };
    const { phi, theta } = armaCoeffs;
    const { armaHistory, maHistory } = state;
    
    // 生成白噪声
    const noise = this.boxMuller(0, sensor.noiseSigma || 0.1);
    
    // AR部分
    let arValue = 0;
    if (phi && phi.length > 0) {
      for (let i = 0; i < phi.length; i++) {
        arValue += phi[i] * (armaHistory[i] || 0);
      }
    }
    
    // MA部分
    let maValue = 0;
    if (theta && theta.length > 0) {
      for (let i = 0; i < theta.length; i++) {
        maValue += theta[i] * (maHistory[i] || 0);
      }
    }
    
    const newValue = arValue + maValue + noise;
    
    // 更新历史
    if (armaHistory.length > 0) {
      armaHistory.unshift(newValue);
      armaHistory.pop();
    }
    if (maHistory.length > 0) {
      maHistory.unshift(noise);
      maHistory.pop();
    }
    
    return newValue;
  }
  
  /**
   * 振动传感器特殊处理 - 多频率成分叠加
   */
  generateVibration(sensor, state) {
    const frequencies = sensor.frequencies || [15];
    const amplitudes = sensor.amplitudes || [0.5];
    const phaseAccumulator = state.phaseAccumulator || [0];
    const dt = 1.0 / this.config.samplingRate;
    
    let vibration = 0;
    for (let i = 0; i < frequencies.length && i < amplitudes.length; i++) {
      if (!phaseAccumulator[i]) phaseAccumulator[i] = 0;
      phaseAccumulator[i] += 2 * Math.PI * frequencies[i] * dt;
      vibration += amplitudes[i] * Math.sin(phaseAccumulator[i]);
    }
    
    // 添加负载和速度影响
    const loadSensitivity = sensor.loadSensitivity || 0.4;
    const speedSensitivity = sensor.speedSensitivity || 1.2;
    const loadFactor = 1 + loadSensitivity * (this.deviceState.loadWeight / 1000);
    const speedFactor = 1 + speedSensitivity * (this.deviceState.speed / 2);
    
    // 添加ARMA噪声
    const armaNoise = this.generateARMA(sensor, state);
    
    return (sensor.baseline || 1.2) * loadFactor * speedFactor + vibration + armaNoise;
  }
  
  /**
   * 温度传感器物理建模
   */
  generateTemperature(sensor, state, heatSource = 0) {
    const dt = 1.0;
    
    // 热力学方程: C*dT/dt = P - (T-Tamb)/R
    const thermalCapacitance = sensor.thermalMass || 50.0;
    const thermalResistance = sensor.thermalResistance || 0.1;
    const ambientTemp = this.environment.ambientTemp * this.environment.seasonFactor;
    
    // 计算发热功率（基于负载和速度）
    const basePower = 100; // 基础功率 W
    const loadPower = (this.deviceState.loadWeight / 1000) * 50;
    const speedPower = Math.pow(this.deviceState.speed, 2) * 20;
    const totalPower = basePower + loadPower + speedPower + heatSource;
    
    // 热力学微分方程数值解
    const tempDiff = sensor.value - ambientTemp;
    const heatFlow = tempDiff / thermalResistance;
    const dTdt = (totalPower - heatFlow) / thermalCapacitance;
    
    // 更新温度
    let newTemp = sensor.value + dTdt * dt;
    
    // 添加环境影响
    const ambientSensitivity = sensor.ambientSensitivity || 0.3;
    newTemp += ambientSensitivity * (ambientTemp - 25);
    
    // 添加随机扰动
    const ouAlpha = sensor.ouAlpha || 0.95;
    const noiseSigma = sensor.noiseSigma || 0.5;
    const ouNoise = this.ornsteinUhlenbeck(state.ouValue, 1 - ouAlpha, noiseSigma);
    state.ouValue = ouNoise;
    newTemp += ouNoise;
    
    return Math.max(newTemp, ambientTemp); // 温度不能低于环境温度
  }
  
  /**
   * 电流传感器建模
   */
  generateCurrent(sensor, state) {
    // 基于负载的理论电流
    const nominalVoltage = 380; // V
    const efficiency = 0.9;
    const powerFactor = 0.85;
    
    const mechanicalPower = (this.deviceState.loadWeight / 1000) * 9.8 * (this.deviceState.speed || 0.1);
    const electricalPower = mechanicalPower / efficiency;
    const theoreticalCurrent = electricalPower / (Math.sqrt(3) * nominalVoltage * powerFactor);
    
    // 添加基础电流
    const baseCurrent = sensor.baseline || 18.5;
    const totalCurrent = baseCurrent + theoreticalCurrent;
    
    // 添加电压波动影响
    const voltageFluctuation = this.sensors.electrical && this.sensors.electrical.voltageFluctuation 
      ? this.sensors.electrical.voltageFluctuation.value : 0;
    const voltageSensitivity = sensor.voltageSensitivity || 0.8;
    const voltageEffect = -voltageSensitivity * (voltageFluctuation / 100);
    
    // 添加ARMA噪声
    const armaNoise = this.generateARMA(sensor, state);
    
    return totalCurrent * (1 + voltageEffect) + armaNoise;
  }
  
  /**
   * 磨损类传感器积分建模
   */
  generateWear(sensor, state) {
    const dt = 1.0;
    
    // 基础磨损率
    let wearRate = sensor.wearRate || 0.0001;
    
    // 负载加速磨损
    if (sensor.loadAcceleration) {
      const loadFactor = Math.pow(this.deviceState.loadWeight / 500, sensor.loadAcceleration);
      wearRate *= loadFactor;
    }
    
    // 速度影响磨损
    if (sensor.speedSensitivity) {
      const speedFactor = 1 + sensor.speedSensitivity * (this.deviceState.speed / 2);
      wearRate *= speedFactor;
    }
    
    // 积分更新
    const wearIncrement = wearRate * dt;
    const newWear = sensor.value + wearIncrement;
    
    // 添加微小随机扰动
    const noiseSigma = sensor.noiseSigma || 0.01;
    const noise = this.boxMuller(0, noiseSigma);
    
    return Math.max(0, newWear + noise);
  }
  
  /**
   * 电压波动建模（含时段模式）
   */
  generateVoltageFluctuation(sensor, state) {
    // 时段模式
    let timePattern = 1.0;
    if (sensor.timeOfDayPattern) {
      const hour = new Date().getHours();
      // 高峰时段电压波动更大
      if ((hour >= 8 && hour <= 10) || (hour >= 18 && hour <= 20)) {
        timePattern = 2.0; // 高峰时段
      } else if (hour >= 23 || hour <= 6) {
        timePattern = 0.5; // 夜间低谷
      } else {
        timePattern = 1.0; // 平常时段
      }
    }
    
    // 电网谐波模拟
    const t = this.stepCount / this.config.samplingRate;
    let harmonicSum = 0;
    const harmonics = sensor.harmonics || [3, 5, 7];
    const harmonicAmps = sensor.harmonicAmps || [0.5, 0.3, 0.2];
    const gridFreq = sensor.gridFreq || 50;
    
    for (let i = 0; i < harmonics.length && i < harmonicAmps.length; i++) {
      const freq = gridFreq * harmonics[i];
      harmonicSum += harmonicAmps[i] * Math.sin(2 * Math.PI * freq * t);
    }
    
    // ARMA过程
    const armaNoise = this.generateARMA(sensor, state);
    
    return timePattern * (harmonicSum + armaNoise);
  }
  
  /**
   * 更新单个传感器数值
   */
  updateSensor(systemKey, sensorKey) {
    const sensor = this.sensors[systemKey][sensorKey];
    const state = this.timeSeriesState[systemKey][sensorKey];
    
    let newValue;
    
    // 根据传感器类型选择相应的建模方法
    switch (sensorKey) {
      case 'motorTemperature':
        newValue = this.generateTemperature(sensor, state);
        break;
        
      case 'bearingTemperature':
        // 轴承温度与电机温度耦合
        const motorTemp = this.sensors.traction && this.sensors.traction.motorTemperature 
          ? this.sensors.traction.motorTemperature.value : 45;
        const motorTempCoupling = sensor.motorTempCoupling || 0.7;
        const coupling = motorTempCoupling * (motorTemp - 25);
        newValue = this.generateTemperature(sensor, state, coupling);
        break;
        
      case 'vibrationSpeed':
        newValue = this.generateVibration(sensor, state);
        break;
        
      case 'current':
        newValue = this.generateCurrent(sensor, state);
        break;
        
      case 'wear':
      case 'guideShoeWear':
        newValue = this.generateWear(sensor, state);
        break;
        
      case 'brokenWires':
        // 断丝数使用泊松过程模拟
        const currentWear = this.sensors.steelRopes.wear.value;
        const baseRate = sensor.failureRate || 0.00001;
        const wearDependency = sensor.wearDependency || 2.0;
        const enhancedRate = baseRate * Math.pow(currentWear / 5, wearDependency);
        
        // 泊松过程：如果随机数小于增强概率，则增加断丝数
        if (Math.random() < enhancedRate) {
          newValue = Math.min(sensor.value + 1, 10); // 最大10根断丝
        } else {
          newValue = sensor.value;
        }
        
        // 添加微小随机扰动
        const noise = this.boxMuller(0, 0.01);
        newValue = Math.max(0, newValue + noise);
        break;
        
      case 'voltageFluctuation':
        newValue = this.generateVoltageFluctuation(sensor, state);
        break;
        
      default:
        // 通用传感器建模
        const armaNoise = this.generateARMA(sensor, state);
        const ouAlpha = sensor.ouAlpha || 0.9;
        const noiseSigma = sensor.noiseSigma || 0.1;
        const ouNoise = this.ornsteinUhlenbeck(state.ouValue, 1 - ouAlpha, noiseSigma);
        state.ouValue = ouNoise;
        const baseline = sensor.baseline || 0;
        newValue = baseline + armaNoise + ouNoise;
    }
    
    // 应用传感器范围限制
    if (sensor.range) {
      newValue = Math.max(sensor.range[0], Math.min(sensor.range[1], newValue));
    }
    
    // 更新传感器值
    sensor.value = newValue;
    
    return newValue;
  }
  
  /**
   * 更新设备状态（模拟电梯运行）
   */
  updateDeviceState() {
    // 简单的电梯运行模拟
    const hour = new Date().getHours();
    
    // 根据时段调整负载
    if (hour >= 7 && hour <= 9) { // 早高峰
      this.deviceState.loadWeight = 600 + Math.random() * 400;
    } else if (hour >= 17 && hour <= 19) { // 晚高峰
      this.deviceState.loadWeight = 500 + Math.random() * 400;
    } else if (hour >= 22 || hour <= 6) { // 夜间
      this.deviceState.loadWeight = 0 + Math.random() * 200;
    } else { // 其他时段
      this.deviceState.loadWeight = 200 + Math.random() * 400;
    }
    
    // 速度模拟
    if (this.deviceState.loadWeight > 100) {
      this.deviceState.speed = 1.0 + Math.random() * 0.75;
      this.deviceState.status = 'RUNNING';
    } else {
      this.deviceState.speed = 0;
      this.deviceState.status = 'IDLE';
    }
    
    // 更新运行时间
    if (this.deviceState.status === 'RUNNING') {
      this.deviceState.operatingHours += 1.0 / 3600; // 秒转小时
      this.deviceState.tripCount += Math.random() < 0.1 ? 1 : 0; // 10%概率完成一次行程
    }
  }
  
  /**
   * 更新环境条件
   */
  updateEnvironment() {
    // 环境温度日变化
    const hour = new Date().getHours();
    const dailyVariation = 5 * Math.sin(2 * Math.PI * (hour - 6) / 24);
    this.environment.ambientTemp = 25 + dailyVariation + this.boxMuller(0, 0.5);
    
    // 湿度变化
    this.environment.humidity = 60 + 10 * Math.sin(2 * Math.PI * hour / 24) + this.boxMuller(0, 2);
    this.environment.humidity = Math.max(30, Math.min(90, this.environment.humidity));
    
    // 更新时段
    this.environment.timeOfDay = this.getTimeOfDay();
  }
  
  /**
   * 主更新循环
   */
  update() {
    if (!this.isRunning) return;
    
    this.stepCount++;
    
    // 更新环境和设备状态
    this.updateEnvironment();
    this.updateDeviceState();
    
    // 更新所有传感器
    const updatedData = {};
    Object.keys(this.sensors).forEach(systemKey => {
      updatedData[systemKey] = {};
      Object.keys(this.sensors[systemKey]).forEach(sensorKey => {
        updatedData[systemKey][sensorKey] = this.updateSensor(systemKey, sensorKey);
      });
    });
    
    // 添加设备状态信息
    updatedData.deviceState = { ...this.deviceState };
    updatedData.environment = { ...this.environment };
    updatedData.timestamp = Date.now();
    
    // 调用回调函数
    this.callbacks.forEach(callback => {
      try {
        callback(updatedData);
      } catch (error) {
        console.error('IoT模拟器回调函数执行失败:', error);
      }
    });
  }
  
  /**
   * 启动模拟器
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startTime = Date.now();
    this.stepCount = 0;
    
    this.timer = setInterval(() => {
      this.update();
    }, this.config.samplingRate);
    
    console.log('IoT数据模拟器已启动');
  }
  
  /**
   * 停止模拟器
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    console.log('IoT数据模拟器已停止');
  }
  
  /**
   * 注册数据更新回调
   */
  onUpdate(callback) {
    if (typeof callback === 'function') {
      this.callbacks.push(callback);
    }
  }
  
  /**
   * 获取当前传感器数据（格式化为系统页面所需格式）
   */
  getFormattedData(systemType) {
    const data = {};
    
    switch (systemType) {
      case 'traction':
        data.parameters = {
          tractionMachine: {
            motorTemperature: { 
              value: Number(this.sensors.traction.motorTemperature.value.toFixed(1)), 
              unit: '°C', 
              normal: '≤80°C', 
              critical: '>95°C' 
            },
            bearingTemperature: { 
              value: Number(this.sensors.traction.bearingTemperature.value.toFixed(1)), 
              unit: '°C', 
              normal: '≤95°C', 
              critical: '>95°C' 
            },
            vibrationSpeed: { 
              value: Number(this.sensors.traction.vibrationSpeed.value.toFixed(1)), 
              unit: 'mm/s', 
              normal: '≤2.8 mm/s', 
              critical: '>4.5 mm/s' 
            },
            current: { 
              value: Number(this.sensors.traction.current.value.toFixed(1)), 
              unit: 'A', 
              normal: '额定值±10%', 
              critical: '>15%波动' 
            }
          },
                  steelRopes: {
          wear: { 
            value: Number(this.sensors.steelRopes.wear.value.toFixed(1)), 
            unit: '%', 
            normal: '≤10%', 
            critical: '>10%' 
          },
          brokenWires: { 
            value: Math.round(this.sensors.steelRopes.brokenWires.value), 
            unit: '根/股', 
            normal: '≤5根/股', 
            critical: '>8根/股' 
          }
        },
        brakes: {
          clearance: { 
            value: Number(this.sensors.brakes.clearance.value.toFixed(2)), 
            unit: 'mm', 
            normal: '0.5-1.0 mm', 
            critical: '>1.5 mm' 
          },
          brakingTorque: { 
            value: Math.round(this.sensors.brakes.brakingTorque.value), 
            unit: 'N·m', 
            normal: '≥1.5倍额定载荷', 
            critical: '<1.5倍额定载荷' 
          }
        }
        };
        
        // 参数列表格式
        data.parametersList = [
          { name: '电机温度', value: data.parameters.tractionMachine.motorTemperature.value, unit: '°C', normal: '≤80°C', critical: '>95°C', group: '曳引机' },
          { name: '轴承温度', value: data.parameters.tractionMachine.bearingTemperature.value, unit: '°C', normal: '≤95°C', critical: '>95°C', group: '曳引机' },
          { name: '振动速度', value: data.parameters.tractionMachine.vibrationSpeed.value, unit: 'mm/s', normal: '≤2.8 mm/s', critical: '>4.5 mm/s', group: '曳引机' },
          { name: '电流', value: data.parameters.tractionMachine.current.value, unit: 'A', normal: '额定值±10%', critical: '>15%波动', group: '曳引机' },
          { name: '钢丝绳磨损', value: data.parameters.steelRopes.wear.value, unit: '%', normal: '≤10%', critical: '>10%', group: '曳引钢丝绳' },
          { name: '断丝数', value: data.parameters.steelRopes.brokenWires.value, unit: '根/股', normal: '≤5根/股', critical: '>8根/股', group: '曳引钢丝绳' },
          { name: '制动间隙', value: data.parameters.brakes.clearance.value, unit: 'mm', normal: '0.5-1.0 mm', critical: '>1.5 mm', group: '制动器' },
          { name: '制动力矩', value: data.parameters.brakes.brakingTorque.value, unit: 'N·m', normal: '≥1.5倍额定载荷', critical: '<1.5倍额定载荷', group: '制动器' }
        ];
        break;
        
      case 'guidance':
        data.parameters = {
          rail: {
            verticalDeviation: { 
              value: Number(this.sensors.guidance.railDeviation.value.toFixed(2)), 
              unit: 'mm', 
              normal: '≤0.5 mm', 
              critical: '>1.0 mm' 
            }
          },
          guideShoe: {
            wear: { 
              value: Number(this.sensors.guidance.guideShoeWear.value.toFixed(1)), 
              unit: 'mm', 
              normal: '≤2 mm', 
              critical: '>3 mm' 
            }
          }
        };
        break;
        
      case 'electrical':
        data.parameters = {
          voltage: {
            fluctuation: { 
              value: Number(this.sensors.electrical.voltageFluctuation.value.toFixed(1)), 
              unit: '%', 
              normal: '≤10%', 
              critical: '>15%' 
            }
          },
          contact: {
            voltageDrops: { 
              value: Number(this.sensors.electrical.contactVoltageDrops.value.toFixed(0)), 
              unit: 'mV', 
              normal: '≤50 mV', 
              critical: '>100 mV' 
            }
          }
        };
        break;
        
      case 'door':
        data.parameters = {
          doorMachine: {
            openCloseTime: { 
              value: Number(this.sensors.door.openCloseTime.value.toFixed(1)), 
              unit: '秒', 
              normal: '2-3秒', 
              critical: '>5秒' 
            }
          },
          doorLock: {
            contactResistance: { 
              value: Number(this.sensors.door.contactResistance.value.toFixed(2)), 
              unit: 'Ω', 
              normal: '≤0.5 Ω', 
              critical: '>1.0 Ω' 
            }
          }
        };
        break;
    }
    
    return data;
  }
  
  /**
   * 重置传感器到初始状态
   */
  reset() {
    this.stepCount = 0;
    this.startTime = Date.now();
    
    // 重置所有传感器值为基准值
    Object.keys(this.sensors).forEach(systemKey => {
      Object.keys(this.sensors[systemKey]).forEach(sensorKey => {
        this.sensors[systemKey][sensorKey].value = this.sensors[systemKey][sensorKey].baseline;
      });
    });
    
    // 重置时间序列状态
    this.timeSeriesState = this.initializeTimeSeriesState();
    
    console.log('IoT模拟器已重置');
  }
}

export default IoTDataSimulator; 