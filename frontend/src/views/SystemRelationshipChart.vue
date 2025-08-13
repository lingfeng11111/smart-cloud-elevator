<template>
  <div class="system-relationship-chart">
    <TechGridBackground />
    
    <!-- 页面头部 -->
    <div class="maintenance-header">
      <TechGridBackground />
      <!-- 返回按钮 -->
      <div class="back-button" @click="$router.go(-1)">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
      </div>
      <h1 class="admin-title tech-text glow">系统总览</h1>
    </div>

    <!-- ECharts 图表容器 -->
    <div class="chart-container">
      <!-- Loading 组件 -->
      <div v-if="isLoading" class="chart-loading">
        <div class="loading-spinner">
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
        </div>
        <div class="loading-text">
          <h3>系统关系图加载中...</h3>
          <p>正在初始化图表数据和动画效果</p>
        </div>
      </div>
      <div ref="chartRef" class="echarts-chart" :class="{ 'chart-hidden': isLoading }"></div>
    </div>

    <!-- 系统状态面板 -->
    <div class="status-panel">
      <div class="panel-header">
        <h3>系统状态概览</h3>
      </div>
      <div class="status-grid">
        <div v-for="system in systemStatus" :key="system.id" class="status-item" :class="system.status" 
             @mouseenter="showSystemTooltip($event, system)" @mouseleave="hideSystemTooltip">
          <div class="status-icon">{{ system.icon }}</div>
          <div class="status-info">
            <div class="status-name">{{ system.name }}</div>
            <div class="status-value">{{ system.statusText }}</div>
          </div>
          <div class="status-indicator" :style="{ backgroundColor: system.color }"></div>
        </div>
      </div>
    </div>

    <!-- 控制按钮 -->
    <div class="control-section">
      <el-button @click="resetChart" type="primary" class="reset-btn">
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" fill="currentColor"/>
        </svg>
        重置布局
      </el-button>
    </div>

    <!-- 悬浮提示 -->
    <div v-if="tooltipVisible && tooltipData" class="system-tooltip" 
         :style="{ left: tooltipPosition.x + 'px', top: tooltipPosition.y + 'px' }">
      <div class="tooltip-header">
        <span class="tooltip-icon">{{ tooltipData.icon }}</span>
        <span class="tooltip-title">{{ tooltipData.name }}</span>
      </div>
      <div class="tooltip-content">
        <div class="tooltip-status">
          <span class="status-label">状态:</span>
          <span class="status-value" :style="{ color: tooltipData.color }">{{ tooltipData.statusText }}</span>
        </div>
        <div class="tooltip-details">
          <div v-for="(value, key) in tooltipData.details" :key="key" class="detail-row">
            <span class="detail-label">{{ getDetailLabel(key) }}:</span>
            <span class="detail-value">{{ value }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 详情面板 -->
    <div v-if="selectedNodeData" class="detail-panel">
      <div class="panel-header">
        <h3>{{ selectedNodeData.name }}</h3>
        <el-button @click="selectedNodeData = null" size="small" circle>
          <svg class="icon" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
          </svg>
        </el-button>
      </div>
      <div class="detail-content">
        <div class="detail-item">
          <span class="label">系统类型:</span>
          <span class="value">{{ selectedNodeData.category }}</span>
        </div>
        <div class="detail-item">
          <span class="label">运行状态:</span>
          <span class="value" :style="{ color: selectedNodeData.itemStyle.color }">{{ selectedNodeData.statusText }}</span>
        </div>
        <div class="detail-item">
          <span class="label">连接数量:</span>
          <span class="value">{{ selectedNodeData.connections || 0 }}</span>
        </div>
        <div v-if="selectedNodeData.description" class="detail-item">
          <span class="label">描述:</span>
          <span class="value">{{ selectedNodeData.description }}</span>
        </div>
        <div v-if="selectedNodeData.metrics" class="metrics-section">
          <h4>关键指标</h4>
          <div v-for="metric in selectedNodeData.metrics" :key="metric.name" class="metric-item">
            <span class="metric-name">{{ metric.name }}:</span>
            <span class="metric-value">{{ metric.value }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, reactive } from 'vue';
import { useRouter } from 'vue-router';
import * as echarts from 'echarts';
import TechGridBackground from '../components/TechGridBackground.vue';

const router = useRouter();

// 图表相关
const chartRef = ref(null);
let chartInstance = null;
const selectedNodeData = ref(null);
const isAnimating = ref(false);
const isLoading = ref(true);
let autoStopTimer = null;
let dataUpdateTimer = null;

// 系统状态数据
const systemStatus = reactive([
  { 
    id: 'core', 
    name: '核心系统', 
    icon: '🏢', 
    status: 'normal', 
    statusText: '运行正常', 
    color: '#10b981',
    details: {
      cpu: '45%',
      memory: '2.1GB',
      uptime: '72天',
      temperature: '42°C',
      connections: 24
    }
  },
  { 
    id: 'traction', 
    name: '曳引系统', 
    icon: '⚙️', 
    status: 'normal', 
    statusText: '运行正常', 
    color: '#10b981',
    details: {
      speed: '1450 RPM',
      load: '68%',
      temperature: '42°C',
      vibration: '0.1m/s²',
      efficiency: '94.2%'
    }
  },
  { 
    id: 'guidance', 
    name: '导向系统', 
    icon: '🧭', 
    status: 'normal', 
    statusText: '运行正常', 
    color: '#10b981',
    details: {
      deviation: '0.2mm',
      vibration: '0.1m/s²',
      accuracy: '±2mm',
      wear: '正常',
      lubrication: '良好'
    }
  },
  { 
    id: 'electrical', 
    name: '电气系统', 
    icon: '⚡', 
    status: 'warning', 
    statusText: '轻微警告', 
    color: '#f59e0b',
    details: {
      voltage: '380V',
      current: '12.5A',
      power: '0.92',
      insulation: '警告',
      protection: '正常'
    }
  },
  { 
    id: 'door', 
    name: '门系统', 
    icon: '🚪', 
    status: 'normal', 
    statusText: '运行正常', 
    color: '#10b981',
    details: {
      openTime: '2.1s',
      closeTime: '2.3s',
      safety: '正常',
      sensor: '正常',
      cycles: '15,234'
    }
  },
  { 
    id: 'ai', 
    name: 'AI分析', 
    icon: '🤖', 
    status: 'normal', 
    statusText: '分析中', 
    color: '#8b5cf6',
    details: {
      accuracy: '94.2%',
      processing: '0.8s',
      model: 'v2.1.3',
      predictions: '156',
      alerts: '2'
    }
  }
]);

// 动态数据更新函数
const updateSystemData = () => {
  systemStatus.forEach(system => {
    switch(system.id) {
      case 'core':
        system.details.cpu = Math.floor(Math.random() * 30 + 35) + '%';
        system.details.memory = (Math.random() * 1 + 1.5).toFixed(1) + 'GB';
        system.details.temperature = Math.floor(Math.random() * 10 + 38) + '°C';
        system.details.connections = Math.floor(Math.random() * 10 + 20);
        break;
      case 'traction':
        system.details.speed = Math.floor(Math.random() * 100 + 1400) + ' RPM';
        system.details.load = Math.floor(Math.random() * 20 + 60) + '%';
        system.details.temperature = Math.floor(Math.random() * 8 + 38) + '°C';
        system.details.vibration = (Math.random() * 0.1 + 0.05).toFixed(2) + 'm/s²';
        system.details.efficiency = (Math.random() * 3 + 92).toFixed(1) + '%';
        break;
      case 'guidance':
        system.details.deviation = (Math.random() * 0.3 + 0.1).toFixed(1) + 'mm';
        system.details.vibration = (Math.random() * 0.1 + 0.05).toFixed(2) + 'm/s²';
        break;
      case 'electrical':
        system.details.voltage = Math.floor(Math.random() * 10 + 375) + 'V';
        system.details.current = (Math.random() * 3 + 10).toFixed(1) + 'A';
        system.details.power = (Math.random() * 0.1 + 0.85).toFixed(2);
        // 随机切换警告状态
        if (Math.random() < 0.1) {
          system.status = 'warning';
          system.statusText = '轻微警告';
          system.color = '#f59e0b';
          system.details.insulation = '警告';
        } else {
          system.status = 'normal';
          system.statusText = '运行正常';
          system.color = '#10b981';
          system.details.insulation = '正常';
        }
        break;
      case 'door':
        system.details.openTime = (Math.random() * 0.5 + 1.8).toFixed(1) + 's';
        system.details.closeTime = (Math.random() * 0.5 + 2.0).toFixed(1) + 's';
        system.details.cycles = (15000 + Math.floor(Math.random() * 500)).toLocaleString();
        break;
      case 'ai':
        system.details.accuracy = (Math.random() * 2 + 93).toFixed(1) + '%';
        system.details.processing = (Math.random() * 0.3 + 0.6).toFixed(1) + 's';
        system.details.predictions = Math.floor(Math.random() * 50 + 130);
        system.details.alerts = Math.floor(Math.random() * 5);
        break;
    }
  });
};

// 启动数据更新定时器
const startDataUpdate = () => {
  updateSystemData(); // 立即更新一次
  dataUpdateTimer = setInterval(updateSystemData, 3000); // 每3秒更新一次
};

// 停止数据更新定时器
const stopDataUpdate = () => {
  if (dataUpdateTimer) {
    clearInterval(dataUpdateTimer);
    dataUpdateTimer = null;
  }
};

// 悬浮提示相关
const tooltipVisible = ref(false);
const tooltipData = ref(null);
const tooltipPosition = ref({ x: 0, y: 0 });

const showSystemTooltip = (event, system) => {
  tooltipData.value = system;
  tooltipPosition.value = {
    x: event.clientX + 10,
    y: event.clientY - 10
  };
  tooltipVisible.value = true;
};

const hideSystemTooltip = () => {
  tooltipVisible.value = false;
  tooltipData.value = null;
};

// 获取详细信息标签
const getDetailLabel = (key) => {
  const labels = {
    cpu: 'CPU使用率',
    memory: '内存使用',
    uptime: '运行时间',
    temperature: '温度',
    connections: '连接数',
    speed: '电机转速',
    load: '负载率',
    vibration: '振动幅度',
    efficiency: '效率',
    deviation: '导轨偏差',
    accuracy: '定位精度',
    wear: '磨损状态',
    lubrication: '润滑状态',
    voltage: '电压',
    current: '电流',
    power: '功率因数',
    insulation: '绝缘状态',
    protection: '保护状态',
    openTime: '开门时间',
    closeTime: '关门时间',
    safety: '安全检测',
    sensor: '传感器',
    cycles: '运行次数',
    accuracy: '预测准确率',
    processing: '处理速度',
    model: '模型版本',
    predictions: '预测数量',
    alerts: '警报数量'
  };
  return labels[key] || key;
};

// 图表数据
const getChartData = () => {
  const nodes = [
    // 核心系统 - 中心位置
    {
      id: 'core-system',
      name: '智云梯核心系统',
      category: '核心控制',
      value: 100,
      x: 400,
      y: 300,
      symbolSize: 80,
      itemStyle: { color: '#8b5cf6' },
      statusText: '运行正常',
      description: '智云梯系统的核心控制单元，负责协调各子系统运行',
      metrics: [
        { name: 'CPU使用率', value: '45%' },
        { name: '内存使用', value: '2.1GB' },
        { name: '运行时间', value: '72天' }
      ]
    },
    
    // 四大子系统 - 围绕核心系统
    {
      id: 'traction-system',
      name: '曳引系统',
      category: '动力系统',
      value: 85,
      x: 200,
      y: 150,
      symbolSize: 65,
      itemStyle: { color: '#10b981' },
      statusText: '运行正常',
      description: '负责电梯的垂直运动控制',
      metrics: [
        { name: '电机转速', value: '1450 RPM' },
        { name: '负载率', value: '68%' },
        { name: '温度', value: '42°C' }
      ]
    },
    {
      id: 'guidance-system',
      name: '导向系统',
      category: '导向控制',
      value: 78,
      x: 600,
      y: 150,
      symbolSize: 60,
      itemStyle: { color: '#06b6d4' },
      statusText: '运行正常',
      description: '确保电梯运行的平稳性和精确定位',
      metrics: [
        { name: '导轨偏差', value: '0.2mm' },
        { name: '振动幅度', value: '0.1m/s²' },
        { name: '定位精度', value: '±2mm' }
      ]
    },
    {
      id: 'electrical-system',
      name: '电气控制系统',
      category: '电气控制',
      value: 72,
      x: 600,
      y: 450,
      symbolSize: 58,
      itemStyle: { color: '#f59e0b' },
      statusText: '轻微警告',
      description: '智云梯的电气控制和安全保护系统',
      metrics: [
        { name: '电压', value: '380V' },
        { name: '电流', value: '12.5A' },
        { name: '功率因数', value: '0.92' }
      ]
    },
    {
      id: 'door-system',
      name: '门系统',
      category: '安全系统',
      value: 82,
      x: 200,
      y: 450,
      symbolSize: 62,
      itemStyle: { color: '#ec4899' },
      statusText: '运行正常',
      description: '电梯门的开关控制和安全检测',
      metrics: [
        { name: '开门时间', value: '2.1s' },
        { name: '关门时间', value: '2.3s' },
        { name: '安全检测', value: '正常' }
      ]
    },
    
    // 数据服务层
    {
      id: 'data-collection',
      name: '数据采集服务',
      category: '数据服务',
      value: 65,
      x: 150,
      y: 300,
      symbolSize: 50,
      itemStyle: { color: '#14b8a6' },
      statusText: '采集中',
      description: '实时采集各系统运行数据',
      metrics: [
        { name: '采集频率', value: '100Hz' },
        { name: '数据量', value: '1.2MB/s' },
        { name: '延迟', value: '5ms' }
      ]
    },
    {
      id: 'ai-analysis',
      name: 'AI智能分析',
      category: '智能服务',
      value: 88,
      x: 650,
      y: 300,
      symbolSize: 55,
      itemStyle: { color: '#8b5cf6' },
      statusText: '分析中',
      description: '基于AI的故障预测和性能优化',
      metrics: [
        { name: '预测准确率', value: '94.2%' },
        { name: '处理速度', value: '0.8s' },
        { name: '模型版本', value: 'v2.1.3' }
      ]
    },
    {
      id: 'websocket-service',
      name: 'WebSocket服务',
      category: '通信服务',
      value: 75,
      x: 400,
      y: 150,
      symbolSize: 45,
      itemStyle: { color: '#3b82f6' },
      statusText: '连接中',
      description: '实时数据推送和双向通信',
      metrics: [
        { name: '连接数', value: '24' },
        { name: '消息量', value: '156/min' },
        { name: '延迟', value: '12ms' }
      ]
    },
    
    // 管理界面层
    {
      id: 'dashboard',
      name: '管理控制台',
      category: '用户界面',
      value: 70,
      x: 100,
      y: 500,
      symbolSize: 48,
      itemStyle: { color: '#06b6d4' },
      statusText: '在线',
      description: '系统管理和监控界面',
      metrics: [
        { name: '在线用户', value: '3' },
        { name: '响应时间', value: '120ms' },
        { name: '页面加载', value: '1.2s' }
      ]
    },
    {
      id: 'maintenance-interface',
      name: '维护管理',
      category: '维护界面',
      value: 68,
      x: 300,
      y: 550,
      symbolSize: 46,
      itemStyle: { color: '#f59e0b' },
      statusText: '待处理',
      description: '设备维护和故障处理界面',
      metrics: [
        { name: '待处理工单', value: '2' },
        { name: '完成率', value: '95.8%' },
        { name: '平均处理时间', value: '4.2h' }
      ]
    },
    {
      id: 'user-management',
      name: '用户管理',
      category: '权限管理',
      value: 60,
      x: 500,
      y: 550,
      symbolSize: 44,
      itemStyle: { color: '#ec4899' },
      statusText: '正常',
      description: '用户权限和角色管理',
      metrics: [
        { name: '注册用户', value: '28' },
        { name: '活跃用户', value: '15' },
        { name: '权限组', value: '4' }
      ]
    }
  ];
  
  const links = [
    // 核心系统连接
    { source: 'core-system', target: 'traction-system', lineStyle: { color: '#8b5cf6', width: 3 } },
    { source: 'core-system', target: 'guidance-system', lineStyle: { color: '#8b5cf6', width: 3 } },
    { source: 'core-system', target: 'electrical-system', lineStyle: { color: '#8b5cf6', width: 3 } },
    { source: 'core-system', target: 'door-system', lineStyle: { color: '#8b5cf6', width: 3 } },
    
    // 数据流连接
    { source: 'traction-system', target: 'data-collection', lineStyle: { color: '#10b981', width: 2 } },
    { source: 'guidance-system', target: 'data-collection', lineStyle: { color: '#06b6d4', width: 2 } },
    { source: 'electrical-system', target: 'data-collection', lineStyle: { color: '#f59e0b', width: 2 } },
    { source: 'door-system', target: 'data-collection', lineStyle: { color: '#ec4899', width: 2 } },
    
    // AI分析连接
    { source: 'data-collection', target: 'ai-analysis', lineStyle: { color: '#14b8a6', width: 2 } },
    { source: 'ai-analysis', target: 'core-system', lineStyle: { color: '#8b5cf6', width: 2 } },
    
    // 通信服务连接
    { source: 'core-system', target: 'websocket-service', lineStyle: { color: '#3b82f6', width: 2 } },
    { source: 'websocket-service', target: 'dashboard', lineStyle: { color: '#06b6d4', width: 2 } },
    
    // 管理界面连接
    { source: 'data-collection', target: 'dashboard', lineStyle: { color: '#14b8a6', width: 1.5 } },
    { source: 'ai-analysis', target: 'maintenance-interface', lineStyle: { color: '#f59e0b', width: 1.5 } },
    { source: 'core-system', target: 'user-management', lineStyle: { color: '#ec4899', width: 1.5 } }
  ];
  
  return { nodes, links };
};

// 图表配置
const getChartOption = () => {
  const { nodes, links } = getChartData();
  
  return {
    backgroundColor: 'transparent',
    animationDuration: 1500,
    animationEasing: 'cubicInOut',
    animationEasingUpdate: 'cubicInOut',
    animationDurationUpdate: 600,
    animationDelayUpdate: (idx) => idx * 30,
    series: [{
      type: 'graph',
      layout: 'none',
      data: nodes,
      links: links,
      categories: [
        { name: '核心控制', itemStyle: { color: '#8b5cf6' } },
        { name: '动力系统', itemStyle: { color: '#10b981' } },
        { name: '导向控制', itemStyle: { color: '#06b6d4' } },
        { name: '电气控制', itemStyle: { color: '#f59e0b' } },
        { name: '安全系统', itemStyle: { color: '#ec4899' } },
        { name: '数据服务', itemStyle: { color: '#14b8a6' } },
        { name: '智能服务', itemStyle: { color: '#8b5cf6' } },
        { name: '通信服务', itemStyle: { color: '#3b82f6' } },
        { name: '用户界面', itemStyle: { color: '#06b6d4' } },
        { name: '维护界面', itemStyle: { color: '#f59e0b' } },
        { name: '权限管理', itemStyle: { color: '#ec4899' } }
      ],
      roam: true,
      label: {
        show: true,
        position: 'bottom',
        formatter: '{b}',
        color: '#ffffff',
        fontSize: 12,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowBlur: 3,
        hideOverlap: true  // ECharts的Hide Overlapped Label功能
      },
      labelLayout: {
        hideOverlap: true
      },
      emphasis: {
        focus: 'adjacency',
        label: {
          fontSize: 14,
          fontWeight: 'bold'
        },
        lineStyle: {
          width: 4
        }
      },
      force: {
        repulsion: 1000,
        gravity: 0.1,
        edgeLength: 150,
        layoutAnimation: false,
        friction: 0.9,
        initLayout: 'circular'
      },
      draggable: true,
      symbol: 'circle',
      symbolSize: (value, params) => params.data.symbolSize,
      itemStyle: {
        borderColor: '#ffffff',
        borderWidth: 2,
        shadowColor: 'rgba(0, 0, 0, 0.3)',
        shadowBlur: 10
      },
      lineStyle: {
        color: 'rgba(96,165, 250, 0.6)',
        width: 2,
        curveness: 0.3,
        opacity: 0.8,
        shadowColor: 'rgba(96, 165, 250, 0.3)',
        shadowBlur: 8
      },
      animation: true,
      animationDuration: 600,
      animationEasing: 'cubicInOut',
      animationThreshold: 2000,
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: [0, 8]
    }],
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0, 20, 40, 0.9)',
      borderColor: '#60a5fa',
      borderWidth: 1,
      textStyle: {
        color: '#ffffff',
        fontSize: 14
      },
      formatter: (params) => {
        if (params.dataType === 'node') {
          const data = params.data;
          return `
            <div style="padding: 8px;">
              <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">${data.name}</div>
              <div style="margin-bottom: 4px;">类型: ${data.category}</div>
              <div style="margin-bottom: 4px;">状态: <span style="color: ${data.itemStyle.color}">${data.statusText}</span></div>
              <div>重要度: ${data.value}%</div>
            </div>
          `;
        }
        return params.name;
      }
    }
  };
};

