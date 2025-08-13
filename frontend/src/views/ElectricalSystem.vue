<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import ParameterChart from '../components/ParameterChart.vue';
import SystemDashboard from '../components/SystemDashboard.vue';
import * as echarts from 'echarts/core';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { GaugeChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent } from 'echarts/components';
import TechGridBackground from '../components/TechGridBackground.vue';
import IoTDataSimulator from '../services/IoTDataSimulator.js';
import ElectricalModelViewer from '../components/ElectricalModelViewer.vue';

// 注册必需的组件
use([CanvasRenderer, GaugeChart, GridComponent, TooltipComponent, TitleComponent]);

const systemId = 'sys-002';

// 系统详细数据
const systemData = ref(null);
// 定时器引用
let dataUpdateInterval = null;
// 存储所有仪表盘图表实例
const gaugeCharts = ref([]);
// IoT数据模拟器实例
let iotSimulator = null;

// 为不同的参数组分配不同的图表类型
const getChartTypeForGroup = (group) => {
  // 电气系统特定的图表类型
  const systemSpecificCharts = {
    '控制柜': 'gauge',
    '电机': 'bar',
    '电源': 'radar'
  };
  
  // 如果有特定配置，使用它，否则使用默认的bar类型
  return systemSpecificCharts[group] || 'bar';
};

// 获取系统数据
const fetchSystemData = () => {
  // 电气系统数据
  systemData.value = {
    name: '电气系统',
    icon: '⚡',
    description: '负责电梯的供电、控制和电机驱动，是电梯的神经中枢。',
    model: '型号：XZD-1500',
    manufacturer: '制造商：西子电梯',
    installDate: '安装日期：2023-01-15',
    maintenanceCycle: '维护周期：2个月',
    parameters: {
      // 控制柜
      cabinetTemperature: { name: '控制柜温度', value: 55.5, unit: '°C', min: 0, max: 100, normal: 70, warning: 65, critical: 85, group: '控制柜' },
      cabinetHumidity: { name: '控制柜湿度', value: 45.2, unit: '%', min: 0, max: 100, normal: 60, warning: 60, critical: 75, group: '控制柜' },
      mainboardTemperature: { name: '主板温度', value: 48.8, unit: '°C', min: 0, max: 100, normal: 60, warning: 60, critical: 75, group: '控制柜' },
      controllerVoltage: { name: '控制器电压', value: 223.5, unit: 'V', min: 180, max: 260, normal: 220, warning: 235, critical: 245, group: '控制柜' },
      // 电机
      motorVoltage: { name: '电机电压', value: 380.2, unit: 'V', min: 300, max: 450, normal: 380, warning: 400, critical: 420, group: '电机' },
      motorCurrent: { name: '电机电流', value: 12.5, unit: 'A', min: 0, max: 25, normal: 15, warning: 15, critical: 18, group: '电机' },
      // 电源
      inputVoltage: { name: '输入电压', value: 225, unit: 'V', min: 180, max: 260, normal: 220, warning: 235, critical: 245, group: '电源' },
      powerFrequency: { name: '电源频率', value: 50.2, unit: 'Hz', min: 48, max: 52, normal: 50, warning: 50.5, critical: 51, group: '电源' }
    },
    alarmThresholds: {
      temperature: { warning: 65, critical: 85 },
      voltage: { warning: 235, critical: 245 },
      current: { warning: 15, critical: 18 }
    },
    maintenanceRecords: [
      { date: '2023-12-01', type: '常规检查', findings: '正常', technician: '张工' },
      { date: '2023-10-01', type: '季度保养', findings: '更换控制板散热风扇', technician: '李工' },
      { date: '2023-08-01', type: '半年检查', findings: '调整电压稳定器', technician: '王工' }
    ],
    historicalData: {
      temperature: [52, 53, 54.5, 55, 56, 54, 55.5],
      voltage: [222.1, 223.3, 224.2, 222.5, 223.4, 224.5, 223.5],
      current: [12.1, 12.3, 12.2, 12.5, 12.4, 12.5, 12.5]
    },
    timeLabels: ['11-01', '11-02', '11-03', '11-04', '11-05', '11-06', '今日']
  };
};

