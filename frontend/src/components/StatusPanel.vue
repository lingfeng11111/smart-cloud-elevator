<script setup>
import { computed } from 'vue';

const props = defineProps({
  elevatorData: {
    type: Object,
    required: true
  }
});

// 计算电梯状态类名
const statusClass = computed(() => {
  return props.elevatorData.status === '运行中' ? 'status-running' : 'status-stopped';
});

// 计算电梯门状态类名
const doorStatusClass = computed(() => {
  return props.elevatorData.doorStatus === '打开' ? 'door-open' : 'door-closed';
});
</script>

<template>
  <div class="status-panel">
    <div class="status-section">
      <div class="section-title">智云梯状态</div>
      <div class="status-display">
        <div class="status-item">
          <div class="status-label">运行状态</div>
          <div class="status-value" :class="statusClass">
            {{ elevatorData.status }}
          </div>
        </div>
        
        <div class="status-item">
          <div class="status-label">门状态</div>
          <div class="status-value" :class="doorStatusClass">
            {{ elevatorData.doorStatus }}
          </div>
        </div>
        
        <div class="status-item">
          <div class="status-label">运行方向</div>
          <div class="status-value">
            <span class="direction-arrow" :class="elevatorData.direction === '上行' ? 'up' : 'down'">
              {{ elevatorData.direction === '上行' ? '↑' : '↓' }}
            </span>
            {{ elevatorData.direction }}
          </div>
        </div>
      </div>
    </div>
    
    <div class="maintenance-section">
      <div class="section-title">维护信息</div>
      <div class="maintenance-info">
        <div class="info-item">
          <div class="info-label">维护状态</div>
          <div class="info-value" :class="elevatorData.maintenanceStatus === '正常' ? 'status-normal' : 'status-warning'">
            {{ elevatorData.maintenanceStatus }}
          </div>
        </div>
        
        <div class="info-item">
          <div class="info-label">上次维护</div>
          <div class="info-value tech-text">
            {{ elevatorData.lastMaintenance }}
          </div>
        </div>
        
        <div class="info-item">
          <div class="info-label">下次维护</div>
          <div class="info-value tech-text">
            {{ new Date(new Date(elevatorData.lastMaintenance).getTime() + 90*24*60*60*1000).toISOString().split('T')[0] }}
          </div>
        </div>
      </div>
    </div>
    
    <div class="alert-section">
      <div class="section-title">告警信息</div>
      <div class="alert-list" v-if="elevatorData.alerts && elevatorData.alerts.length > 0">
        <div class="alert-item" v-for="(alert, index) in elevatorData.alerts" :key="index">
          <div class="alert-icon">⚠️</div>
          <div class="alert-content">
            <div class="alert-title">{{ alert.title }}</div>
            <div class="alert-time">{{ alert.time }}</div>
          </div>
        </div>
      </div>
      <div class="no-alerts" v-else>
        <div class="no-alerts-icon">✓</div>
        <div class="no-alerts-text">系统运行正常，无告警信息</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  overflow-y: auto;
}

.status-section, .maintenance-section, .alert-section {
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

.status-display, .maintenance-info {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.status-item, .info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-label, .info-label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
}

.status-value, .info-value {
  font-size: 1rem;
  color: #fff;
  padding: 4px 10px;
  border-radius: 4px;
  background: rgba(13, 31, 61, 0.7);
}

.status-running {
  color: #4caf50;
}

.status-stopped {
  color: #f44336;
}

.door-open {
  color: #4caf50;
}

.door-closed {
  color: #f44336;
}

.status-normal {
  color: #4caf50;
}

.status-warning {
  color: #ff9800;
}

.direction-arrow {
  display: inline-block;
  margin-right: 5px;
  font-weight: bold;
}

.direction-arrow.up {
  color: #4caf50;
}

.direction-arrow.down {
  color: #f44336;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(244, 67, 54, 0.1);
  border-radius: 4px;
  border-left: 3px solid #f44336;
}

.alert-icon {
  font-size: 1.2rem;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-size: 0.9rem;
  color: #fff;
}

.alert-time {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
}

.no-alerts {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  gap: 10px;
}

.no-alerts-icon {
  font-size: 2rem;
  color: #4caf50;
}

.no-alerts-text {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
}
</style>