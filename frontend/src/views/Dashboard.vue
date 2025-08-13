<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useRouter } from 'vue-router';
import ElevatorVisualizer from '../components/ElevatorVisualizer.vue';
import ControlPanel from '../components/ControlPanel.vue';
import HeaderPanel from '../components/HeaderPanel.vue';
import FooterPanel from '../components/FooterPanel.vue';
import AICenterNotification from '../components/AICenterNotification.vue';
import AbnormalDataLog from '../components/AbnormalDataLog.vue';
import { ref as vueRef } from 'vue';
import DataCollectionService from '../services/DataCollectionService';
import elevatorSocketService from '../services/elevatorSocketService';
// import { useElevatorSimulation } from '../composables/useElevatorSimulation.js'; // 移除前端模拟
import { useAIAnalysis } from '../composables/useAIAnalysis.js';

const router = useRouter();

// 电梯核心状态数据 (由后端WebSocket驱动)
const elevatorState = ref({
  id: 'EL-001',
  currentFloor: 1,
  targetFloor: 1,
  status: '未连接',
  speed: 0,
  direction: '无',
  doorStatus: '关闭',
  loadWeight: 0,
  maxWeight: 1000,
  temperature: 22.5,
  maintenanceStatus: '正常',
  lastMaintenance: '2023-12-15',
  totalTrips: 12543,
  operatingHours: 5231,
  energyConsumption: 45.2,
  floorCount: 15,
  systems: [ /* 初始系统数据可以保留或从API获取 */ ]
});

const elevatorRunning = ref(true);

// 核心控制功能 (保留AI分析可能需要的启停)
const stopElevator = () => {
  console.log('严重故障，通过AI分析停止电梯');
  elevatorSocketService.emergencyStop(elevatorState.value.id);
};
const resumeElevator = () => {
  console.log('维修完成，通过AI分析恢复电梯运行');
  elevatorSocketService.resumeOperation(elevatorState.value.id);
};

// 使用AI分析 Composable
const {
  centerAIResult,
  showCenterNotification,
  aiRecommendation,
  generateAbnormalData,
  requestDeepAnalysis,
  isProcessingAI,
  analysisStep,
  simulatedData,
  quickAnalysisResult,
  isDeepAnalyzing,
} = useAIAnalysis(stopElevator);

// 3D模式状态
const is360ModeActive = ref(false);

// 数据采集服务实例
const dataCollectionService = new DataCollectionService({
  collectionInterval: 5000,
  batchSize: 5
});

// 切换360°展示模式
const toggle360Mode = () => {
  is360ModeActive.value = !is360ModeActive.value;
  console.log(`360°展示模式: ${is360ModeActive.value ? '开启' : '关闭'}`);
};

// 跳转到系统详情页
const navigateToSystemDetail = (systemId) => {
  let routeName = '';
  switch (systemId) {
    case 'sys-001': routeName = 'traction-system'; break;
    case 'sys-002': routeName = 'guidance-system'; break;
    case 'sys-003': routeName = 'electrical-system'; break;
    case 'sys-004': routeName = 'door-system'; break;
    default: routeName = 'traction-system';
  }
  router.push({ name: routeName });
};

// 处理WebSocket消息的回调函数
const handleElevatorDataUpdate = (data) => {
  // 完全使用后端数据更新状态
  Object.assign(elevatorState.value, data);
};

// 组件挂载后
onMounted(() => {
  // 连接WebSocket以获取后端数据
  elevatorSocketService.connect(elevatorState.value.id, handleElevatorDataUpdate);
});

// 清理函数
onBeforeUnmount(() => {
  // 断开WebSocket连接
  elevatorSocketService.disconnect();
});

// 处理新通知组件的回调
const handleCenterNotificationClose = () => {
  showCenterNotification.value = false;
  // 重置分析步骤状态，重新启用按钮
  analysisStep.value = 'idle';
};

// 处理系统详情查看
const handleCenterSystemDetails = (systemId) => {
  navigateToSystemDetail(systemId);
  showCenterNotification.value = false;
  // 重置分析步骤状态
  analysisStep.value = 'idle';
};

// 处理维修完成回调
const handleCenterRepairComplete = () => {
  resumeElevator();
  showCenterNotification.value = false;
  // 重置分析步骤状态
  analysisStep.value = 'idle';
};

// 引用异常日志组件，便于分配后刷新
const abnormalLogRef = vueRef(null);

// 处理维修分配回调
const handleMaintenanceAssigned = (assignmentData) => {
  if (assignmentData.success) {
    console.log('维修任务分配成功:', assignmentData);
    // 分配成功后刷新异常日志，使状态与数据库对齐
    abnormalLogRef.value?.refresh?.();
    // 重置分析步骤状态，重新启用按钮
    analysisStep.value = 'idle';
  } else {
    console.error('维修任务分配失败:', assignmentData.error);
    // 即使失败也重置状态
    analysisStep.value = 'idle';
  }
};

// 处理警告忽略回调
const handleWarningIgnored = (warningData) => {
  console.log('警告已忽略:', warningData);
  // 重置分析步骤状态，重新启用按钮
  analysisStep.value = 'idle';
};

// 处理接受快速分析结果回调
const handleAcceptQuickResult = () => {
  console.log('用户选择接受ML分析结果');
  // 可以在这里添加额外的逻辑，比如记录用户选择等
};

