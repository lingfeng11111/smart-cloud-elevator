<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import AuthService from '../services/authService';

const router = useRouter();
const showAdminProfile = ref(false);
const currentTime = ref(new Date().toLocaleTimeString());
const currentDate = ref(new Date().toLocaleDateString('zh-CN', {year: 'numeric', month: 'numeric', day: 'numeric'}));

let timeInterval;

// 更新时间函数
const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString();
  currentDate.value = now.toLocaleDateString('zh-CN', {year: 'numeric', month: 'numeric', day: 'numeric'});
};

onMounted(() => {
  // 每秒更新一次时间
  timeInterval = setInterval(updateTime, 1000);
  
  // 初始化SVG路径动画
  initCircuitAnimation();
});

onBeforeUnmount(() => {
  // 清除定时器
  if (timeInterval) {
    clearInterval(timeInterval);
  }
});

// 初始化SVG电路动画
const initCircuitAnimation = () => {
  // 获取所有的电路路径
  const paths = document.querySelectorAll('.circuit-path');
  
  // 为每个路径设置动画
  paths.forEach(path => {
    const length = path.getTotalLength();
    
    // 设置初始状态
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;
    
    // 触发布局计算
    path.getBoundingClientRect();
    
    // 设置动画
    path.style.transition = `stroke-dashoffset ${2 + Math.random() * 3}s ease-in-out ${Math.random() * 2}s`;
    path.style.strokeDashoffset = '0';
  });
  
  // 为节点设置脉冲动画
  const nodes = document.querySelectorAll('.circuit-node');
  nodes.forEach(node => {
    node.style.animation = `pulse ${1.5 + Math.random() * 2}s infinite alternate ${Math.random() * 1}s`;
  });
};

const props = defineProps({
  elevatorId: {
    type: String,
    required: true
  }
});

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

const toggleAdminProfile = () => {
  showAdminProfile.value = !showAdminProfile.value;
};

const handleLogout = async () => {
  try {
    await AuthService.logout();
    router.push('/login');
  } catch (error) {
    console.error('登出失败:', error);
    // 即使登出失败，也跳转到登录页
    router.push('/login');
  }
};

// 跳转到管理员页面
const goToAdminPage = () => {
  console.log('跳转到管理员页面');
  router.push('/admin');
};
</script>