// 创建仪表盘图表
const createGaugeCharts = () => {
  if (!systemData.value) return;
  
  // 清除之前的图表实例
  gaugeCharts.value.forEach(chart => {
    chart.dispose();
  });
  gaugeCharts.value = [];
  
  // 获取控制柜参数
  const controlParams = Object.values(systemData.value.parameters).filter(p => p.group === '控制柜');
  
  // 获取所有仪表盘DOM元素
  const gaugeEls = document.querySelectorAll('.param-gauge');
  if (!gaugeEls || gaugeEls.length === 0) return;
  
  // 为每个参数创建仪表盘
  controlParams.forEach((param, index) => {
    // 获取DOM元素
    const el = gaugeEls[index];
    if (!el) return;
    
    // 获取参数范围值
    let min = 0;
    let max = 100;
    let warning = 75;
    let danger = 90;
    
    if (param.name === '控制柜温度') {
      min = 0; 
      max = 100;
      warning = 65;
      danger = 85;
    } else if (param.name === '控制柜湿度') {
      min = 0;
      max = 100;
      warning = 60;
      danger = 75;
    } else if (param.name === '主板温度') {
      min = 0;
      max = 100;
      warning = 60;
      danger = 75;
    } else if (param.name === '控制器电压') {
      min = 180;
      max = 260;
      warning = 235;
      danger = 245;
    }
    
    // 创建图表实例
    const chart = echarts.init(el);
    
    // 仪表盘配置
    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        formatter: `{b}: {c}${param.unit}`,
        backgroundColor: 'rgba(40, 40, 40, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: {
          color: '#fff'
        }
      },
      series: [
        {
          name: param.name,
          type: 'gauge',
          center: ['50%', '55%'],
          radius: '75%', // 从80%继续减少到75%
          min,
          max,
          startAngle: 205,
          endAngle: -25,
          splitNumber: 5, // 从6减小到5，减少分段数
          itemStyle: {
            color: '#58D9F9'
          },
          progress: {
            show: true,
            width: 10, // 从12减小到10
            itemStyle: {
              shadowBlur: 0
            }
          },
          pointer: {
            show: true,
            width: 3, // 从4减小到3
            length: '60%', // 从65%减小到60%
            itemStyle: {
              color: '#58D9F9'
            }
          },
          axisLine: {
            lineStyle: {
              width: 12, // 从14减小到12，使轴线更细
              color: [
                [warning / max, '#5CCEA8'],
                [danger / max, '#E2A037'],
                [1, '#E25837']
              ],
              shadowBlur: 0
            }
          },
          axisTick: {
            distance: -24,
            length: 3, // 从4减小到3
            lineStyle: {
              color: '#fff',
              width: 1
            }
          },
          splitLine: {
            distance: -26,
            length: 6, // 从8减小到6
            lineStyle: {
              color: '#fff',
              width: 1.5 // 从2减小到1.5
            }
          },
          axisLabel: {
            distance: -14,
            color: '#fff',
            fontSize: 10 // 从12减小到10
          },
          title: {
            show: true,
            offsetCenter: [0, '65%'], // 从75%调整到65%，向上移动标题
            fontSize: 10, // 从12减小到10
            color: '#58D9F9',
            fontWeight: 'bold',
            formatter: param.name
          },
          detail: {
            valueAnimation: true,
            fontSize: 16, // 从18减小到16
            fontWeight: 'bolder',
            offsetCenter: [0, '25%'], // 从30%调整到25%，向上移动数值
            formatter: `{value}${param.unit}`,
            color: '#58D9F9',
            backgroundColor: 'transparent'
          },
          data: [
            {
              value: param.value,
              name: param.name
            }
          ]
        }
      ]
    };
    
    // 设置图表选项
    chart.setOption(option);
    
    // 保存图表实例
    gaugeCharts.value.push(chart);
  });
};

// 更新仪表盘数据
const updateGaugeCharts = () => {
  if (gaugeCharts.value.length === 0) return;
  
  // 获取控制柜参数
  const controlParams = Object.values(systemData.value.parameters).filter(p => p.group === '控制柜');
  
  // 更新每个仪表盘的数据
  controlParams.forEach((param, index) => {
    if (index < gaugeCharts.value.length) {
      const chart = gaugeCharts.value[index];
      chart.setOption({
        series: [
          {
            data: [
              {
                value: param.value,
                name: param.name
              }
            ]
          }
        ]
      });
    }
  });
};

