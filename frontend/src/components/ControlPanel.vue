<script setup>
import { ref } from 'vue';
import elevatorSocketService from '../services/elevatorSocketService';

const props = defineProps({
  elevatorData: {
    type: Object,
    required: true
  }
});

// 楼层按钮列表
const floorButtons = ref([]);
for (let i = 1; i <= props.elevatorData.floorCount; i++) {
  floorButtons.value.push(i);
}

// 设置目标楼层
const setTargetFloor = (floor) => {
  elevatorSocketService.goToFloor(props.elevatorData.id, floor);
};

// 紧急停止/恢复
const handleEmergencyStop = () => {
  if (props.elevatorData.status === '已停止') {
    elevatorSocketService.resumeOperation(props.elevatorData.id);
  } else {
    elevatorSocketService.emergencyStop(props.elevatorData.id);
  }
};

// 开关门
const toggleDoor = () => {
  if (props.elevatorData.status === '停止') {
    elevatorSocketService.toggleDoor(props.elevatorData.id);
  }
};
</script>

<template>
  <div class="control-panel">
    <div class="control-section">
      <div class="section-title">楼层选择</div>
      <div class="floor-buttons">
        <button 
          v-for="floor in floorButtons" 
          :key="floor"
          class="floor-button tech-text"
          :class="{
            'active': floor === elevatorData.targetFloor,
            'current': floor === elevatorData.currentFloor
          }"
          @click="setTargetFloor(floor)"
        >
          {{ floor }}
        </button>
      </div>
    </div>
    
    <div class="control-section">
      <div class="section-title">智云梯控制</div>
      <div class="action-buttons">
        <button 
          class="action-button door-button"
          :disabled="elevatorData.status !== '停止'"
          @click="toggleDoor()"
        >
          <span class="button-icon">🚪</span>
          <span class="button-text">{{ elevatorData.doorStatus === '关闭' ? '开门' : '关门' }}</span>
        </button>
        
        <button 
          class="action-button emergency-button"
          @click="handleEmergencyStop()"
        >
          <span class="button-icon">⚠️</span>
          <span class="button-text">{{ elevatorData.status === '已停止' ? '恢复运行' : '紧急停止' }}</span>
        </button>
      </div>
    </div>
    
    <div class="control-section">
      <div class="section-title">系统状态</div>
      <div class="status-indicators">
        <div class="status-item">
          <div class="status-label">载重</div>
          <div class="status-bar-container">
            <div 
              class="status-bar" 
              :style="{ width: `${(elevatorData.loadWeight / elevatorData.maxWeight) * 100}%` }"
              :class="{
                'warning': elevatorData.loadWeight > elevatorData.maxWeight * 0.8,
                'danger': elevatorData.loadWeight > elevatorData.maxWeight * 0.95
              }"
            ></div>
          </div>
          <div class="status-value tech-text">
            {{ elevatorData.loadWeight }}kg / {{ elevatorData.maxWeight }}kg
          </div>
        </div>
        
        <div class="status-item">
          <div class="status-label">温度</div>
          <div class="status-value tech-text">
            {{ elevatorData.temperature }}°C
          </div>
        </div>
        
        <div class="status-item">
          <div class="status-label">维护状态</div>
          <div class="status-value" :class="elevatorData.maintenanceStatus === '正常' ? 'status-normal' : 'status-warning'">
            {{ elevatorData.maintenanceStatus }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.control-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  overflow-y: auto;
  position: relative;
  z-index: 1;
}

.control-section {
  background: transparent; /* 完全移除背景色 */
  border-radius: 8px;
  padding: 15px;
  border: 1px solid rgba(33, 150, 243, 0.3);
  box-shadow: 0 0 10px rgba(33, 150, 243, 0.2);
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

.floor-buttons {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.floor-button {
  background: rgba(13, 31, 61, 0.5);
  border: 1px solid #1e88e5;
  color: #fff;
  border-radius: 4px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.floor-button:hover {
  background: rgba(33, 150, 243, 0.3);
  box-shadow: 0 0 10px rgba(33, 150, 243, 0.5);
}

.floor-button.active {
  background: #1e88e5;
  box-shadow: 0 0 15px rgba(33, 150, 243, 0.7);
}

.floor-button.current {
  border: 2px solid #4caf50;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(13, 31, 61, 0.5);
  border: 1px solid #1e88e5;
  color: #fff;
  border-radius: 4px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-button:hover:not(:disabled) {
  background: rgba(33, 150, 243, 0.3);
  box-shadow: 0 0 10px rgba(33, 150, 243, 0.5);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button-icon {
  font-size: 1.2rem;
}

.door-button {
  border-color: #4dabf5;
}

.emergency-button {
  border-color: #f44336;
}

.status-indicators {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.status-label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
}

.status-value {
  font-size: 1rem;
  color: #fff;
}

.status-bar-container {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.status-bar {
  height: 100%;
  background: #2196f3;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.status-bar.warning {
  background: #ff9800;
}

.status-bar.danger {
  background: #f44336;
}

.status-normal {
  color: #4caf50;
}

.status-warning {
  color: #ff9800;
}
</style>