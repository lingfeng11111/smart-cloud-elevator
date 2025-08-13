<script setup>
import { ref, onMounted } from 'vue';
import { usersApi } from '../api';
import TechGridBackground from '../components/TechGridBackground.vue';

const userList = ref([]);
const loading = ref(false);
const editMode = ref(false);

const showDialog = ref(false);
const formUser = ref({
  userName: '',
  userPhone: '',
  position: '维护人员',
  role: 'user',
  password: '',
  email: '',
  id: null
});

const positions = ['维护人员', '管理人员', '技术人员', '特勤人员'];
const roles = [
  { value: 'user', label: '普通用户' },
  { value: 'admin', label: '管理员' }
];

// 打开添加用户对话框
const handleAddUser = () => {
  editMode.value = false;
  showDialog.value = true;
  formUser.value = {
    userName: '',
    userPhone: '',
    position: '维护人员',
    role: 'user',
    password: '',
    email: '',
    id: null
  };
};

// 添加或更新用户
const submitUser = async () => {
  try {
    // 基本验证
    if (!formUser.value.userName || !formUser.value.userPhone) {
      // 使用Element Plus的消息提示
      ElMessage.warning('请输入必填的人员信息');
      return;
    }
    
    loading.value = true;
    
    let response;
    if (editMode.value) {
      // 更新用户
      response = await usersApi.updateUser({
        id: formUser.value.id,
        position: formUser.value.position,
        condition: formUser.value.condition
      });
    } else {
      // 添加用户
      response = await usersApi.addUser(formUser.value);
    }
    
    // 根据API的统一返回格式处理响应
    if (response.data && response.data.code === 200) {
      // 成功提示
      const actionText = editMode.value ? '修改' : '添加';
      console.log(`${actionText}人员成功:`, response.data);
      alert(`${actionText}人员成功`);
      
      // 重新获取用户列表
      await fetchUsers();
      
      // 关闭对话框
      showDialog.value = false;
    } else {
      // 失败提示
      console.error('操作失败:', response.data);
      alert('操作失败: ' + (response.data?.message || '未知错误'));
    }
  } catch (error) {
    console.error('操作异常:', error);
    alert('操作异常，请检查网络连接');
  } finally {
    loading.value = false;
  }
};

// 打开编辑用户对话框
const handleEdit = (user) => {
  editMode.value = true;
  showDialog.value = true;
  
  // 复制用户信息到表单
  formUser.value = {
    ...user,
    password: '', // 不回显密码
  };
};

// 删除用户
const handleDelete = async (user) => {
  try {
    // 确认删除
    const confirmed = confirm(`确认要删除人员 ${user.userName} 吗？`);
    if (!confirmed) return;
    
    loading.value = true;
    
    // 调用删除API
    const response = await usersApi.deleteUser(user.id);
    
    // 处理响应
    if (response.data && response.data.code === 200) {
      console.log('删除人员成功:', response.data);
      alert('删除人员成功');
      
      // 从列表中移除已删除的用户
      userList.value = userList.value.filter(u => u.id !== user.id);
    } else {
      console.error('删除失败:', response.data);
      alert('删除失败: ' + (response.data?.message || '未知错误'));
    }
  } catch (error) {
    console.error('删除异常:', error);
    alert('删除操作异常，请检查网络连接');
  } finally {
    loading.value = false;
  }
};

// 获取用户列表
const fetchUsers = async () => {
  loading.value = true;
  
  try {
    // 查询所有用户，不传递condition参数以获取全部用户
    const response = await usersApi.getUsers();
    
    if (response.data && response.data.code === 200) {
      // 成功获取数据
      if (response.data.data && Array.isArray(response.data.data)) {
        userList.value = response.data.data;
      } else {
        console.warn('API返回的用户数据不是数组格式:', response.data);
        userList.value = [];
      }
    } else {
      console.error('获取用户列表失败:', response.data);
      alert('获取用户列表失败: ' + (response.data?.message || '未知错误'));
      userList.value = [];
    }
  } catch (error) {
    console.error('获取用户列表异常:', error);
    alert('获取用户列表异常，请检查网络连接');
    
    // 如果接口未实现，使用模拟数据以方便调试
    userList.value = [
      { id: 1001, userName: '张三', userPhone: '13800000001', position: '维护人员', role: 'user', email: 'zhangsan@example.com', condition: '空闲' },
      { id: 1002, userName: '李四', userPhone: '13800000002', position: '技术人员', role: 'user', email: 'lisi@example.com', condition: '忙碌' },
      { id: 1003, userName: '王五', userPhone: '13800000003', position: '管理人员', role: 'admin', email: 'wangwu@example.com', condition: '空闲' },
      { id: 1004, userName: '赵六', userPhone: '13800000004', position: '维护人员', role: 'user', email: 'zhaoliu@example.com', condition: '离线' }
    ];
  } finally {
    loading.value = false;
  }
};

