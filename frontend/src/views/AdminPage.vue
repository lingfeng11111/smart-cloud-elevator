<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import TechGridBackground from '../components/TechGridBackground.vue';
// import HeaderPanel from '../components/HeaderPanel.vue'; 
import { useAIAnalysis } from '../composables/useAIAnalysis.js';
import aiSimulationApi from '../api/aiSimulation.js'; // 引入API
import AuthService from '../services/authService'; // 引入AuthService
import { maintenanceApi } from '../api';
import abnormalDataApi from '../api/abnormalData';
import { formatDateTime } from '@/utils/date';

const router = useRouter();
const isAIExpanded = ref(false);
const isDetailedAnalysisOpen = ref(false);
const isLoading = ref(false);
const detailedAnalysis = ref('');
const mainAnalysis = ref('点击获取分析'); // 用于存储main字段
const fullMessage = ref(''); // 用于存储message字段
let typingInterval = null; // 用于控制打字机效果的定时器

// 修改AI分析展开状态和获取数据
const toggleAIAnalysis = async () => {
  // 如果已经展开，则只是折叠
  if (isAIExpanded.value) {
    isAIExpanded.value = false;
    return;
  }
  
  // 如果未展开，则展开并请求数据
  isAIExpanded.value = true;
  isLoading.value = true;
  mainAnalysis.value = "正在分析中...";
  
  try {
    const response = await aiSimulationApi.getLifetimeAnalysis();
    console.log('AI寿命预测分析处理后数据:', response);
    
    if (response && response.data) {
      // 确保数据即使是空字符串也能显示有意义的内容
      if (response.data.main || response.data.main === '') {
        mainAnalysis.value = response.data.main || "无主要分析结果";
      } else {
        mainAnalysis.value = "无法获取主要分析结果";
      }
      
      if (response.data.message || response.data.message === '') {
        fullMessage.value = response.data.message || "无详细分析内容";
      } else {
        fullMessage.value = "无法获取详细分析内容";
      }
      
      // 如果数据中没有有意义的内容，提供一个友好的提示
      if (!response.data.main && !response.data.message) {
        mainAnalysis.value = "API返回的数据格式不包含有效的分析结果";
        fullMessage.value = "后端API未返回预期的分析内容，请检查API实现或联系管理员。";
      }
    } else {
      console.error('API返回的数据格式不正确:', response);
      mainAnalysis.value = "获取分析失败: 数据格式不正确";
      fullMessage.value = response ? JSON.stringify(response, null, 2) : "未收到任何响应数据";
    }
  } catch (error) {
    console.error("获取AI寿命分析失败:", error);
    mainAnalysis.value = "获取分析失败，请检查网络";
    fullMessage.value = error.message || "未知错误";
  } finally {
    isLoading.value = false;
  }
};

// 请求详细AI分析
const requestDetailedAnalysis = (event) => {
  // 防止事件冒泡，避免触发父元素的点击事件
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  // 设置面板打开状态
  isDetailedAnalysisOpen.value = true;
  detailedAnalysis.value = ''; // 清空上一次的内容
  
  // 停止上一次可能还在进行的打字机效果
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }

  // 确保面板已经打开并稳定显示
  setTimeout(() => {
    const messageToType = fullMessage.value;
    
    // 处理无内容的情况
    if (!messageToType || messageToType.trim() === '') {
      detailedAnalysis.value = "没有详细分析内容可显示。";
      return;
    }
    
    // 检查是否需要直接显示而不使用打字机效果的情况
    
    // 1. 如果是JSON字符串，格式化显示
    if (messageToType.trim().startsWith('{') && messageToType.trim().endsWith('}')) {
      try {
        const jsonObj = JSON.parse(messageToType);
        detailedAnalysis.value = JSON.stringify(jsonObj, null, 2);
        return; // 如果是JSON，直接显示格式化后的内容，不使用打字机效果
      } catch (e) {
        console.log('不是有效JSON，继续使用打字机效果');
      }
    }
    
    // 2. 如果内容过长(超过1000个字符)，直接显示
    if (messageToType.length > 1000) {
      console.log('内容过长，不使用打字机效果');
      detailedAnalysis.value = messageToType;
      return;
    }

    // 使用变量跟踪面板打开状态，确保面板关闭后不再继续打字效果
    let isPanelOpen = true;
    
    // 使用定时器创建"假流式"打字机效果
    let index = 0;
    typingInterval = setInterval(() => {
      // 再次检查面板是否已关闭，确保不在已关闭的面板上继续添加内容
      if (!isDetailedAnalysisOpen.value) {
        isPanelOpen = false;
        clearInterval(typingInterval);
        typingInterval = null;
        return;
      }
      
      if (index < messageToType.length && isPanelOpen) {
        detailedAnalysis.value += messageToType.charAt(index);
        index++;
        
        // 自动滚动到底部以显示最新内容
        const analysisPanel = document.querySelector('.detailed-content');
        if (analysisPanel) {
          analysisPanel.scrollTop = analysisPanel.scrollHeight;
        }
      } else {
        clearInterval(typingInterval);
        typingInterval = null;
      }
    }, 20); // 快速的间隔时间，使打字效果流畅
  }, 400); // 增加延迟确保面板已经完成打开动画和DOM渲染
};

