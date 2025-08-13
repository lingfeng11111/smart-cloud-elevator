<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { abnormalDataApi } from '../api'; // 导入API
import maintenanceApi from '@/api/maintenance' // 导入维护API
// 移除了AuthService和ElMessage的导入，不再需要处理用户操作

// 异常日志数据
const abnormalLogs = ref([]);
const loading = ref(true);
// 移除了processingIds，不再需要处理按钮状态
let refreshTimer = null;

// 从API获取数据
const fetchData = async () => {
  try {
    // 我们只获取最新的几条记录，比如最新的50条
    const response = await abnormalDataApi.getAbnormalData({ current: 1, size: 50 });
    if (response.data.code === 200) {
      // 获取所有维护记录以检查状态
      const maintenanceResponse = await maintenanceApi.getMaintenance({ current: 1, size: 1000 });
      const maintenanceRecords = maintenanceResponse.data.code === 200 ? maintenanceResponse.data.data.records : [];
      
      console.log('异常数据记录:', response.data.data.records);
      console.log('维护记录:', maintenanceRecords);
      
      // 处理后端返回的字段名映射（下划线转驼峰），与MaintenanceLog.vue保持一致
      maintenanceRecords.forEach(record => {
        // 映射字段名：system_name -> systemName, user_id -> userId, mt_data_id -> mtDataId
        if (record.system_name) {
          record.systemName = record.system_name;
        }
        if (record.user_id) {
          record.userId = record.user_id;
        }
        if (record.mt_data_id) {
          record.mtDataId = record.mt_data_id;
        }
        if (record.mt_time) {
          record.mtTime = record.mt_time;
        }
        // 确保status字段存在
        if (!record.status) {
          record.status = '待维护';
        }
      });
      
      abnormalLogs.value = response.data.data.records.map(log => {
        // 根据 aiCode 判断严重等级
        let severity = log.aiCode === 1 ? 'critical' : 'warning';
        
        // 检查是否有对应的维护记录且状态为已维护
        // 尝试多种匹配方式：mtDataId、mt_data_id或直接用ID匹配
        const maintenanceRecord = maintenanceRecords.find(record => {
          const recordMtDataId = record.mtDataId || record.mt_data_id;
          const logDataId = log.mtDataId || log.id;
          return (recordMtDataId === logDataId || record.id === logDataId) && record.status === '已维护';
        });
        
        // 详细调试信息
         console.log(`异常数据ID: ${log.id}, mtDataId: ${log.mtDataId}, 对应维护记录:`, maintenanceRecord);
         if (maintenanceRecords.length > 0) {
           console.log('第一条维护记录的所有字段:', Object.keys(maintenanceRecords[0]));
           console.log('第一条维护记录详细信息:', maintenanceRecords[0]);
         }
        
        return {
          id: log.id,
          mtDataId: log.mtDataId || log.id,
          timestamp: log.createTime,
          systemName: log.systemName,
          systemSqName: log.systemSqName,
          eName: log.eName,
          eData: log.eData,
          aiResult: log.aiResult,
          aiCode: log.aiCode,
          severity: severity,
          message: log.systemSqName, // 使用子系统名称作为消息
          parameters: `异常值: ${log.eData}`, // 显示具体数据
          status: maintenanceRecord ? '已处理' : '未处理' // 基于维护记录状态判断
        };
      });
    }
  } catch (error) {
    console.error("获取异常数据失败:", error);
    // 使用模拟数据作为后备
    abnormalLogs.value = generateMockData();
  } finally {
    loading.value = false;
  }
};

// 生成模拟数据
const generateMockData = () => {
  return [
    {
      id: 1,
      mtDataId: 1,
      systemName: '曳引系统',
      systemSqName: '曳引机',
      eName: '温度异常',
      eData: '95°C',
      aiResult: 'AI检测到曳引机温度过高，建议立即检查散热系统',
      aiCode: 1,
      severity: 'critical',
      timestamp: new Date().toISOString(),
      message: '曳引机',
      parameters: '数据值: 95°C',
      status: '未处理'
    },
    {
      id: 2,
      mtDataId: 2,
      systemName: '门系统',
      systemSqName: '门机',
      eName: '开关门时间',
      eData: '4.5s',
      aiResult: 'AI检测到门机开关时间略长，建议检查门机润滑情况',
      aiCode: 0,
      severity: 'warning',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      message: '门机',
      parameters: '数据值: 4.5s',
      status: '未处理'
    }
  ];
};