// 初始化图表
const initChart = async () => {
  await nextTick();
  if (chartRef.value) {
    // 模拟加载时间，让用户看到loading效果
    await new Promise(resolve => setTimeout(resolve, 800));
    
    chartInstance = echarts.init(chartRef.value);
    
    // 先设置初始配置，禁用拖拽
    const initialOption = getChartOption();
    initialOption.series[0].draggable = false;
    chartInstance.setOption(initialOption);
    
    // 点击事件
    chartInstance.on('click', (params) => {
      if (params.dataType === 'node') {
        selectedNodeData.value = params.data;
      }
    });
    
    // 窗口大小变化时重新调整
    window.addEventListener('resize', () => {
      chartInstance?.resize();
    });
    
    // 等待图表完全渲染后再隐藏loading
    await new Promise(resolve => setTimeout(resolve, 200));
    isLoading.value = false;
    
    // 等待loading动画完成后再开始自动动画
    await new Promise(resolve => setTimeout(resolve, 300));
    startAutoAnimation();
    
    // 动画完成后启用拖拽功能
    setTimeout(() => {
      const option = chartInstance.getOption();
      option.series[0].draggable = true;
      chartInstance.setOption(option, { notMerge: false });
    }, 3500); // 3秒动画 + 0.5秒缓冲
  }
};

