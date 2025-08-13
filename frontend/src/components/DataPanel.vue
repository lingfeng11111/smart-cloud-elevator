<script setup>
import { computed } from 'vue';

const props = defineProps({
  elevatorData: {
    type: Object,
    required: true
  }
});

// 计算负载百分比
const loadPercentage = computed(() => {
  return Math.round((props.elevatorData.loadWeight / props.elevatorData.maxWeight) * 100);
});

// 计算能耗状态
const energyStatus = computed(() => {
  const consumption = props.elevatorData.energyConsumption;
  if (consumption < 40) return '优秀';
  if (consumption < 50) return '良好';
  return '偏高';
});

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
</script>

<template>
  <div class="data-panel">
    <div class="data-grid">
      <div class="grid-item">
        <div class="data-label">运行速度</div>
        <div class="data-value tech-text">{{ elevatorData.speed }} m/s</div>
      </div>
      
      <div class="grid-item">
        <div class="data-label">当前载重</div>
        <div class="data-value tech-text">{{ loadPercentage }}%</div>
        <div class="load-indicator">
          <div 
            class="load-bar" 
            :style="{ width: `${loadPercentage}%` }"
            :class="{
              'warning': loadPercentage > 80,
              'danger': loadPercentage > 95
            }"
          ></div>
        </div>
      </div>
      
      <div class="grid-item">
        <div class="data-label">能耗</div>
        <div class="data-value tech-text">{{ elevatorData.energyConsumption }} kWh</div>
        <div class="energy-status" :class="{
          'status-good': energyStatus === '优秀',
          'status-normal': energyStatus === '良好',
          'status-warning': energyStatus === '偏高'
        }">{{ energyStatus }}</div>
      </div>
      
      <div class="grid-item">
        <div class="data-label">运行时间</div>
        <div class="data-value tech-text">{{ elevatorData.operatingHours }} 小时</div>
      </div>
      
      <div class="grid-item">
        <div class="data-label">总行程数</div>
        <div class="data-value tech-text">{{ elevatorData.totalTrips }}</div>
      </div>
      
      <div class="grid-item">
        <div class="data-label">上次维护</div>
        <div class="data-value tech-text">{{ formatDate(elevatorData.lastMaintenance) }}</div>
      </div>
    </div>
    
    <div class="performance-section">
      <div class="section-title">性能指标</div>
      <div class="performance-chart">
        <!-- 这里可以添加性能图表，如使用ECharts等 -->
        <div class="chart-placeholder">
          <div class="chart-bar" style="height: 60%;"></div>
          <div class="chart-bar" style="height: 80%;"></div>
          <div class="chart-bar" style="height: 40%;"></div>
          <div class="chart-bar" style="height: 70%;"></div>
          <div class="chart-bar" style="height: 90%;"></div>
        </div>
      </div>
    </div>
    
    <div class="alerts-section">
      <div class="section-title">系统状态</div>
      <div class="system-status">
        <div class="status-item">
          <div class="status-indicator online"></div>
          <div class="status-text">系统在线</div>
        </div>
        <div class="status-item">
          <div class="status-indicator normal"></div>
          <div class="status-text">运行正常</div>
        </div>
        <div class="status-item">
          <div class="status-indicator normal"></div>
          <div class="status-text">网络连接</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.data-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  overflow-y: auto;
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.grid-item {
  background: rgba(7, 19, 39, 0.5);
  border-radius: 5px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(33, 150, 243, 0.2);
}

.data-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  margin-bottom: 5px;
}

.data-value {
  font-size: 1.2rem;
  color: #2196f3;
  margin-bottom: 5px;
}

.load-indicator {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 5px;
}

.load-bar {
  height: 100%;
  background: #2196f3;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.load-bar.warning {
  background: #ff9800;
}

.load-bar.danger {
  background: #f44336;
}

.energy-status {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 10px;
  margin-top: 5px;
}

.status-good {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.status-normal {
  background: rgba(255, 152, 0, 0.2);
  color: #ff9800;
}

.status-warning {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
}

.performance-section, .alerts-section {
  background: rgba(7, 19, 39, 0.5);
  border-radius: 8px;
  padding: 15px;
  border: 1px solid rgba(33, 150, 243, 0.2);
}

.section-title {
  font-size: 0.9rem;
  color: #4dabf5;
  margin-bottom: 15px;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(33, 150, 243, 0.2);
  padding-bottom: 5px;
}

.performance-chart {
  height: 100px;
}

.chart-placeholder {
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 10px;
}

.chart-bar {
  width: 15%;
  background: linear-gradient(to top, #1e88e5, #90caf9);
  border-radius: 3px 3px 0 0;
}

.system-status {
  display: flex;
  justify-content: space-between;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-indicator.online {
  background: #4caf50;
  box-shadow: 0 0 5px #4caf50;
}

.status-indicator.normal {
  background: #2196f3;
  box-shadow: 0 0 5px #2196f3;
}

.status-indicator.warning {
  background: #ff9800;
  box-shadow: 0 0 5px #ff9800;
}

.status-text {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.9);
}
</style>