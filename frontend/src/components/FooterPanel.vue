<script setup>
import { computed } from 'vue';

// 定义props，接收父组件传递的状态
const props = defineProps({
  analysisStep: {
    type: String,
    required: true,
    default: 'idle' // 'idle', 'simulating', 'analyzing'
  }
});

// 获取当前年份
const currentYear = new Date().getFullYear();

// 触发异常数据生成的事件
const emits = defineEmits(['generate-abnormal-data']);

// 系统类型列表，用于随机选择
const systemTypes = ['traction', 'guidance', 'electrical', 'door'];

// 根据外部状态计算按钮文本
const buttonText = computed(() => {
  switch (props.analysisStep) {
    case 'simulating':
      return '正在模拟异常...';
    case 'analyzing':
      return 'AI正在分析中...';
    default:
      return 'AI模拟异常';
  }
});

// 根据外部状态判断按钮是否禁用
const isButtonDisabled = computed(() => props.analysisStep !== 'idle');

// 点击模拟异常按钮
const handleGenerateAbnormal = () => {
  if (isButtonDisabled.value) return;

  // 随机选择一个系统类型
  const randomIndex = Math.floor(Math.random() * systemTypes.length);
  const selectedSystem = systemTypes[randomIndex];
  
  // 触发生成异常数据事件，传递系统类型
  emits('generate-abnormal-data', selectedSystem);
};
</script>

<template>
  <div class="footer-panel">
    <div class="footer-left">
      <div class="copyright">&copy; {{ currentYear }} 智云梯系统</div>
    </div>
    
    <div class="footer-center">
      <div class="system-status">
        <div class="status-item">
          <span class="status-dot"></span>
          <span class="status-label">数据采集</span>
        </div>
        <div class="status-item">
          <span class="status-dot"></span>
          <span class="status-label">实时监控</span>
        </div>
        <div class="status-item">
          <span class="status-dot"></span>
          <span class="status-label">故障预警</span>
        </div>
      </div>
    </div>
    
    <div class="footer-right">
      <div class="abnormal-controls">
        <button 
          @click="handleGenerateAbnormal" 
          class="simulate-abnormal-btn"
          :class="{ 'active': isButtonDisabled }"
          :disabled="isButtonDisabled"
        >
          <span class="btn-icon">🤖</span>
          {{ buttonText }}
        </button>
      </div>
      <div class="version">版本 1.1.0</div>
    </div>
  </div>
</template>

<style scoped>
.footer-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 100%;
}

.footer-left, .footer-right {
  flex: 1;
}

.footer-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.abnormal-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.simulate-abnormal-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid rgba(0, 150, 136, 0.5);
  background: linear-gradient(45deg, rgba(0, 150, 136, 0.2), rgba(38, 166, 154, 0.3));
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.simulate-abnormal-btn:hover:not(:disabled) {
  background: linear-gradient(45deg, rgba(0, 150, 136, 0.3), rgba(38, 166, 154, 0.4));
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.simulate-abnormal-btn.active {
  background: linear-gradient(45deg, rgba(0, 188, 212, 0.3), rgba(0, 229, 255, 0.4));
  border-color: rgba(0, 188, 212, 0.6);
  animation: pulse 1.5s infinite;
}

.simulate-abnormal-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 16px;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(0, 188, 212, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(0, 188, 212, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(0, 188, 212, 0);
  }
}

.footer-center {
  display: flex;
  justify-content: center;
  flex: 2;
}

.system-status {
  display: flex;
  gap: 20px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #4caf50;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
  position: relative;
}

.status-dot::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: rgba(76, 175, 80, 0.4);
  animation: pulse-dot 2s infinite;
}

@keyframes pulse-dot {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  70% {
    transform: scale(2);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

.status-label {
  font-size: 14px;
  color: #e0e0e0;
}

.copyright, .version {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}
</style>