// 动画控制
let animationTimer = null;
const startAnimation = () => {
  if (animationTimer) clearInterval(animationTimer);
  
  animationTimer = setInterval(() => {
    if (!chartInstance) return;
    
    const option = chartInstance.getOption();
    if (!option || !option.series || !option.series[0]) return;
    
    const series = option.series[0];
    const { nodes } = getChartData();
    
    // 恢复最初的简单节点大小动画
    const updatedData = series.data.map(node => {
      const originalNode = nodes.find(n => n.id === node.id);
      const baseSize = originalNode ? originalNode.symbolSize : 50;
      const variation = Math.sin(Date.now() / 1000 + node.value) * 8;
      return {
        ...node,
        symbolSize: Math.max(30, baseSize + variation)
      };
    });
    
    // 使用更平滑的更新方式，避免闪烁
    chartInstance.setOption({
      series: [{
        ...series,
        data: updatedData
      }]
    }, { 
      notMerge: false, 
      lazyUpdate: true,
      silent: true
    });
  }, 100); // 恢复原始动画速度
};

const stopAnimation = () => {
  if (animationTimer) {
    clearInterval(animationTimer);
    animationTimer = null;
  }
};

const startAutoAnimation = () => {
  isAnimating.value = true;
  startAnimation();
  
  // 3秒后自动停止动画
  autoStopTimer = setTimeout(() => {
    isAnimating.value = false;
    stopAnimation();
  }, 3000);
};