// 关闭详细分析面板
const closeDetailedAnalysis = (event) => {
  // 防止事件冒泡
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  console.log('关闭详细分析面板');
  // 使用定时器确保动画完成后才重置其他状态
  isDetailedAnalysisOpen.value = false;
  
  // 关闭面板时也停止打字效果
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }
};

// 管理员信息
const adminInfo = {
  name: '系统管理员',
  role: '超级管理员',
  department: '智云梯维护部',
  phone: '138****8888',
  email: 'admin@smartelevator.com',
  lastLogin: '2023-12-20 10:30:45',
  permissions: ['系统配置', '用户管理', '智云梯监控', '维护记录', '报警处理']
};

// 模拟系统信息
const systemInfo = ref({
  version: 'v1.0.0',
  uptime: '2年45天',
  totalSmartElevators: 12,
  activeAlerts: 0,
  pendingMaintenance: 0,
});

// 获取活跃警报和待维护数据
const fetchSystemStatusData = async () => {
  try {
    // 获取活跃警报数据（近一天的警报）
    const alertParams = {
      current: 1,
      size: 1000, // 获取足够多的记录以便计算总数
      // 使用时间范围参数，如果API支持的话
      timeRange: '1d' // 假设API支持这样的参数，实际使用时可能需要调整
    };
    
    const alertResponse = await abnormalDataApi.getAbnormalData(alertParams);
    if (alertResponse.data && alertResponse.data.code === 200) {
      // 计算近一天的警报数量
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      // 过滤出近一天的警报
      const recentAlerts = alertResponse.data.data.records.filter(alert => {
        const alertDate = new Date(formatDateTime(alert.createTime || alert.time));
        return alertDate >= oneDayAgo;
      });
      
      systemInfo.value.activeAlerts = recentAlerts.length;
    }
    
    // 获取待维护数据（状态为未维修的记录）
    const maintenanceParams = {
      current: 1,
      size: 1000,
      status: '未维修' // 假设API支持按状态过滤，实际使用时可能需要调整
    };
    
    const maintenanceResponse = await maintenanceApi.getMaintenance(maintenanceParams);
    if (maintenanceResponse.data && maintenanceResponse.data.code === 200) {
      // 过滤出未维修的记录
      const pendingMaintenance = maintenanceResponse.data.data.records.filter(record => 
        record.status === '未维修'
      );
      
      systemInfo.value.pendingMaintenance = pendingMaintenance.length;
    }
  } catch (error) {
    console.error('获取系统状态数据失败:', error);
  }
};

onMounted(() => {
  // 获取系统状态数据
  fetchSystemStatusData();
});

// AI分析数据
const { aiRecommendation } = useAIAnalysis();

// 快速操作菜单
const quickActions = [
  { name: '系统报表', icon: '📊', route: '/', color: 'rgba(33, 150, 243, 0.3)' },
  { name: '系统关系图', icon: '🔗', route: '/system-relationship-chart', color: 'rgba(139, 92, 246, 0.3)' },
  { name: '用户管理', icon: '👥', route: '/user-management', color: 'rgba(76, 175, 80, 0.3)' },
  { name: '维护记录', icon: '📝', route: '/maintenance-log', color: 'rgba(255, 152, 0, 0.3)' },
  { name: '报警管理', icon: '⚠️', route: '/abnormal-data', color: 'rgba(244, 67, 54, 0.3)' },
];