// 更新系统数据 - 使用高质量IoT模拟器
const updateSystemData = () => {
  if (!systemData.value || !iotSimulator) return;
  
  // 从IoT模拟器获取最新数据
  const simulatedData = iotSimulator.getFormattedData('electrical');
  
  if (simulatedData.parameters) {
    // 更新电压波动
    if (simulatedData.parameters.voltage) {
      const voltageFluctuation = simulatedData.parameters.voltage.fluctuation.value;
      // 基准电压加上波动
      systemData.value.parameters.controllerVoltage.value = Number((223.5 + voltageFluctuation).toFixed(1));
      systemData.value.parameters.motorVoltage.value = Number((380 + voltageFluctuation * 1.7).toFixed(1));
    }
    
    // 更新接触器电压降
    if (simulatedData.parameters.contact) {
      const contactVoltageDrops = simulatedData.parameters.contact.voltageDrops.value;
      // 这里可以影响其他电气参数
      systemData.value.parameters.inputVoltage.value = Math.floor(220 - contactVoltageDrops * 0.1);
    }
  }
  
  // 更新其他参数（保持兼容性）
  systemData.value.parameters.cabinetTemperature.value = (50 + Math.random() * 10).toFixed(1) * 1;
  systemData.value.parameters.cabinetHumidity.value = (40 + Math.random() * 15).toFixed(1) * 1;
  systemData.value.parameters.mainboardTemperature.value = (45 + Math.random() * 12).toFixed(1) * 1;
  systemData.value.parameters.motorCurrent.value = (10 + Math.random() * 4).toFixed(1) * 1;
  systemData.value.parameters.powerFrequency.value = (50 + (Math.random() * 0.4 - 0.2)).toFixed(1) * 1;
  
  // 更新历史数据
  const newTemp = systemData.value.parameters.cabinetTemperature.value;
  const newVoltage = systemData.value.parameters.controllerVoltage.value;
  const newCurrent = systemData.value.parameters.motorCurrent.value;
  
  systemData.value.historicalData.temperature.shift();
  systemData.value.historicalData.temperature.push(newTemp);
  
  systemData.value.historicalData.voltage.shift();
  systemData.value.historicalData.voltage.push(newVoltage);
  
  systemData.value.historicalData.current.shift();
  systemData.value.historicalData.current.push(newCurrent);
  
  // 更新时间标签
  const today = new Date();
  const timeStr = today.getHours().toString().padStart(2, '0') + ':' + 
                  today.getMinutes().toString().padStart(2, '0');
  
  systemData.value.timeLabels = [
    ...systemData.value.timeLabels.slice(1, 6),
    timeStr
  ];
  
  // 更新仪表盘
  updateGaugeCharts();
};

// 获取关键参数用于系统概览
const getKeyParameters = () => {
  if (!systemData.value) return [];
  
  const cabinetTemp = systemData.value.parameters.cabinetTemperature.value;
  const voltage = systemData.value.parameters.controllerVoltage.value;
  const current = systemData.value.parameters.motorCurrent.value;
  
  return [
    {
      displayName: '控制柜温度',
      icon: '🌡️',
      value: cabinetTemp,
      min: 0,
      max: 100,
      unit: '°C',
      warningThreshold: 65,
      criticalThreshold: 85,
      isHigherBetter: false
    },
    {
      displayName: '控制器电压',
      icon: '⚡',
      value: voltage,
      min: 180,
      max: 260,
      unit: 'V',
      warningThreshold: 235,
      criticalThreshold: 245,
      isHigherBetter: false
    },
    {
      displayName: '电机电流',
      icon: '🔌',
      value: current,
      min: 0,
      max: 20,
      unit: 'A',
      warningThreshold: 15,
      criticalThreshold: 18,
      isHigherBetter: false
    }
  ];
};