<template>
  <div class="header-container">
    <!-- 左侧电路图SVG -->
    <div class="circuit-decoration left">
      <svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
        <!-- 水平主干线 -->
        <path class="circuit-path main-line" d="M10,30 L180,30" stroke="#1E90FF" stroke-width="1.5" fill="none"/>
        
        <!-- 垂直连接线1 -->
        <path class="circuit-path" d="M40,30 L40,10 L60,10" stroke="#1E90FF" stroke-width="1.5" fill="none"/>
        
        <!-- 垂直连接线2 -->
        <path class="circuit-path" d="M80,30 L80,45 L120,45" stroke="#1E90FF" stroke-width="1.5" fill="none"/>
        
        <!-- 垂直连接线3 -->
        <path class="circuit-path" d="M140,30 L140,15 L170,15" stroke="#1E90FF" stroke-width="1.5" fill="none"/>
        
        <!-- 对角线 -->
        <path class="circuit-path" d="M100,30 L120,10" stroke="#1E90FF" stroke-width="1.5" fill="none"/>
        
        <!-- 复杂路径1 - 电路板形状 -->
        <path class="circuit-path complex" d="M20,20 Q25,15 30,20 T40,20 L50,20 Q55,20 55,15 T60,10 L70,10" 
              stroke="#1E90FF" stroke-width="1" fill="none"/>
        
        <!-- 复杂路径2 - 电路板形状 -->
        <path class="circuit-path complex" d="M110,45 Q120,55 130,45 T150,40 L160,40" 
              stroke="#1E90FF" stroke-width="1" fill="none"/>
        
        <!-- 流动效果路径 - 仅水平方向 -->
        <path class="circuit-flow" d="M10,30 L180,30" stroke="url(#flow-gradient-left)" stroke-width="2" fill="none"/>
        
        <!-- 数据包动画 - 仅水平方向 -->
        <circle class="data-packet" cx="30" cy="30" r="2" fill="#ffffff"/>
        <circle class="data-packet" cx="90" cy="30" r="2" fill="#ffffff"/>
        <circle class="data-packet" cx="150" cy="30" r="2" fill="#ffffff"/>
        
        <!-- 旋转装饰元素 -->
        <g class="rotating-element" transform="translate(60, 10)">
          <rect x="-3" y="-3" width="6" height="6" fill="none" stroke="#a0cfff" stroke-width="1" rx="1"/>
        </g>
        <g class="rotating-element" transform="translate(120, 45)">
          <rect x="-3" y="-3" width="6" height="6" fill="none" stroke="#a0cfff" stroke-width="1" rx="1"/>
        </g>
        
        <!-- 脉冲波纹 - 仅水平方向节点 -->
        <circle class="pulse-wave" cx="40" cy="30" r="3" fill="none" stroke="#1E90FF" stroke-width="0.5"/>
        <circle class="pulse-wave" cx="100" cy="30" r="3" fill="none" stroke="#1E90FF" stroke-width="0.5"/>
        <circle class="pulse-wave" cx="140" cy="30" r="3" fill="none" stroke="#1E90FF" stroke-width="0.5"/>
        
        <!-- 装饰元素 - 小方块 -->
        <rect class="circuit-element" x="60" y="8" width="4" height="4" fill="#1E90FF" rx="1"/>
        <rect class="circuit-element" x="120" y="43" width="4" height="4" fill="#1E90FF" rx="1"/>
        <rect class="circuit-element" x="170" y="13" width="4" height="4" fill="#1E90FF" rx="1"/>
        
        <!-- 节点 -->
        <circle class="circuit-node" cx="40" cy="30" r="3" fill="#1E90FF"/>
        <circle class="circuit-node" cx="80" cy="30" r="3" fill="#1E90FF"/>
        <circle class="circuit-node" cx="100" cy="30" r="3" fill="#1E90FF"/>
        <circle class="circuit-node" cx="140" cy="30" r="3" fill="#1E90FF"/>
        <circle class="circuit-node" cx="60" cy="10" r="3" fill="#1E90FF"/>
        <circle class="circuit-node" cx="120" cy="45" r="3" fill="#1E90FF"/>
        <circle class="circuit-node" cx="120" cy="10" r="3" fill="#1E90FF"/>
        <circle class="circuit-node" cx="170" cy="15" r="3" fill="#1E90FF"/>
        
        <!-- 闪烁节点 -->
        <circle class="circuit-node blink" cx="20" cy="30" r="2" fill="#64B5F6"/>
        <circle class="circuit-node blink" cx="160" cy="30" r="2" fill="#64B5F6"/>
        <circle class="circuit-node blink" cx="70" cy="10" r="2" fill="#64B5F6"/>
        <circle class="circuit-node blink" cx="160" cy="40" r="2" fill="#64B5F6"/>
        
        <!-- 渐变定义 - 从左向右流动 -->
        <defs>
          <linearGradient id="flow-gradient-left" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="rgba(30, 144, 255, 0)"/>
            <stop offset="50%" stop-color="rgba(30, 144, 255, 0.8)"/>
            <stop offset="100%" stop-color="rgba(30, 144, 255, 0)"/>
            <animate attributeName="x1" from="-100%" to="100%" dur="3s" repeatCount="indefinite"/>
            <animate attributeName="x2" from="0%" to="200%" dur="3s" repeatCount="indefinite"/>
          </linearGradient>
          
          <!-- 颜色变化动画 -->
          <linearGradient id="color-change-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#1E90FF">
              <animate attributeName="stop-color" values="#1E90FF; #ffffff; #1E90FF" dur="5s" repeatCount="indefinite"/>
            </stop>
            <stop offset="100%" stop-color="#64B5F6">
              <animate attributeName="stop-color" values="#64B5F6; #a0cfff; #64B5F6" dur="5s" repeatCount="indefinite"/>
            </stop>
          </linearGradient>
        </defs>
      </svg>
    </div>
    
    <div class="header-panel">
      <div class="system-title-container">
        <h1 class="system-title">智云梯驾驶舱</h1>
        <div class="subtitle">Smart Cloud Elevator Cockpit</div>
        <div class="datetime-display">
          <div class="time-display tech-text">{{ currentTime }}</div>
        </div>
      </div>
    </div>
    
    <!-- 右侧电路图SVG -->
    <div class="circuit-decoration right">
      <svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
        <!-- 水平主干线 -->
        <path class="circuit-path main-line" d="M10,30 L180,30" stroke="#1E90FF" stroke-width="1.5" fill="none"/>
        
        <!-- 垂直连接线1 -->
        <path class="circuit-path" d="M40,30 L40,10 L60,10" stroke="#1E90FF" stroke-width="1.5" fill="none"/>
        
        <!-- 垂直连接线2 -->
        <path class="circuit-path" d="M80,30 L80,45 L120,45" stroke="#1E90FF" stroke-width="1.5" fill="none"/>
        
        <!-- 垂直连接线3 -->
        <path class="circuit-path" d="M140,30 L140,15 L170,15" stroke="#1E90FF" stroke-width="1.5" fill="none"/>
        
        <!-- 对角线 -->
        <path class="circuit-path" d="M100,30 L120,10" stroke="#1E90FF" stroke-width="1.5" fill="none"/>
        
        <!-- 复杂路径1 - 电路板形状 -->
        <path class="circuit-path complex" d="M20,20 Q25,15 30,20 T40,20 L50,20 Q55,20 55,15 T60,10 L70,10" 
              stroke="#1E90FF" stroke-width="1" fill="none"/>
        
        <!-- 复杂路径2 - 电路板形状 -->
        <path class="circuit-path complex" d="M110,45 Q120,55 130,45 T150,40 L160,40" 
              stroke="#1E90FF" stroke-width="1" fill="none"/>
        
        <!-- 流动效果路径 - 仅水平方向 -->
        <path class="circuit-flow" d="M10,30 L180,30" stroke="url(#flow-gradient-right)" stroke-width="2" fill="none"/>
        
        <!-- 数据包动画 - 仅水平方向 -->
        <circle class="data-packet reverse" cx="30" cy="30" r="2" fill="#ffffff"/>
        <circle class="data-packet reverse" cx="90" cy="30" r="2" fill="#ffffff"/>
        <circle class="data-packet reverse" cx="150" cy="30" r="2" fill="#ffffff"/>
        
        <!-- 旋转装饰元素 -->
        <g class="rotating-element reverse" transform="translate(60, 10)">
          <rect x="-3" y="-3" width="6" height="6" fill="none" stroke="#a0cfff" stroke-width="1" rx="1"/>
        </g>
        <g class="rotating-element reverse" transform="translate(120, 45)">
          <rect x="-3" y="-3" width="6" height="6" fill="none" stroke="#a0cfff" stroke-width="1" rx="1"/>
        </g>
        
        <!-- 脉冲波纹 - 仅水平方向节点 -->
        <circle class="pulse-wave" cx="40" cy="30" r="3" fill="none" stroke="#1E90FF" stroke-width="0.5"/>
        <circle class="pulse-wave" cx="100" cy="30" r="3" fill="none" stroke="#1E90FF" stroke-width="0.5"/>
        <circle class="pulse-wave" cx="140" cy="30" r="3" fill="none" stroke="#1E90FF" stroke-width="0.5"/>
        
        <!-- 装饰元素 - 小方块 -->
        <rect class="circuit-element" x="60" y="8" width="4" height="4" fill="#1E90FF" rx="1"/>
        <rect class="circuit-element" x="120" y="43" width="4" height="4" fill="#1E90FF" rx="1"/>
        <rect class="circuit-element" x="170" y="13" width="4" height="4" fill="#1E90FF" rx="1"/>
        
        <!-- 节点 -->
        <circle class="circuit-node" cx="40" cy="30" r="3" fill="#1E90FF"/>
        <circle class="circuit-node" cx="80" cy="30" r="3" fill="#1E90FF"/>
        <circle class="circuit-node" cx="100" cy="30" r="3" fill="#1E90FF"/>
        <circle class="circuit-node" cx="140" cy="30" r="3" fill="#1E90FF"/>
        <circle class="circuit-node" cx="60" cy="10" r="3" fill="#1E90FF"/>
        <circle class="circuit-node" cx="120" cy="45" r="3" fill="#1E90FF"/>
        <circle class="circuit-node" cx="120" cy="10" r="3" fill="#1E90FF"/>
        <circle class="circuit-node" cx="170" cy="15" r="3" fill="#1E90FF"/>
        
        <!-- 闪烁节点 -->
        <circle class="circuit-node blink" cx="20" cy="30" r="2" fill="#64B5F6"/>
        <circle class="circuit-node blink" cx="160" cy="30" r="2" fill="#64B5F6"/>
        <circle class="circuit-node blink" cx="70" cy="10" r="2" fill="#64B5F6"/>
        <circle class="circuit-node blink" cx="160" cy="40" r="2" fill="#64B5F6"/>
        
        <!-- 渐变定义 - 从右向左流动 -->
        <defs>
          <linearGradient id="flow-gradient-right" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="rgba(30, 144, 255, 0)"/>
            <stop offset="50%" stop-color="rgba(30, 144, 255, 0.8)"/>
            <stop offset="100%" stop-color="rgba(30, 144, 255, 0)"/>
            <animate attributeName="x1" from="100%" to="-100%" dur="3s" repeatCount="indefinite"/>
            <animate attributeName="x2" from="200%" to="0%" dur="3s" repeatCount="indefinite"/>
          </linearGradient>
          
          <!-- 颜色变化动画 -->
          <linearGradient id="color-change-gradient-right" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#1E90FF">
              <animate attributeName="stop-color" values="#1E90FF; #ffffff; #1E90FF" dur="5s" repeatCount="indefinite"/>
            </stop>
            <stop offset="100%" stop-color="#64B5F6">
              <animate attributeName="stop-color" values="#64B5F6; #a0cfff; #64B5F6" dur="5s" repeatCount="indefinite"/>
            </stop>
          </linearGradient>
        </defs>
      </svg>
    </div>
    
    <div class="user-controls">
      <div class="control-button left-button" @click="handleLogout" title="退出登录">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
      </div>
      <div class="control-button right-button" @click="goToAdminPage" title="管理员页面">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <path d="M12 11.1v-3.6" />
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header-container {
  position: relative;
  height: 3.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.header-panel {
  background: transparent;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
  z-index: 100;
  border-bottom: 1px solid rgba(30, 144, 255, 0.5);
  display: inline-flex;
  justify-content: center;
  width: auto;
  padding: 6px 30px 12px;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  clip-path: polygon(10% 0, 90% 0, 100% 100%, 0% 100%);
}

.system-title-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 10px;
}