// 重置图表
const resetChart = () => {
  if (chartInstance) {
    chartInstance.setOption(getChartOption(), true);
  }
};

// 生命周期
onMounted(() => {
  initChart();
  startDataUpdate(); // 启动数据更新
});

onBeforeUnmount(() => {
  stopAnimation();
  stopDataUpdate(); // 停止数据更新
  if (autoStopTimer) {
    clearTimeout(autoStopTimer);
  }
  if (chartInstance) {
    chartInstance.dispose();
  }
  window.removeEventListener('resize', () => {
    chartInstance?.resize();
  });
});
</script>

<style scoped>
.back-button {
  width: 50px;
  height: 50px;
  position: absolute;
  left: 2vw;
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

.system-relationship-chart {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: transparent;
}

/* 头部样式 */
.header-section {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: linear-gradient(180deg, rgba(0, 20, 40, 0.9), transparent);
}

/* 悬浮提示样式 */
.system-tooltip {
  position: fixed;
  z-index: 9999;
  background: linear-gradient(135deg, rgba(0, 20, 40, 0.95), rgba(0, 30, 60, 0.95));
  border: 1px solid rgba(96, 165, 250, 0.3);
  border-radius: 12px;
  padding: 16px;
  min-width: 280px;
  max-width: 350px;

  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  pointer-events: none;
  animation: tooltipFadeIn 0.2s ease-out;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.tooltip-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(96, 165, 250, 0.2);
}

.tooltip-icon {
  font-size: 20px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tooltip-title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.tooltip-content {
  color: #ffffff;
}

.tooltip-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.status-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.status-value {
  font-size: 14px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.tooltip-details {
  display: grid;
  gap: 6px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.detail-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.detail-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  flex: 1;
}

.detail-value {
  font-size: 13px;
  font-weight: 500;
  color: #60a5fa;
  text-align: right;
  font-family: 'Monaco', 'Menlo', monospace;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  max-width: 1400px;
  margin: 0 auto;
}

.title-section {
  flex: 1;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.page-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.control-section {
  display: flex;
  gap: 12px;
}

.back-btn, .reset-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid rgba(96, 165, 250, 0.3);
  background: rgba(30, 58, 138, 0.2);
  color: #ffffff;
  border-radius: 8px;
  transition: all 0.3s ease;

}

.back-btn:hover, .reset-btn:hover, .animation-btn:hover {
  background: rgba(59, 130, 246, 0.3);
  border-color: rgba(96, 165, 250, 0.5);
  transform: translateY(-1px);
}

.icon {
  width: 16px;
  height: 16px;
}

/* 图表容器 */
.chart-container {
  position: absolute;
  top: 100px;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20px;
}

.echarts-chart {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  background: rgba(0, 20, 40, 0.1);

  border: 1px solid rgba(96, 165, 250, 0.1);
}

/* 状态面板 */
.status-panel {
  position: absolute;
  top: 120px;
  left: 20px;
  width: 280px;
  background: rgba(0, 20, 40, 0.9);
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: 12px;
  padding: 20px;
  z-index: 50;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(96, 165, 250, 0.2);
}

.panel-header h3 {
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.status-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(30, 58, 138, 0.1);
  border: 1px solid rgba(96, 165, 250, 0.1);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.status-item:hover {
  background: rgba(30, 58, 138, 0.2);
  border-color: rgba(96, 165, 250, 0.3);
}

.status-icon {
  font-size: 20px;
  width: 24px;
  text-align: center;
}

.status-info {
  flex: 1;
}

.status-name {
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
}

.status-value {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}

/* 详情面板 */
.detail-panel {
  position: absolute;
  top: 120px;
  right: 20px;
  width: 320px;
  background: rgba(0, 20, 40, 0.9);
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: 12px;
  padding: 20px;
  z-index: 50;
}

.detail-content {
  color: #ffffff;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(96, 165, 250, 0.1);
}

.label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.value {
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
}

.metrics-section {
  margin-top: 16px;
}

.metrics-section h4 {
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(96, 165, 250, 0.2);
}

.metric-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 6px 0;
}

.metric-name {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
}

.metric-value {
  color: #60a5fa;
  font-size: 13px;
  font-weight: 500;
}

/* 维修日志头部样式 */
.maintenance-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5vh 2vw;
  margin-top: 40px;
  margin-bottom: 2vh;
  background: transparent;
  border: none;
  box-shadow: none;
  gap: 10px;
}

.admin-title {
  font-size: 2rem;
  color: #4dabf5;
  margin: 0;
  flex: 1;
  text-align: center;
}

.tech-text {
  font-family: 'Orbitron', monospace;
  letter-spacing: 1px;
}

.glow {
  text-shadow: 0 0 10px rgba(77, 171, 245, 0.5);
}

.tech-decoration {
  height: 2px;
  width: 50px;
  background: linear-gradient(90deg, rgba(77, 171, 245, 0.8), rgba(77, 171, 245, 0.2));
  border-radius: 1px;
  position: relative;
}

.tech-decoration::before {
  content: '';
  position: absolute;
  right: -10px;
  top: -4px;
  width: 10px;
  height: 10px;
  background: rgba(77, 171, 245, 0.8);
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(77, 171, 245, 0.8);
}

/* 控制按钮样式 */
.control-section {
  position: absolute;
  top: 705px;
  left: 20px;
  width: 280px;
  display: flex;
  justify-content: center;
  z-index: 10;
}

.reset-btn {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.reset-btn:hover {
  background: linear-gradient(135deg, #764ba2, #667eea);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(118, 75, 162, 0.4);
}

.reset-btn .icon {
  width: 16px;
  height: 16px;
}

/* 维修日志样式 */
.maintenance-log {
  position: absolute;
  bottom: 20px;
  left: 20px;
  width: 300px;
  background: rgba(0, 20, 40, 0.9);
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: 12px;
  padding: 16px;
  z-index: 50;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(96, 165, 250, 0.2);
}

.log-header h4 {
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  margin: 0;
}

.log-list {
  max-height: 200px;
  overflow-y: auto;
}

.log-item {
  padding: 8px 0;
  border-bottom: 1px solid rgba(96, 165, 250, 0.1);
}

.log-item:last-child {
  border-bottom: none;
}

.log-time {
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
  margin-bottom: 4px;
}

.log-message {
  color: #ffffff;
  font-size: 12px;
  line-height: 1.4;
}

.log-type {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  margin-right: 6px;
}

.log-type.info {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.log-type.warning {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.log-type.error {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.log-type.success {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .status-panel, .detail-panel {
    width: 260px;
  }
  
  .header-content {
    padding: 15px 20px;
  }
  
  .page-title {
    font-size: 24px;
  }
}

@media (max-width: 768px) {
  .status-panel {
    position: relative;
    top: auto;
    right: auto;
    width: 100%;
    margin: 10px;
  }
  
  .detail-panel {
    position: relative;
    top: auto;
    left: auto;
    width: 100%;
    margin: 10px;
  }
  
  .chart-container {
    top: 80px;
    padding: 10px;
  }
  
  .control-section {
    flex-direction: column;
    gap: 8px;
  }
}

/* Loading 样式 */
.chart-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #000000;
  z-index: 9999;
}

.loading-spinner {
  position: relative;
  width: 80px;
  height: 80px;
  margin-bottom: 30px;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 3px solid transparent;
  border-radius: 50%;
  animation: spin 2s linear infinite;
}

.spinner-ring:nth-child(1) {
  border-top-color: #60a5fa;
  animation-delay: 0s;
}

.spinner-ring:nth-child(2) {
  border-top-color: #8b5cf6;
  animation-delay: -0.4s;
  width: 70%;
  height: 70%;
  top: 15%;
  left: 15%;
}

.spinner-ring:nth-child(3) {
  border-top-color: #10b981;
  animation-delay: -0.8s;
  width: 40%;
  height: 40%;
  top: 30%;
  left: 30%;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-text {
  text-align: center;
  color: #ffffff;
}

.loading-text h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #60a5fa;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.loading-text p {
  font-size: 14px;
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

.chart-hidden {
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.5s ease, visibility 0.5s ease;
}
</style>