// 获取参数状态颜色
const getStatusColor = (param) => {
  // 根据参数名称确定状态
  if (param.name === '控制柜温度') {
    return param.value <= 65 ? '#4CAF50' : param.value <= 85 ? '#FFC107' : '#F44336';
  }
  
  if (param.name === '控制柜湿度') {
    return param.value <= 60 ? '#4CAF50' : param.value <= 75 ? '#FFC107' : '#F44336';
  }
  
  if (param.name === '主板温度') {
    return param.value <= 60 ? '#4CAF50' : param.value <= 75 ? '#FFC107' : '#F44336';
  }
  
  if (param.name === '控制器电压') {
    return Math.abs(param.value - 220) <= 22 ? '#4CAF50' : Math.abs(param.value - 220) <= 33 ? '#FFC107' : '#F44336';
  }
  
  if (param.name === '电机电流') {
    return param.value <= 15 ? '#4CAF50' : param.value <= 18 ? '#FFC107' : '#F44336';
  }
  
  // 默认颜色
  return '#4CAF50';
};

// 计算关键指标环形图配置
const keyIndicatorsChartOption = computed(() => {
  const keyParams = getKeyParameters();
  if (keyParams.length === 0) return {};
  
  // 计算每个指标的百分比值
  const getPercentValue = (param) => {
    return Math.round(((param.value - param.min) / (param.max - param.min)) * 100);
  };
  
  // 创建环形图系列
  const series = keyParams.map((param, index) => {
    const percentValue = getPercentValue(param);
    // 使用自定义颜色函数
    const color = getParamColor(param.displayName);
    
    // 调整环形图半径，以适应容器
    const radiusStart = 50 - index * 16;
    const radiusEnd = 65 - index * 16;
    
    return {
      name: param.displayName,
      type: 'pie',
      radius: [`${radiusStart}%`, `${radiusEnd}%`],
      avoidLabelOverlap: true,
      startAngle: 90,
      label: {
        show: false
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 14,
          fontWeight: 'bold',
          formatter: `{b}: {c} ${param.unit}`
        }
      },
      labelLine: {
        show: false
      },
      data: [
        {
          value: percentValue,
          name: param.displayName,
          itemStyle: {
            color: color
          }
        },
        {
          value: 100 - percentValue,
          name: '',
          itemStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          emphasis: {
            label: {
              show: false
            }
          },
          tooltip: {
            show: false
          }
        }
      ]
    };
  });
  
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c}%',
      backgroundColor: 'rgba(40, 40, 40, 0.9)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: {
        color: '#fff'
      }
    },
    series: series
  };
});

// 获取参数对应颜色
const getParamColor = (name) => {
  if (name === '控制柜温度') return '#5470c6';
  if (name === '控制器电压') return '#91cc75';
  if (name === '电机电流') return '#fac858';
  return '#5470c6';
};

// 分析历史数据趋势
const getTrendData = () => {
  if (!systemData.value || !systemData.value.historicalData) return null;
  
  return {
    timeLabels: systemData.value.timeLabels,
    data: systemData.value.historicalData
  };
};

onMounted(() => {
  fetchSystemData();
  
  // 初始化IoT数据模拟器
  iotSimulator = new IoTDataSimulator({
    samplingRate: 3000,
    noiseLevel: 0.02,
    enablePhysicsModel: true,
    enableCorrelation: true
  });
  
  // 启动IoT模拟器
  iotSimulator.start();
  
  // 创建仪表盘图表
  setTimeout(() => {
    createGaugeCharts();
  }, 100);
  
  // 设置定时更新数据，每3秒更新一次
  dataUpdateInterval = setInterval(() => {
    updateSystemData();
  }, 3000);
});

// 窗口大小变化时重新调整图表
window.addEventListener('resize', () => {
  gaugeCharts.value.forEach(chart => {
    chart.resize();
  });
});

// 组件卸载前清除定时器和事件监听
onBeforeUnmount(() => {
  if (dataUpdateInterval) {
    clearInterval(dataUpdateInterval);
    dataUpdateInterval = null;
  }
  
  // 停止IoT模拟器
  if (iotSimulator) {
    iotSimulator.stop();
    iotSimulator = null;
  }
  
  // 移除窗口大小变化监听
  window.removeEventListener('resize', () => {});
  
  // 销毁所有图表实例
  gaugeCharts.value.forEach(chart => {
    chart.dispose();
  });
  gaugeCharts.value = [];
});
</script>