.system-title {
  font-size: 1.4rem;
  margin: 0;
  color: #fff;
  text-shadow: 0 0 5px rgba(30, 144, 255, 0.7), 0 0 10px rgba(30, 144, 255, 0.5);
  font-weight: 600;
  letter-spacing: 2px;
  white-space: nowrap;
  text-align: center;
}

.subtitle {
  font-size: 0.75rem;
  color: #64b5f6;
  letter-spacing: 1px;
  margin-top: 2px;
  text-transform: uppercase;
  font-family: 'Arial', sans-serif;
}

.datetime-display {
  margin-top: 2px;
  text-align: center;
}

.time-display {
  font-size: 0.85rem;
  color: #1E90FF;
  font-weight: 500;
}

/* 电路装饰效果 */
.circuit-decoration {
  position: absolute;
  width: 250px;
  height: 60px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 99;
}

.circuit-decoration.left {
  right: calc(50% + 150px);
  transform: translateY(-50%) scaleX(-1); 
}

.circuit-decoration.right {
  left: calc(50% + 150px);
  transform: translateY(-50%);
}

/* 电路路径样式 */
.circuit-path {
  stroke-linecap: round;
  stroke-linejoin: round;
}

.circuit-path.main-line {
  stroke-width: 2;
}

.circuit-path.complex {
  stroke-opacity: 0.7;
}