// 组件挂载时获取初始数据，并设置定时器刷新
onMounted(() => {
  fetchData();
  // 每30秒刷新一次数据
  refreshTimer = setInterval(fetchData, 30000);
});

// 暴露刷新方法给父组件
defineExpose({ refresh: fetchData });

// 组件卸载时清理定时器
onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});

// 计算严重故障和警告的数量
const criticalCount = computed(() => {
  return abnormalLogs.value.filter(log => log.severity === 'critical' && log.status === '未处理').length;
});

const warningCount = computed(() => {
  return abnormalLogs.value.filter(log => log.severity === 'warning' && log.status === '未处理').length;
});

// 移除了markAsProcessed函数 - 不再支持标记处理功能

// 格式化时间
import { formatDateTime } from '@/utils/date';
const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const s = formatDateTime(timestamp);
  // 仅显示 MM-dd HH:mm
  const short = s.replace(/^\d{4}-/, '').replace(/:\d{2}$/, '');
  return short;
};

// 获取严重等级文本
const getSeverityText = (aiCode) => {
  return aiCode === 1 ? '严重故障' : '警告';
};
</script>

<template>
  <div class="abnormal-data-log">
    <div class="log-header">
      <!-- 移除重复的标题 -->
      <div class="summary-stats">
        <div class="stat-item critical">
          <span class="count">{{ criticalCount }}</span>
          <span class="label">严重故障</span>
        </div>
        <div class="stat-item warning">
          <span class="count">{{ warningCount }}</span>
          <span class="label">警告</span>
        </div>
      </div>
    </div>
    
    <div class="log-content">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="31.416">
              <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
              <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>
        <p>正在获取异常数据...</p>
      </div>
      
      <div v-else-if="abnormalLogs.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <p>系统运行正常，暂无异常数据</p>
      </div>
      
      <div v-else class="log-list">
        <div 
          v-for="log in abnormalLogs" 
          :key="log.id"
          class="log-item ai-card"
          :class="[log.severity, {'processed': log.status === '已处理'}]"
        >
          <div class="card-glow"></div>
          <div class="card-header">
            <div class="severity-indicator" :class="log.severity">
              <div class="severity-icon" :class="log.severity">
                <svg v-if="log.severity === 'critical'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                  <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                  <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <circle cx="12" cy="17" r="1" fill="currentColor"/>
                </svg>
              </div>
              <span class="severity-text">{{ getSeverityText(log.aiCode) }}</span>
            </div>
            <div class="timestamp">{{ formatTime(log.timestamp) }}</div>
          </div>
          
          <div class="card-content">
            <!-- 第一排：系统信息和故障值 -->
            <div class="first-row">
              <div class="system-info">
                <span class="system-name">{{ log.systemName }}</span>
                <span class="component-name" v-if="log.systemSqName">{{ log.systemSqName }}</span>
              </div>
              <div class="error-value">{{ log.parameters }}</div>
            </div>
            
            <!-- 第二排：仅显示状态 -->
            <div class="second-row">
              <div class="status-indicator" v-if="log.status === '已处理'">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>已处理</span>
              </div>
              
              <div class="status-indicator pending" v-else>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>未处理</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.abnormal-data-log {
  background: rgba(16, 20, 28, 0.1);
  border-radius: 16px;
  padding: 24px;
  color: #fff;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(25, 118, 210, 0.3);
  border: 1px solid rgba(25, 118, 210, 0.3);
  overflow: hidden;
  position: relative;
  backdrop-filter: blur(10px);
}

.abnormal-data-log::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0) 50%),
    repeating-linear-gradient(rgba(255, 255, 255, 0.02) 0px, rgba(255, 255, 255, 0) 1px, rgba(255, 255, 255, 0) 4px);
  pointer-events: none;
  border-radius: 16px;
  z-index: -1;
}

.log-header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(25, 118, 210, 0.2);
  position: relative;
}

.log-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(to right, 
    rgba(25, 118, 210, 0), 
    rgba(25, 118, 210, 0.3), 
    rgba(25, 118, 210, 0));
}

/* 移除了重复的标题相关样式 */

.summary-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(25, 118, 210, 0.15);
  min-width: 60px;
  border: 1px solid rgba(25, 118, 210, 0.3);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(5px);
}

.stat-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0) 100%);
  pointer-events: none;
  border-radius: 12px;
  z-index: -1;
}