// 处理请求深度分析回调
const handleRequestDeepAnalysis = (data) => {
  console.log('用户请求深度分析:', data);
  requestDeepAnalysis(data);
};

// 根据分析步骤确定通知类型
const getNotificationType = (step) => {
  switch (step) {
    case 'simulating':
      return 'simulation';
    case 'ml-analyzing':
      return 'simulation'; // ML分析中也显示为蓝色
    case 'ml-completed':
    case 'deep-analyzing':
    case 'deep-completed':
    case 'final-result':
      return 'traditional'; // ML完成后显示为传统的红色/黄色弹窗
    default:
      return 'traditional';
  }
};
</script>

<template>
  <div class="dashboard">
    <HeaderPanel class="header" :elevatorId="elevatorState.id" />
    
    <div class="sidebar panel">
      <div class="panel-header">
        <h2 class="panel-title tech-text">控制面板</h2>
        <div class="tech-decoration"></div>
      </div>
      <ControlPanel :elevatorData="elevatorState" />
    </div>
    
    <div class="main panel">
      <div class="panel-header">
        <div class="tech-decoration"></div>
      </div>
      <ElevatorVisualizer 
        :animationData="elevatorState" 
        :is-360-mode-active="is360ModeActive"
        @toggle-360-mode="toggle360Mode"
        @system-click="navigateToSystemDetail"
      />
    </div>
    
    <div class="abnormal-data panel">
      <div class="panel-header">
        <h2 class="panel-title tech-text">异常数据记录</h2>
        <div class="tech-decoration"></div>
      </div>
      <AbnormalDataLog ref="abnormalLogRef" />
    </div>
    
    <div class="footer panel">
      <FooterPanel @generate-abnormal-data="generateAbnormalData" :analysisStep="analysisStep" />
    </div>
    
    <AICenterNotification
      v-if="showCenterNotification"
      :analysisResult="centerAIResult"
      :visible="showCenterNotification"
      :aiRecommendation="aiRecommendation"
      :isProcessing="isProcessingAI"
      :analysisStep="analysisStep"
      :simulatedData="simulatedData"
      :quickAnalysisResult="quickAnalysisResult"
      :isDeepAnalyzing="isDeepAnalyzing"
      @close="handleCenterNotificationClose"
      @system-details="handleCenterSystemDetails"
      @maintenance-assigned="handleMaintenanceAssigned"
      @warning-ignored="handleWarningIgnored"
      @accept-quick-result="handleAcceptQuickResult"
      @request-deep-analysis="handleRequestDeepAnalysis"
    />
  </div>
</template>

<style>
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: auto;
}
</style>

<style scoped>
.dashboard {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(300px, 1fr) minmax(450px, 2fr) minmax(300px, 1fr);
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header header header"
    "sidebar main abnormal-data"
    "footer footer footer";
  gap: 1.5vh;
  box-sizing: border-box;
  padding: 1vh;
  min-height: 100vh;
}

.header {
  grid-area: header;
  z-index: 1;
  padding: 1vh;
  min-height: 85px;
  width: 100%;
  box-sizing: border-box;
}

.sidebar {
  grid-area: sidebar;
  min-width: 300px;
  overflow-y: auto;
  z-index: 1;
  padding: 1vh;
  box-sizing: border-box;
  height: auto;
  min-height: 600px;
}

.main {
  grid-area: main;
  z-index: 1;
  overflow: auto;
  min-width: 450px;
  padding: 1vh;
  box-sizing: border-box;
  min-height: 600px;
  height: auto;
  display: flex;
  flex-direction: column;
}

.abnormal-data {
  grid-area: abnormal-data;
  overflow-y: auto;
  z-index: 1;
  min-width: 300px;
  padding: 1vh;
  box-sizing: border-box;
  min-height: 600px;
  height: auto;
}

.footer {
  grid-area: footer;
  z-index: 1;
  min-height: 70px;
  width: 100%;
  padding: 1vh;
  box-sizing: border-box;
  margin-top: 1vh;
}

.footer.panel {
  border: none;
  box-shadow: none;
}

.panel {
  background: transparent;
  border: 1px solid rgba(64, 128, 255, 0.3);
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(0, 100, 255, 0.15),
              inset 0 0 30px rgba(0, 60, 120, 0.1);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  margin: 0;
  padding: 1.5vh;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5vh;
  padding-bottom: 1vh;
  border-bottom: 1px solid rgba(64, 128, 255, 0.2);
  width: 100%;
}

.panel-title {
  font-size: 1.4rem;
  margin: 0;
  color: #4dabf5;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-shadow: 0 0 10px rgba(77, 171, 245, 0.5);
}

.tech-text {
  font-family: 'Orbitron', sans-serif;
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

/* 响应式布局优化 */
@media (max-width: 1600px) {
  .dashboard {
    grid-template-columns: 300px 1fr 300px;
    grid-template-rows: auto 1fr auto;
  }
  
  .sidebar, .main, .abnormal-data {
    min-height: 550px;
  }
}

@media (max-width: 1200px) {
  .dashboard {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto auto;
    grid-template-areas:
      "header"
      "sidebar"
      "main"
      "abnormal-data"
      "footer";
  }
  
  .sidebar, .main, .abnormal-data {
    min-width: 100%;
    min-height: 450px;
  }
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(64, 128, 255, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(64, 128, 255, 0.5);
}
</style>