/* 电路流动效果 */
.circuit-flow {
  stroke-linecap: round;
  opacity: 0.6;
}

/* 数据包动画 */
.data-packet {
  animation: moveRight 4s infinite linear;
  filter: drop-shadow(0 0 3px #ffffff);
}

.data-packet.reverse {
  animation: moveLeft 4s infinite linear;
}

@keyframes moveRight {
  0% { transform: translateX(-10px); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateX(200px); opacity: 0; }
}

@keyframes moveLeft {
  0% { transform: translateX(200px); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateX(-10px); opacity: 0; }
}

/* 旋转元素动画 */
.rotating-element {
  animation: rotate 4s infinite linear;
  transform-origin: center;
}

.rotating-element.reverse {
  animation: rotateReverse 4s infinite linear;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes rotateReverse {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}

/* 脉冲波纹效果 */
.pulse-wave {
  animation: wave 3s infinite ease-out;
  transform-origin: center;
  opacity: 0;
}

@keyframes wave {
  0% { 
    transform: scale(0.5); 
    opacity: 0.8; 
    stroke: #1E90FF;
  }
  100% { 
    transform: scale(3); 
    opacity: 0; 
    stroke: #ffffff;
  }
}

/* 电路元素动画 */
.circuit-element {
  animation: glow 2s infinite alternate;
}

/* 节点动画 */
@keyframes pulse {
  0% {
    opacity: 0.4;
    r: 2;
    filter: drop-shadow(0 0 2px #1E90FF);
  }
  100% {
    opacity: 1;
    r: 3;
    filter: drop-shadow(0 0 5px #1E90FF) drop-shadow(0 0 8px rgba(30, 144, 255, 0.7));
  }
}

/* 闪烁节点动画 */
.circuit-node.blink {
  animation: blink 1.5s infinite alternate;
}

@keyframes blink {
  0%, 80% {
    opacity: 0.2;
    filter: drop-shadow(0 0 1px #64B5F6);
  }
  100% {
    opacity: 1;
    filter: drop-shadow(0 0 5px #64B5F6) drop-shadow(0 0 10px rgba(100, 181, 246, 0.8));
  }
}

/* 装饰元素发光效果 */
@keyframes glow {
  0% {
    filter: drop-shadow(0 0 1px #1E90FF);
  }
  100% {
    filter: drop-shadow(0 0 3px #1E90FF) drop-shadow(0 0 5px rgba(30, 144, 255, 0.7));
  }
}

.admin-icon, .logout-icon {
  width: 55px;
  height: 55px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(25, 118, 210, 0.8);
  transition: all 0.3s;
  position: absolute;
}

.admin-icon {
  background: linear-gradient(135deg, #1976D2, #42A5F5);
  right: 25px;
}

.logout-icon {
  background: linear-gradient(135deg, #0D47A1, #1565C0);
  left: 25px;
}

.admin-icon svg, .logout-icon svg {
  width: 28px;
  height: 28px;
  color: white;
}

.admin-icon:hover, .logout-icon:hover {
  box-shadow: 0 0 15px rgba(25, 118, 210, 0.9);
  transform: translateY(-3px);
}

.admin-icon:hover {
  background: linear-gradient(135deg, #1976D2, #29B6F6);
}

.logout-icon:hover {
  background: linear-gradient(135deg, #1565C0, #1E88E5);
}

.tech-text {
  font-family: 'Consolas', monospace;
}

.user-controls {
  position: fixed;
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 1000;
  top: 10px;
}

.left-button {
  position: absolute;
  left: 25px;
  top: 20px;
}

.right-button {
  position: absolute;
  right: 25px;
  top: 20px;
}

.control-button {
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

.control-button:hover {
  background: rgba(33, 150, 243, 0.5);
  transform: translateY(-3px);
  box-shadow: 0 5px 18px rgba(33, 150, 243, 0.6);
}

.control-button svg {
  width: 28px;
  height: 28px;
}
</style>