// 获取用户状态样式类
const getUserStatusClass = (condition) => {
  switch (condition) {
    case '空闲':
    case '空闲中':
    case 'active':
      return 'status-available';
    case '忙碌':
    case 'busy':
      return 'status-busy';
    case '离线':
    case 'offline':
      return 'status-offline';
    default:
      return 'status-unknown';
  }
};

// 获取用户状态文本
const getUserStatusText = (condition) => {
  switch (condition) {
    case '空闲':
    case '空闲中':
    case 'active':
      return '空闲';
    case '忙碌':
    case 'busy':
      return '忙碌';
    case '离线':
    case 'offline':
      return '离线';
    default:
      return '未知';
  }
};

// 页面加载时获取用户列表
onMounted(() => {
  fetchUsers();
});
</script>

<template>
  <div class="user-management-page">
    
    <div class="panel main-panel">
      <div class="back-button" @click="$router.go(-1)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      <div class="panel-header">
        <h2 class="panel-title tech-text">用户管理</h2>
        <div class="panel-controls">
          <button class="tech-button add-button" @click="handleAddUser">
            <span class="button-icon">+</span>
            <span>添加人员</span>
          </button>
        </div>
      </div>
      
      <div class="panel-content">
        <!-- 加载提示 -->
        <div v-if="loading" class="loading-container">
          <div class="spinner"></div>
          <span>加载中...</span>
        </div>
        
        <!-- 用户表格 -->
        <div v-else-if="userList.length > 0" class="user-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>姓名</th>
                <th>联系电话</th>
                <th>职位</th>
                <th>角色</th>
                <th>状态</th>
                <th>邮箱</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in userList" :key="user.id">
                <td>{{ user.id }}</td>
                <td>{{ user.userName }}</td>
                <td>{{ user.userPhone }}</td>
                <td>{{ user.position }}</td>
                <td>{{ user.role === 'admin' ? '管理员' : '普通用户' }}</td>
                <td>
                  <span class="status-badge" :class="getUserStatusClass(user.condition)">
                    {{ getUserStatusText(user.condition) }}
                  </span>
                </td>
                <td>{{ user.email || '未设置' }}</td>
                <td class="actions">
                  <button class="tech-button small" @click="handleEdit(user)">修改</button>
                  <button class="tech-button small danger" @click="handleDelete(user)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- 无数据提示 -->
        <div v-else class="no-data">
          <p>暂无用户数据</p>
          <button class="tech-button" @click="fetchUsers">刷新</button>
        </div>
      </div>
    </div>
    
    <!-- 添加/编辑用户对话框 -->
    <div class="modal-container" v-if="showDialog">
      <div class="modal-overlay" @click="showDialog = false"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="tech-text">{{ editMode ? '修改人员信息' : '添加新人员' }}</h3>
          <button class="close-button" @click="showDialog = false">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>姓名</label>
            <input type="text" v-model="formUser.userName" placeholder="请输入姓名" :disabled="editMode">
          </div>
          
          <div class="form-group">
            <label>联系电话</label>
            <input type="text" v-model="formUser.userPhone" placeholder="请输入联系电话" :disabled="editMode">
          </div>
          
          <div class="form-group">
            <label>职位</label>
            <select v-model="formUser.position">
              <option v-for="pos in positions" :key="pos" :value="pos">{{ pos }}</option>
            </select>
          </div>
          
          <div class="form-group" v-if="editMode">
            <label>状态</label>
            <select v-model="formUser.condition">
              <option value="空闲">空闲</option>
              <option value="忙碌">忙碌</option>
              <option value="离线">离线</option>
            </select>
          </div>
          
          <div class="form-group" v-if="!editMode">
            <label>角色</label>
            <select v-model="formUser.role">
              <option v-for="role in roles" :key="role.value" :value="role.value">{{ role.label }}</option>
            </select>
          </div>
          
          <div class="form-group" v-if="!editMode">
            <label>密码</label>
            <input type="password" v-model="formUser.password" placeholder="请输入密码">
          </div>
          
          <div class="form-group" v-if="!editMode">
            <label>邮箱</label>
            <input type="email" v-model="formUser.email" placeholder="请输入邮箱">
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="tech-button cancel" @click="showDialog = false">取消</button>
          <button class="tech-button confirm" @click="submitUser" :disabled="loading">
            <span v-if="loading" class="spinner small"></span>
            <span>{{ editMode ? '保存修改' : '确认添加' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.back-button {
  position: absolute;
  left: 2vw;
  display: flex;
  align-items: center;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s;
  color: #4dabf5;
  transition: all 0.3s;
  z-index: 1000;
}

.back-button:hover {
  color: var(--text-color);
  transform: translateY(-3px);
}

.back-button svg {
  margin-right: 5px;
  stroke: #4dabf5;
}
.user-management-page {
  width: 100%;
  height: 100%;
  padding: 2vh;
  box-sizing: border-box;
  position: relative;
  background: transparent;
}

.main-panel {
  background: rgba(13, 31, 61, 0.2);
  border: 1px solid rgba(30, 144, 255, 0.6);
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(33, 150, 243, 0.3);
  backdrop-filter: blur(1px);
  padding: 2vh;
  height: calc(100vh - 4vh);
  overflow: visible;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2vh;
  margin-top: 3vh;
  padding-bottom: 2vh;
  border-bottom: 1px solid rgba(33, 150, 243, 0.3);
}

.panel-title {
  font-size: 1.5rem;
  margin: 0;
  color: #4dabf5;
  text-shadow: 0 0 10px rgba(77, 171, 245, 0.5);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  position: relative;
}

/* 表格样式 */
.user-table {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: rgba(13, 31, 61, 0.3);
  border: 1px solid rgba(33, 150, 243, 0.4);
  border-radius: 8px;
  overflow: hidden;
}

thead {
  background: rgba(33, 150, 243, 0.2);
}

th, td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid rgba(33, 150, 243, 0.2);
  color: var(--text-color, #f0f0ff);
}

th {
  color: #4dabf5;
  font-weight: 500;
  text-shadow: 0 0 5px rgba(77, 171, 245, 0.3);
}

tr:hover {
  background: rgba(33, 150, 243, 0.1);
}

.actions {
  display: flex;
  gap: 10px;
}

/* 按钮样式 */
.tech-button {
  background: rgba(33, 150, 243, 0.2);
  border: 1px solid rgba(33, 150, 243, 0.4);
  border-radius: 4px;
  color: #4dabf5;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  gap: 6px;
  min-width: 80px;
}

.tech-button:hover {
  background: rgba(33, 150, 243, 0.3);
  transform: translateY(-2px);
}

.tech-button.small {
  padding: 6px 12px;
  font-size: 0.9rem;
  min-width: 60px;
}

.tech-button.danger {
  background: rgba(244, 67, 54, 0.2);
  border-color: rgba(244, 67, 54, 0.4);
  color: #f44336;
}

.tech-button.danger:hover {
  background: rgba(244, 67, 54, 0.3);
}

.button-icon {
  font-size: 1.2rem;
  line-height: 1;
}

/* 加载动画 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
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

.spinner.small {
  width: 16px;
  height: 16px;
  border-width: 2px;
  margin: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 无数据提示 */
.no-data {
  text-align: center;
  padding: 50px 0;
  color: var(--text-secondary, #a9a9a9);
}

/* 模态框样式 */
.modal-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease-in-out;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
}

.modal-content {
  position: relative;
  width: 500px;
  max-width: 90%;
  background: rgba(13, 31, 61, 0.95);
  border: 1px solid rgba(33, 150, 243, 0.6);
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  animation: slideIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateY(-30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid rgba(33, 150, 243, 0.3);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: #4dabf5;
  font-size: 1.3rem;
}

.close-button {
  background: none;
  border: none;
  color: #4dabf5;
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.2s;
}

.close-button:hover {
  color: #ffffff;
}

.modal-body {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid rgba(33, 150, 243, 0.3);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 表单样式 */
.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #a9a9a9;
  font-size: 0.9rem;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid rgba(33, 150, 243, 0.4);
  border-radius: 4px;
  background: rgba(13, 31, 61, 0.5);
  color: #f0f0ff;
  font-size: 0.95rem;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #4dabf5;
  outline: none;
  box-shadow: 0 0 0 2px rgba(77, 171, 245, 0.25);
}

/* 技术感装饰 */
.tech-text {
  font-family: 'Orbitron', sans-serif;
  letter-spacing: 0.5px;
}

/* 添加按钮样式 */
.add-button {
  background: linear-gradient(45deg, rgba(33, 150, 243, 0.2), rgba(33, 150, 243, 0.3));
}

.add-button:hover {
  background: linear-gradient(45deg, rgba(33, 150, 243, 0.3), rgba(33, 150, 243, 0.4));
}

/* 自定义滚动条 */
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

/* 状态徽章样式 */
.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  min-width: 50px;
}

.status-available {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.status-busy {
  background: rgba(255, 152, 0, 0.2);
  color: #ff9800;
  border: 1px solid rgba(255, 152, 0, 0.3);
}

.status-offline {
  background: rgba(158, 158, 158, 0.2);
  color: #9e9e9e;
  border: 1px solid rgba(158, 158, 158, 0.3);
}

.status-unknown {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
}</style>