<template>
  <div class="system-view">
    <TechGridBackground />
    <!-- 返回按钮 -->
    <div class="back-button" @click="$router.go(-1)">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
    </div>
    <div v-if="systemData" class="system-content">
      <!-- 悬浮标题 -->
      <div class="floating-header">
        <div class="panel-header">
          <h1 class="system-title tech-text">{{ systemData.name }}</h1>
          <div class="tech-decoration"></div>
        </div>
      </div>

      <!-- 三列布局：左侧参数 - 中间3D模型 - 右侧图表 -->
      <div class="main-content">
        <!-- 左侧参数列 -->
        <div class="left-column">
          <!-- 控制柜参数 -->
          <div class="traction-parameters panel">
            <div class="parameter-grid">
              <div v-for="(param, index) in Object.values(systemData.parameters).filter(p => p.group === '控制柜')" 
                   :key="index" 
                   class="parameter-item">
                <div class="param-gauge"></div>
              </div>
            </div>
          </div>
          
          <!-- 电机参数模块 -->
          <div class="panel parameter-module">
            <div class="parameter-content">
              <ParameterChart 
                chartType="bar"
                paramGroup="电机" 
                :parameters="Object.values(systemData.parameters).filter(p => p.group === '电机')" 
              />
            </div>
          </div>
        </div>

        <!-- 中间3D模型列 -->
        <div class="center-column">
          <div class="model-3d-container">
            <ElectricalModelViewer :systemData="systemData" />
          </div>
        </div>

        <!-- 右侧图表列 -->
        <div class="right-column">
          <!-- 关键指标部分 -->
          <div class="panel">
            <div class="key-indicators-chart">
              <v-chart class="chart" :option="keyIndicatorsChartOption" autoresize />
            </div>
            <div class="indicators-legend">
              <div class="legend-item" v-for="(param, index) in getKeyParameters()" :key="index">
                <span class="legend-color" :style="{backgroundColor: getParamColor(param.displayName)}"></span>
                <span>{{ param.displayName }}: {{ param.value }}{{ param.unit }}</span>
              </div>
            </div>
          </div>
          
          <!-- 历史趋势部分 -->
          <div class="panel">
            <div class="trend-chart-container">
              <ParameterChart 
                v-if="getTrendData()"
                chartType="line"
                :timeLabels="getTrendData().timeLabels"
                :trendData="getTrendData().data"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.system-view {
  padding: 0;
  height: 100%;
  overflow-y: auto;
  background: transparent;
  position: relative;
  min-height: 100vh;
  box-sizing: border-box;
  color: #e2e8f0;
  width: 100%;
  overflow-x: hidden;
}

@media (max-width: 768px) {
  .back-button {
    left: 15px;
    top: 15px;
  }
}

.back-button {
  position: absolute;
  left: 25px;
  top: 20px;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(33, 150, 243, 0.3);
  border: 2px solid rgba(33, 150, 243, 0.5);
  color: #4dabf5;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 0 12px rgba(33, 150, 243, 0.4);
  z-index: 1000;
}

.back-button:hover {
  color: var(--text-color);
  background: rgba(33, 150, 243, 0.5);
  transform: translateY(-3px);
  box-shadow: 0 5px 18px rgba(33, 150, 243, 0.6);
}

.back-button svg {
  margin-right: 5px;
  stroke: #4dabf5;
}