// 系统健康状态
const systemHealth = computed(() => {
  const total = systemInfo.value.totalSmartElevators;
  const alerts = systemInfo.value.activeAlerts;
  const maintenance = systemInfo.value.pendingMaintenance;
  
  const healthScore = Math.round(((total - alerts - maintenance) / total) * 100);
  
  return {
    score: healthScore,
    status: healthScore > 90 ? '优秀' : healthScore > 75 ? '良好' : healthScore > 60 ? '一般' : '需注意',
    color: healthScore > 90 ? '#4caf50' : healthScore > 75 ? '#2196f3' : healthScore > 60 ? '#ff9800' : '#f44336'
  };
});

// 退出登录
const handleLogout = () => {
  AuthService.logout();
  router.push('/login');
};

// 返回主页
const goToHome = () => {
  router.push('/');
};

// 处理快捷操作点击
const handleQuickActionClick = (route) => {
  router.push(route);
};
</script>

<template>
  <div class="admin-page">
    <TechGridBackground />
    
    <div class="admin-header">
      <div class="back-button" @click="goToHome">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </div>
      <h1 class="admin-title tech-text glow">管理员控制台</h1>
    </div>
    
    <div class="admin-content">
      <div class="admin-container">
        <!-- 管理员资料面板 -->
        <div class="admin-profile panel">
          <div class="panel-header">
            <h3 class="panel-title tech-text">管理员信息</h3>
            <div class="tech-decoration"></div>
          </div>
          
          <div class="profile-content">
            <div class="profile-header">
              <div class="profile-avatar">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div class="profile-basic-info">
                <h2>{{ adminInfo.name }}</h2>
                <div class="role-badge">{{ adminInfo.role }}</div>
                <div class="last-login">上次登录: {{ adminInfo.lastLogin }}</div>
              </div>
            </div>
            
            <div class="profile-details">
              <div class="details-section">
                <h3>个人信息</h3>
                <div class="detail-item">
                  <span class="detail-label">部门:</span>
                  <span class="detail-value">{{ adminInfo.department }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">电话:</span>
                  <span class="detail-value">{{ adminInfo.phone }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">邮箱:</span>
                  <span class="detail-value">{{ adminInfo.email }}</span>
                </div>
              </div>
              
              <div class="details-section">
                <h4 class="actions-title">权限操作</h4>
                <div class="actions-grid">
                  <div class="action-card" @click="handleQuickActionClick('/user-management')">
                    <span class="action-icon">👥</span>
                    <span class="action-text">用户管理</span>
                  </div>
                  <div class="action-card" @click="handleQuickActionClick('/abnormal-data')">
                    <span class="action-icon">🚨</span>
                    <span class="action-text">警报管理</span>
                  </div>
                  <div class="action-card" @click="handleQuickActionClick('/maintenance-log')">
                    <span class="action-icon">🛠️</span>
                    <span class="action-text">维修日志</span>
                  </div>
                  <div class="action-card" @click="handleQuickActionClick('/system-relationship-chart')">
                    <span class="action-icon">📊</span>
                    <span class="action-text">系统总览</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 系统概况面板 -->
        <div class="admin-system panel">
          <div class="panel-header">
            <h3 class="panel-title tech-text">系统概况</h3>
            <div class="tech-decoration"></div>
          </div>
          
          <div class="system-overview">
            <div class="system-health">
              <div class="health-gauge">
                <div class="svg-container">
                  <svg viewBox="0 0 36 36" class="health-chart">
                    <!-- 背景圆环 -->
                    <path class="health-circle-bg"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <!-- 主要进度圆环 -->
                    <path class="health-circle"
                      :stroke="systemHealth.color"
                      :stroke-dasharray="`${systemHealth.score}, 100`"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    >
                      <!-- 添加动画效果 -->
                      <animate attributeName="stroke-dasharray" 
                        :from="`0, 100`" 
                        :to="`${systemHealth.score}, 100`" 
                        dur="1.5s" 
                        begin="0s" 
                        fill="freeze"
                        calcMode="spline"
                        keySplines="0.42, 0, 0.58, 1"
                      />
                    </path>
                    
                    <!-- 进度条末尾的粒子效果 -->
                    <g class="particles">
                      <!-- 计算粒子位置：基于圆的参数方程，根据进度百分比计算角度 -->
                      <circle 
                        :cx="18 + 15.9155 * Math.cos((systemHealth.score / 100 * 360 - 90) * Math.PI / 180)" 
                        :cy="18 + 15.9155 * Math.sin((systemHealth.score / 100 * 360 - 90) * Math.PI / 180)" 
                        r="0.8" 
                        :fill="systemHealth.color" 
                        class="particle particle-1"
                      />
                      <circle 
                        :cx="18 + 15.9155 * Math.cos((systemHealth.score / 100 * 360 - 90) * Math.PI / 180)" 
                        :cy="18 + 15.9155 * Math.sin((systemHealth.score / 100 * 360 - 90) * Math.PI / 180)" 
                        r="0.6" 
                        :fill="systemHealth.color" 
                        class="particle particle-2"
                      />
                      <circle 
                        :cx="18 + 15.9155 * Math.cos((systemHealth.score / 100 * 360 - 90) * Math.PI / 180)" 
                        :cy="18 + 15.9155 * Math.sin((systemHealth.score / 100 * 360 - 90) * Math.PI / 180)" 
                        r="0.4" 
                        :fill="systemHealth.color" 
                        class="particle particle-3"
                      />
                      <circle 
                        :cx="18 + 15.9155 * Math.cos((systemHealth.score / 100 * 360 - 90) * Math.PI / 180)" 
                        :cy="18 + 15.9155 * Math.sin((systemHealth.score / 100 * 360 - 90) * Math.PI / 180)" 
                        r="0.3" 
                        :fill="systemHealth.color" 
                        class="particle particle-4"
                      />
                      <circle 
                        :cx="18 + 15.9155 * Math.cos((systemHealth.score / 100 * 360 - 90) * Math.PI / 180)" 
                        :cy="18 + 15.9155 * Math.sin((systemHealth.score / 100 * 360 - 90) * Math.PI / 180)" 
                        r="0.5" 
                        :fill="systemHealth.color" 
                        class="particle particle-5"
                      />
                    </g>
                  </svg>
                  <div class="health-score-container">
                    <div class="health-score tech-text" :style="{'color': systemHealth.color}">
                      {{ systemHealth.score }}%
                    </div>
                  </div>
                </div>
                <div class="health-status" :style="{'color': systemHealth.color}">
                  系统状态: {{ systemHealth.status }}
                </div>
              </div>
            </div>
            
            <div class="system-info-grid">
              <div class="system-info-item">
                <div class="info-label">系统版本</div>
                <div class="info-value">{{ systemInfo.version }}</div>
              </div>
              <div class="system-info-item">
                <div class="info-label">运行时间</div>
                <div class="info-value">{{ systemInfo.uptime }}</div>
              </div>
              <div class="system-info-item">
                <div class="info-label">智云梯总数</div>
            <div class="info-value">{{ systemInfo.totalSmartElevators }}</div>
              </div>
              <div class="system-info-item">
                <div class="info-label">活跃警报</div>
                <div class="info-value alert">{{ systemInfo.activeAlerts }}</div>
              </div>
              <div class="system-info-item">
                <div class="info-label">待维护</div>
                <div class="info-value warning">{{ systemInfo.pendingMaintenance }}</div>
              </div>
            </div>
            
            <!-- 修改的 AI 分析部分 -->
            <div class="ai-analysis-section" :class="{ 'expanded': isAIExpanded }">
              <div class="ai-header">
                <div class="ai-icon-wrapper">
                  <span class="ai-icon">🤖</span>
                </div>
                <h3 class="ai-title tech-text">智云梯寿命预测分析</h3>
                <button class="ai-predict-button" @click="toggleAIAnalysis">
                  {{ isAIExpanded ? '收起' : '获取AI预测' }}
                </button>
              </div>
              
              <div class="ai-content" v-if="isAIExpanded">
                <div class="ai-summary">
                  <p v-if="isLoading">正在分析中...</p>
                  <p v-else>{{ mainAnalysis }}</p>
                </div>
                <div class="ai-actions">
                  <button class="action-btn detail-btn" @click="(e) => requestDetailedAnalysis(e)">
                    详细分析 ►
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 详细分析滑出面板 -->
    <div class="detailed-analysis-panel" :class="{ 'panel-open': isDetailedAnalysisOpen }" @click.stop>
      <div class="panel-header">
        <h3 class="panel-title tech-text">AI 深度分析报告</h3>
        <button class="close-button" @click="(e) => { e.stopPropagation(); closeDetailedAnalysis(e); }">✕</button>
      </div>
      
      <div class="panel-content">
        <div v-if="isLoading" class="ai-loading">
          <div class="spinner"></div>
          <span>生成深度分析中...</span>
        </div>
        <div v-else class="detailed-content">
          <pre class="analysis-text">{{ detailedAnalysis }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  width: 100%;
  padding: 1.5vh;
  box-sizing: border-box;
  position: relative;
  background: transparent;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5vh 2vw;
  margin-bottom: 4vh; /* 从2vh增加到4vh，增大底部外边距 */
  position: relative;
}

.admin-content {
  padding: 0;
  box-sizing: border-box;
  margin-top: 3vh; /* 增加上边距，让内容往下移 */
}

.admin-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: minmax(min-content, max-content);
  grid-template-areas:
    "profile system";
  gap: 2vh;
}

.admin-profile {
  grid-area: profile;
}

.admin-system {
  grid-area: system;
}

.panel {
  background: rgba(13, 31, 61, 0.2);
  border: 1px solid rgba(30, 144, 255, 0.6);
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(33, 150, 243, 0.3);
  backdrop-filter: blur(1px);
  padding: 2vh;
  overflow: visible;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  height: auto;
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, transparent, #2196f3, transparent);
}

.panel:hover {
  box-shadow: 0 0 25px rgba(33, 150, 243, 0.4);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5vh;
  padding-bottom: 1vh;
  border-bottom: 1px solid rgba(33, 150, 243, 0.3);
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

.tech-text {
  font-family: 'Orbitron', sans-serif;
}

/* 管理员资料样式 */
.profile-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.profile-header {
  display: flex;
  margin-bottom: 2vh;
  padding-bottom: 2vh;
  border-bottom: 1px solid rgba(33, 150, 243, 0.3);
}

.profile-avatar {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(33, 150, 243, 0.1);
  border-radius: 50%;
  margin-right: 20px;
  color: #4dabf5;
  box-shadow: 0 0 15px rgba(33, 150, 243, 0.3);
}

.profile-basic-info {
  flex: 1;
}

.profile-basic-info h2 {
  margin: 0 0 10px 0;
  font-size: 1.5rem;
  color: var(--text-color);
}

.role-badge {
  display: inline-block;
  padding: 5px 10px;
  background: rgba(33, 150, 243, 0.1);
  color: #4dabf5;
  border-radius: 20px;
  font-size: 0.9rem;
  margin-bottom: 5px;
  border: 1px solid rgba(33, 150, 243, 0.3);
}

.last-login {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.profile-details {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
}

.details-section h3 {
  margin: 0 0 15px 0;
  font-size: 1.1rem;
  color: var(--text-secondary);
  border-bottom: 1px solid rgba(33, 150, 243, 0.2);
  padding-bottom: 5px;
}

.detail-item {
  display: flex;
  margin-bottom: 10px;
}

.detail-label {
  width: 80px;
  color: var(--text-secondary);
}

.detail-value {
  flex: 1;
  color: var(--text-color);
}

.permissions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 系统概况样式 */
.system-overview {
  display: flex;
  flex-direction: column;
  gap: 1.5vh;
  flex: 1;
}

.system-health {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5vh;
  padding-bottom: 0.5vh;
  width: 100%;
}

.health-gauge {
  width: 100%;
  max-width: 280px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.svg-container {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
}

.health-chart {
  width: 100%;
  height: 100%;
  position: relative;
}

.health-circle-bg {
  fill: none;
  stroke: rgba(33, 150, 243, 0.1);
  stroke-width: 2.5;
}

.health-circle {
  fill: none;
  stroke-width: 2.5;
  stroke-linecap: round;
}

.health-score-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.health-score {
  font-size: 2.5rem;
  font-weight: 700;
  position: relative;
  z-index: 2;
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  transition: color 0.5s ease;
}

.health-status {
  font-size: 1.2rem;
  font-weight: 600;
  text-align: center;
  width: 100%;
  margin-top: 10px;
  transition: color 0.5s ease;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}

/* 粒子动画 */
.particle {
  opacity: 0.8;
  transform-origin: center;
}

.particle-1 {
  animation: particle-float 3s infinite ease-out;
}

.particle-2 {
  animation: particle-float 2.5s 0.2s infinite ease-out;
}

.particle-3 {
  animation: particle-float 2.8s 0.4s infinite ease-out;
}

.particle-4 {
  animation: particle-float 3.2s 0.1s infinite ease-out;
}

.particle-5 {
  animation: particle-float 2.7s 0.3s infinite ease-out;
}

@keyframes particle-float {
  0% {
    transform: translate(0, 0);
    opacity: 0.8;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    transform: translate(
      calc(var(--random-x, 1) * 3px),
      calc(var(--random-y, -1) * 3px)
    );
    opacity: 0;
  }
}

.system-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 0.8vh;
  flex: 1;
}

.system-info-item {
  background: rgba(13, 31, 61, 0.4);
  border-radius: 8px;
  padding: 0.5vh;
  text-align: center;
  transition: all 0.3s;
  border: 1px solid rgba(33, 150, 243, 0.2);
  display: flex;
  flex-direction: column;
  height: auto;
  min-height: 0;
  justify-content: center;
}

.system-info-item:hover {
  background: rgba(13, 31, 61, 0.6);
  transform: translateY(-2px);
}

.info-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.2vh;
}

.info-value {
  font-size: 1rem;
  color: #4dabf5;
  font-weight: 600;
  line-height: 1;
  padding-bottom: 0.2vh;
}

.info-value.alert {
  color: #f44336;
}

.info-value.warning {
  color: #ff9800;
}

/* 修改 AI 分析部分的样式 */
.ai-analysis-section {
  margin-top: 2vh;
  border-top: 1px solid rgba(33, 150, 243, 0.3);
  padding-top: 2vh;
  transition: all 0.3s ease-in-out;
}

.ai-analysis-section.expanded {
  height: auto;
  padding-bottom: 2vh;
}

.ai-header {
  display: flex;
  align-items: center;
  background: rgba(33, 150, 243, 0.05);
  padding: 1.5vh 1.5vw;
  border-radius: 8px;
  transition: all 0.3s;
  border: 1px solid rgba(33, 150, 243, 0.3);
}

.ai-header:hover {
  background: rgba(33, 150, 243, 0.1);
}

.ai-icon-wrapper {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(33, 150, 243, 0.1);
  border-radius: 50%;
  margin-right: 15px;
  color: #4dabf5;
  box-shadow: 0 0 10px rgba(33, 150, 243, 0.2);
}

.ai-icon {
  font-size: 1.8rem;
}

.ai-title {
  flex: 1;
  font-weight: 500;
  color: #4dabf5;
  font-size: 1rem;
  margin: 0;
}

.ai-predict-button {
  background: rgba(33, 150, 243, 0.2);
  border: 1px solid rgba(33, 150, 243, 0.4);
  border-radius: 4px;
  color: #4dabf5;
  padding: 0.7vh 1.2vw;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  box-shadow: 0 0 5px rgba(33, 150, 243, 0.2);
}

.ai-predict-button:hover {
  background: rgba(33, 150, 243, 0.3);
  box-shadow: 0 0 8px rgba(33, 150, 243, 0.3);
  transform: translateY(-2px);
}

.ai-content {
  margin-top: 1.5vh;
  background: rgba(33, 150, 243, 0.05);
  border-radius: 8px;
  padding: 1.5vh;
  border: 1px solid rgba(33, 150, 243, 0.2);
  max-height: 50vh;
  overflow-y: auto;
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.ai-summary {
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: pre-wrap;
  color: var(--text-color);
  margin-bottom: 1.5vh;
  word-break: break-word; /* 允许单词换行 */
}

.ai-actions {
  display: flex;
  justify-content: flex-end;
}

.action-btn {
  display: flex;
  align-items: center;
  background: rgba(33, 150, 243, 0.2);
  color: #4dabf5;
  border: 1px solid rgba(33, 150, 243, 0.4);
  border-radius: 4px;
  padding: 0.8vh 1.5vw;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:hover {
  background: rgba(33, 150, 243, 0.3);
}

.button-icon {
  margin-left: 8px;
  font-size: 0.7rem;
}

/* 加载动画 */
.ai-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #4dabf5;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(33, 150, 243, 0.2);
  border-top-color: #4dabf5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 详细分析滑出面板 */
.detailed-analysis-panel {
  position: fixed;
  top: 0;
  right: -600px;
  width: 500px;
  max-width: 90vw;
  height: 100vh;
  background: rgba(13, 31, 61, 0.95);
  border-left: 1px solid rgba(33, 150, 243, 0.6);
  box-shadow: -5px 0 25px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  transition: right 0.4s cubic-bezier(0.19, 1, 0.22, 1); /* 使用更平滑的缓动函数 */
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
  overflow: hidden; /* 防止内容溢出 */
  will-change: right; /* 提示浏览器进行优化 */
}

.detailed-analysis-panel.panel-open {
  right: 0;
  pointer-events: auto; /* 确保面板打开时可以接收交互事件 */
}

  .panel-header {
  padding: 25px;
  border-bottom: 1px solid rgba(33, 150, 243, 0.3);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detailed-analysis-panel .panel-title {
  font-size: 1.8rem; /* 增大标题字体 */
  margin: 0;
  color: #4dabf5;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-shadow: 0 0 10px rgba(77, 171, 245, 0.5);
}

.close-button {
  background: none;
  border: none;
  color: #4dabf5;
  font-size: 2rem; /* 增大关闭按钮 */
  cursor: pointer;
  transition: color 0.2s, transform 0.2s;
  padding: 10px;
  margin: -10px;
}

.close-button:hover {
  color: #ffffff;
  transform: scale(1.1); /* 悬停时轻微放大 */
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 25px; /* 增大内边距 */
  background-color: rgba(13, 31, 61, 0.3); /* 轻微背景色 */
}

.detailed-content {
  color: var(--text-color);
  height: 100%;
  overflow-y: auto;
  padding: 10px 5px;
  font-size: 1.2rem; /* 匹配分析文本的大小 */
}

.analysis-text {
  white-space: pre-wrap;
  font-family: 'Courier New', monospace;
  font-size: 1.2rem; /* 增大字体大小 */
  line-height: 1.8; /* 适当增加行高 */
  color: #e0e0ff;
  padding: 15px; /* 增大内边距 */
  background-color: rgba(13, 31, 61, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(77, 171, 245, 0.3);
  width: 100%;
  box-sizing: border-box;
  overflow-x: auto;
  margin-top: 10px; /* 增加与面板顶部的距离 */
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .detailed-analysis-panel {
    width: 450px;
  }
}

@media (max-width: 768px) {
  .detailed-analysis-panel {
    width: 100%;
  }
}

/* 面板底部样式 */
.panel-footer {
  margin-top: 1vh;
  text-align: center;
}

.view-more-button {
  background: rgba(33, 150, 243, 0.1);
  color: #4dabf5;
  border: 1px solid rgba(33, 150, 243, 0.3);
  border-radius: 4px;
  padding: 0.5vh 1vw;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
}

.view-more-button:hover {
  background: rgba(33, 150, 243, 0.2);
}

/* 登出按钮样式 */
.logout-button {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 4px;
  padding: 0.5vh 1vw;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
}

.logout-button:hover {
  background: rgba(244, 67, 54, 0.2);
}

.logout-button svg {
  margin-right: 5px;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: rgba(33, 150, 243, 0.3);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(33, 150, 243, 0.5);
}

/* 响应式布局 */
@media (max-width: 1600px) {
  .admin-container {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 1200px) {
  .admin-container {
    grid-template-columns: 1fr;
    grid-template-areas:
      "profile"
      "system";
  }
}

@media (max-width: 768px) {
  .admin-header {
    flex-direction: column;
    gap: 1vh;
  }
  
  .back-button {
    align-self: flex-start;
  }
}

.admin-title {
  font-size: 2rem;
  color: #4dabf5;
  margin: 0;
  background: linear-gradient(90deg, #4dabf5, #2196f3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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

/* 快速操作样式 */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5vh;
}

.action-card {
  background: var(--card-color, rgba(33, 150, 243, 0.1));
  border-radius: 10px;
  padding: 1.5vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.action-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transform: translateY(5px);
  transition: transform 0.3s;
}

.action-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.action-card:hover::after {
  transform: translateY(0);
}

.action-icon {
  font-size: 2rem;
  margin-bottom: 1vh;
}

.action-text {
  font-size: 1rem;
  color: var(--text-color);
  font-weight: 500;
}

.actions-title {
  font-size: 1.1rem;
  color: #a9a9a9;
  margin-top: 30px;
  margin-bottom: 15px;
  font-weight: 500;
}
</style>