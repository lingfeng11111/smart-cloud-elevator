<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AuthService from '../services/authService';

const router = useRouter();
const showAdminProfile = ref(false);
const userInfo = ref({});
const userRole = ref('');

onMounted(() => {
  // 获取用户信息
  const storedUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  userInfo.value = storedUserInfo;
  userRole.value = AuthService.getUserRole();
});

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

const toggleAdminProfile = () => {
  showAdminProfile.value = !showAdminProfile.value;
};

// 模拟管理员权限
const adminPermissions = {
  admin: ['系统配置', '用户管理', '智云梯监控', '维护记录', '报警处理'],
  maintenance: ['维修任务', '任务提交', '系统检查']
};
</script>

<template>
  <div class="top-navbar">
    <div class="navbar-brand">
      <span class="brand-icon">🏢</span>
      <span class="brand-text">智云梯</span>
    </div>
    
    <div class="navbar-actions">
      <div class="admin-info" @click="toggleAdminProfile">
        <span class="admin-avatar">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </span>
        <span class="admin-name">{{ userInfo.username || '用户' }}</span>
      </div>
      
      <!-- 用户详细信息弹出层 -->
      <div v-if="showAdminProfile" class="admin-profile-popup">
        <div class="profile-header">
          <div class="profile-avatar">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="profile-basic-info">
            <h3>{{ userInfo.username || '用户' }}</h3>
            <span class="profile-role">{{ userRole === 'admin' ? '管理员' : '维修人员' }}</span>
          </div>
        </div>
        
        <div class="profile-body">
          <div class="profile-section">
            <h4>个人信息</h4>
            <div class="profile-item">
              <span class="item-label">用户ID:</span>
              <span class="item-value">{{ userInfo.userId }}</span>
            </div>
            <div class="profile-item">
              <span class="item-label">角色:</span>
              <span class="item-value">{{ userRole === 'admin' ? '管理员' : '维修人员' }}</span>
            </div>
          </div>
          
          <div class="profile-section">
            <h4>权限信息</h4>
            <div class="permissions-list">
              <span 
                v-for="(permission, index) in (userRole === 'admin' ? adminPermissions.admin : adminPermissions.maintenance)" 
                :key="index" 
                class="permission-tag"
              >
                {{ permission }}
              </span>
            </div>
          </div>
          
          <button class="logout-button" @click="handleLogout">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>退出登录</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.top-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  background: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
  position: relative;
}

.navbar-brand {
  display: flex;
  align-items: center;
}

.brand-icon {
  font-size: 2.2rem;
  margin-right: 10px;
}

.brand-text {
  font-size: 1.4rem;
  font-weight: 600;
  background: linear-gradient(90deg, var(--primary-color), #2ecc71);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.navbar-actions {
  display: flex;
  align-items: center;
  position: relative;
}

.admin-info {
  display: flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.2s;
}

.admin-info:hover {
  background: rgba(255, 255, 255, 0.1);
}

.admin-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: rgba(76, 175, 80, 0.2);
  border-radius: 50%;
  margin-right: 8px;
  color: var(--primary-color);
}

.admin-name {
  font-size: 0.9rem;
  font-weight: 500;
}

/* 管理员详细信息弹出层样式 */
.admin-profile-popup {
  position: absolute;
  top: 50px;
  right: 0;
  width: 320px;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
  z-index: 100;
  overflow: hidden;
  animation: slideDown 0.2s ease-out forwards;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.profile-header {
  padding: 20px;
  background: rgba(76, 175, 80, 0.1);
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.profile-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  background: rgba(76, 175, 80, 0.2);
  border-radius: 50%;
  margin-right: 15px;
  color: var(--primary-color);
}

.profile-basic-info h3 {
  margin: 0 0 5px 0;
  font-size: 1.1rem;
  color: var(--text-color);
}

.profile-role {
  font-size: 0.8rem;
  color: var(--text-secondary);
  background: rgba(76, 175, 80, 0.15);
  padding: 2px 8px;
  border-radius: 10px;
}

.profile-body {
  padding: 15px;
}

.profile-section {
  margin-bottom: 15px;
}

.profile-section h4 {
  margin: 0 0 10px 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 5px;
}

.profile-item {
  display: flex;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.item-label {
  width: 80px;
  color: var(--text-secondary);
}

.item-value {
  flex: 1;
  color: var(--text-color);
}

.permissions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.permission-tag {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 4px;
  font-size: 0.8rem;
  color: var(--primary-color);
}

.logout-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 10px;
  margin-top: 10px;
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
  border: 1px solid rgba(231, 76, 60, 0.3);
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-button:hover {
  background: rgba(231, 76, 60, 0.2);
}

.logout-button svg {
  margin-right: 5px;
}
</style>