.system-content {
  padding: 0; /* 移除水平内边距，解决右侧偏移问题 */
  max-width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

/* 悬浮标题样式 */
.floating-header {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  text-align: center;
  margin: 0;
  padding: 0;
  height: auto;
  line-height: 1;
  background: transparent;
  border-radius: 8px;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.panel-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 20px;
  border-bottom: none;
  background: transparent;
  border-radius: 8px;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  position: relative;
}

.system-title {
  margin: 0;
  font-size: 1.6rem;
  color: #4dabf5;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-shadow: 0 0 10px rgba(77, 171, 245, 0.5);
  display: inline-block;
}

.tech-text {
  font-family: 'Orbitron', sans-serif;
}

.tech-decoration {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.tech-decoration::before,
.tech-decoration::after {
  content: '';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 2px;
  width: 50px;
  background: linear-gradient(90deg, rgba(77, 171, 245, 0.8), rgba(77, 171, 245, 0.2));
  border-radius: 1px;
}

.tech-decoration::before {
  left: -70px;
}

.tech-decoration::after {
  right: -70px;
  background: linear-gradient(270deg, rgba(77, 171, 245, 0.8), rgba(77, 171, 245, 0.2));
}

/* 三列布局 - 调整列宽比例 */
.main-content {
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr; /* 修改比例，增加中间列的宽度 */
  gap: 10px;
  margin-bottom: 10px;
  margin-top: 100px;
  width: 100%;
}

/* 移除旧的标题样式 */
.simplified-header {
  display: none;
}

/* 左列样式 */
.left-column {
  display: flex;
  flex-direction: column;
  gap: 10px; /* 从20px减小到10px，减少上下间距 */
  padding-left: 10px;
}

/* 中间列样式 */
.center-column {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.model-3d-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 右列样式 */
.right-column {
  display: flex;
  flex-direction: column;
  gap: 10px; /* 从15px减小到10px，与左侧保持一致 */
  width: 100%;
  padding-right: 10px; /* 从5px增加到10px，与左侧保持一致 */
}

.right-column .panel {
  padding: 8px; /* 略微减小内边距 */
}

.right-column .panel:last-child {
  flex-grow: 1; /* 让最后一个面板（历史趋势）填满剩余空间 */
  display: flex;
  flex-direction: column;
}

/* 参数样式 */
.parameter-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  column-gap: 15px; 
  row-gap: 0px; /* 从5px减小到0px，完全移除行间距 */
  margin-bottom: 0px; /* 从5px减小到0px */
}

.parameter-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0;
  margin-bottom: -25px; /* 从-10px减少到-25px，进一步压缩垂直空间 */
  width: 100%; /* 确保参数项占满列宽 */
}

.param-gauge {
  width: 100%;
  height: 95px; /* 从105px减小到95px */
  margin-top: -50px; /* 从-40px进一步减少到-50px，大幅减少参数名称与仪表盘的距离 */
}

.param-range {
  display: none;
}

/* 面板样式 */
.panel {
  background: transparent;
  border-radius: 0;
  padding: 0;
  box-shadow: none;
  position: relative;
  overflow: hidden;
  width: 100%;
}

.panel:before {
  display: none;
}

.section-title {
  display: none;
}

/* 模块样式 */
.module-header {
  display: none;
}

.module-icon {
  display: none;
}

/* 图表容器 */
.trend-chart-container {
  flex-grow: 1; /* 让图表容器填满其父面板的空间 */
  width: 100%;
  position: relative;
}

.key-indicators-chart {
  height: 220px; /* 设置一个固定的基础高度 */
  width: 100%;
  position: relative;
}

.chart {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

/* 图例样式 */
.indicators-legend {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 5px;
  width: 100%;
}

.legend-item {
  display: flex;
  align-items: center;
  white-space: nowrap;
  font-size: 0.8rem;
}

.legend-color {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 6px;
  border-radius: 2px;
}

/* 参数内容高度限制 */
.parameter-content {
  height: 100px; /* 从80px增加到100px，增加参数图表高度 */
  overflow: hidden;
}

/* 特别为控制柜参数面板添加的样式 */
.traction-parameters {
  padding: 2px;
  margin-bottom: 2px;
  width: 100%;
  height: auto;
  min-height: 180px; /* 从220px减少到180px，进一步缩小整体高度 */
}

.panel.parameter-module {
  padding: 8px; /* 略微减小内边距 */
}

/* 调整模块图标大小 */
.module-icon {
  font-size: 1.2rem;
  width: 30px;
  height: 30px;
}

/* 响应式调整 */
@media (max-width: 1600px) {
  .main-content {
    grid-template-columns: 1fr 1.3fr 1fr; /* 保持一致的比例 */
    gap: 6px;
  }
  
  .parameter-grid {
    grid-template-columns: 1fr 1fr;
    gap: 15px; /* 从5px增加到15px */
    row-gap: 15px; /* 从-30px修改为15px */
  }
  
  .parameter-item {
    margin-bottom: 0; /* 从-40px修改为0 */
  }
  
  .left-column, .right-column {
    gap: 6px;
  }
}

@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
    width: 100%;
  }
  
  .model-3d-container {
    min-height: 400px;
  }
  
  .simplified-header {
    padding: 5px 0;
  }
  
  .system-content {
    padding: 0;
  }
}

@media (max-width: 768px) {
  .system-content {
    padding: 5px;
  }
  
  .parameter-grid {
    grid-template-columns: 1fr;
  }
}
</style>