.stat-item.critical {
  border-color: rgba(244, 67, 54, 0.4);
  background: rgba(244, 67, 54, 0.2);
}

.stat-item.warning {
  border-color: rgba(255, 193, 7, 0.4);
  background: rgba(255, 193, 7, 0.2);
}

.count {
  font-size: 1.8rem;
  font-weight: bold;
  margin-bottom: 4px;
  position: relative;
  z-index: 1;
  text-shadow: 0 0 8px currentColor;
}

.stat-item.critical .count {
  color: #f44336;
}

.stat-item.warning .count {
  color: #ffc107;
}

.label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  position: relative;
  z-index: 1;
}

.log-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
  max-height: 450px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  color: rgba(255, 255, 255, 0.8);
}

.loading-spinner {
  width: 48px;
  height: 48px;
  margin-bottom: 20px;
}

.loading-spinner svg {
  width: 100%;
  height: 100%;
  color: #64b5f6;
}

.loading-state p {
  font-size: 1.1rem;
  margin: 0;
  text-shadow: 0 0 10px rgba(100, 181, 246, 0.3);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  color: rgba(255, 255, 255, 0.6);
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 20px;
  opacity: 0.6;
}

.empty-icon svg {
  width: 100%;
  height: 100%;
  color: #66bb6a;
}

.empty-state p {
  font-size: 1.1rem;
  margin: 0;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-item.ai-card {
  background: rgba(25, 118, 210, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(25, 118, 210, 0.3);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);
  margin-bottom: 0;
}

.log-item.ai-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0) 100%);
  pointer-events: none;
  border-radius: 12px;
  z-index: -1;
}

.card-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0) 100%);
  pointer-events: none;
  border-radius: 12px;
  z-index: -1;
}

.log-item.ai-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3), 0 0 20px rgba(25, 118, 210, 0.4);
  background: rgba(25, 118, 210, 0.15);
}

.log-item.processed {
  opacity: 0.6;
  border-color: rgba(25, 118, 210, 0.2);
  background: rgba(25, 118, 210, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.severity-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.severity-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(25, 118, 210, 0.2);
  border: 1px solid rgba(25, 118, 210, 0.4);
}

.severity-icon svg {
  width: 14px;
  height: 14px;
  color: #64b5f6;
}

.severity-icon.critical {
  background: rgba(244, 67, 54, 0.2);
  border-color: rgba(244, 67, 54, 0.4);
}

.severity-icon.critical svg {
  color: #f44336;
}

.severity-icon.warning {
  background: rgba(255, 193, 7, 0.2);
  border-color: rgba(255, 193, 7, 0.4);
}

.severity-icon.warning svg {
  color: #ffc107;
}

.severity-text {
  font-weight: 600;
  font-size: 0.9rem;
  color: #64b5f6;
}

.severity-indicator.critical .severity-text {
  color: #f44336;
}

.severity-indicator.warning .severity-text {
  color: #ffc107;
}

.timestamp {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Courier New', monospace;
}

.card-content {
  padding: 12px 16px;
}

.first-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.system-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.system-name {
  font-weight: bold;
  color: #64b5f6;
  font-size: 1.1rem;
  text-shadow: 0 0 5px rgba(100, 181, 246, 0.3);
}

.component-name {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.error-value {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  font-weight: bold;
  background: rgba(255, 193, 7, 0.2);
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 193, 7, 0.3);
}

.second-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

/* 移除了不再使用的ai-analysis和card-footer样式 */

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #64b5f6;
  font-size: 0.9rem;
  font-weight: 600;
}

.status-indicator svg {
  width: 18px;
  height: 18px;
}

.status-indicator.pending {
  color: #ffc107;
}

/* 移除了action-buttons和相关按钮样式 - 不再需要处理按钮 */

/* 滚动条样式 */
.log-content::-webkit-scrollbar {
  width: 6px;
}

.log-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.log-content::-webkit-scrollbar-thumb {
  background: rgba(25, 118, 210, 0.4);
  border-radius: 3px;
}

.log-content::-webkit-scrollbar-thumb:hover {
  background: rgba(25, 118, 210, 0.6);
}

/* 动画效果 */
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.log-item.ai-card {
  animation: slideInUp 0.4s ease-out;
}

.log-item.ai-card:nth-child(even) {
  animation-delay: 0.1s;
}

.log-item.ai-card:nth-child(odd) {
  animation-delay: 0.2s;
}
</style>