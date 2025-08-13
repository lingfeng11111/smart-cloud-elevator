<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { maintenanceApi, usersApi } from '../api';
import { formatDateTime } from '@/utils/date';
import { ElMessage } from 'element-plus'; // 恢复ElMessage导入
import AuthService from '../services/authService'; // 恢复AuthService导入
import TechGridBackground from '../components/TechGridBackground.vue';

const router = useRouter();
const goToHome = () => router.push('/');

const systems = ref([]);

const selectedSystem = ref('');

const records = ref([]);
const loading = ref(false);
const totalItems = ref(0);
const currentPage = ref(1);
const pageSize = ref(9);
const users = ref([]);

const fetchUsers = async () => {
  try {
    const response = await usersApi.getUsers();
    if (response.data.code === 200) {
      users.value = response.data.data || [];
    }
  } catch (error) {
    console.error('获取用户信息出错:', error);
  }
};

const fetchSystems = async () => {
  // 直接使用硬编码数据，因为后端没有系统API接口
  systems.value = [
    { id: 'sys-001', name: '曳引系统' },
    { id: 'sys-002', name: '导向系统' },
    { id: 'sys-003', name: '电气控制系统' },
    { id: 'sys-004', name: '门系统' }
  ];
  console.log('使用硬编码系统数据:', systems.value);
};

const getUserId = (userId) => {
  if (!userId) {
    return '未分配';
  }
  return `ID: ${userId}`;
};

const fetchMaintainData = async () => {
  loading.value = true;
  try {
    const params = {
      current: currentPage.value,
      size: pageSize.value
    };
    if (selectedSystem.value) {
      params.systemName = selectedSystem.value;
    }
    const response = await maintenanceApi.getMaintenance(params);
    if (response.data.code === 200) {
      records.value = response.data.data.records;
      totalItems.value = response.data.data.total;
      console.log('维护记录数据:', records.value);
      
      // 调试：检查每条记录的字段
      if (records.value.length > 0) {
        console.log('第一条记录的所有字段:', Object.keys(records.value[0]));
        console.log('第一条记录详细信息:', records.value[0]);
      }
      
      // 处理后端返回的字段名映射（下划线转驼峰）
      records.value.forEach(record => {
        // 映射字段名：system_name -> systemName, user_id -> userId
        if (record.system_name) {
          record.systemName = record.system_name;
        } else if (!record.systemName) {
          record.systemName = '未知系统';
        }
        
        if (record.user_id) {
          record.userId = record.user_id;
        }
        
        if (record.mt_time) {
          record.mtTime = record.mt_time;
        }
        
        // 确保status字段存在，如果没有则设置默认值
        if (!record.status) {
          record.status = '待维护';
        }
        
        console.log(`记录ID: ${record.id}, 系统名称: ${record.systemName}, 维护人员ID: ${record.userId}, 状态: ${record.status}`);
      });
      
    } else {
      ElMessage.error('获取维护记录失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('获取维护记录出错:', error);
    ElMessage.error('获取维护记录出错');
  } finally {
    loading.value = false;
  }
};



// 恢复updateStatus函数 - 管理员界面需要此功能
const updateStatus = async (record, newStatus) => {
  try {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      ElMessage.error('无法获取当前用户信息，请重新登录');
      return;
    }
    
    // 尝试使用下划线格式的字段名，因为后端可能期望这种格式
    const updateData = { 
      id: record.id, 
      user_id: currentUser.id,  // 改为下划线格式
      status: newStatus 
    };
    
    console.log('更新维护状态请求数据:', updateData);
    
    const response = await maintenanceApi.updateMaintenance(updateData);
    console.log('更新维护状态响应:', response.data);
    
    if (response.data.code === 200) {
      ElMessage.success('更新维护状态成功');
      fetchMaintainData();
    } else {
      ElMessage.error('更新维护状态失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('更新维护状态出错:', error);
    ElMessage.error('更新维护状态出错: ' + error.message);
  }
};

const handleFilter = () => {
  currentPage.value = 1;
  fetchMaintainData();
};

const handlePageChange = (page) => {
  currentPage.value = page;
  fetchMaintainData();
};

onMounted(async () => {
  await fetchUsers();
  await fetchSystems();
  fetchMaintainData();
});
</script>

<template>
  <div class="maintenance-log-view">
    <TechGridBackground />
    <div class="maintenance-header">
      <div class="back-button" @click="$router.go(-1)">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        返回
      </div>
      <h1 class="admin-title tech-text glow">维护记录管理</h1>
    </div>

    <div class="content-container">
      <div class="filter-box panel">
        <div class="filter-options">
          <label class="filter-label">系统类型筛选:</label>
          <el-select v-model="selectedSystem" @change="handleFilter" placeholder="请选择系统类型" clearable size="medium" style="width: 200px;">
            <el-option label="全部系统" value="" />
            <el-option v-for="system in systems" :key="system.id" :label="system.name" :value="system.name" />
          </el-select>
        </div>
      </div>

      <div v-if="loading" class="loading-container">
        <div class="loader"></div>
        <p class="tech-text">数据加载中...</p>
      </div>

      <div v-else-if="records.length === 0" class="no-data-container">
        <p>暂无记录</p>
      </div>

      <div v-else class="data-list">
        <div v-for="record in records" :key="record.id" class="maintenance-item">
          <div class="item-header">
            <div class="item-id">ID: {{ record.id }}</div>
            <div class="item-status" :class="record.status === '已维护' ? 'resolved' : 'pending'">
              {{ record.status }}
            </div>
          </div>
          <div class="item-body">
            <div class="info-item"><strong>系统类型:</strong> {{ record.systemName }}</div>
            <div class="info-item"><strong>维护人员:</strong> <span class="maintenance-personnel">{{ getUserId(record.userId) }}</span></div>
            <div class="info-item"><strong>维修日志:</strong> <span class="remark-text" :title="record.descr">{{ record.descr && record.descr.length > 20 ? record.descr.substring(0, 20) + '...' : (record.descr || '无') }}</span></div>
          </div>
          <div class="item-footer">
            <div class="item-time">{{ formatDateTime(record.mtTime) }}</div>
            <div class="item-actions">
              <!-- 管理员界面保留标记功能 -->
              <el-button size="small" type="primary" @click="updateStatus(record, '已维护')"
                v-if="record.status !== '已维护'">
                标记为已维护
              </el-button>
              <div class="status-indicator" v-if="record.status === '已维护'">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>已维护</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="pagination-container">
        <el-pagination background layout="prev, pager, next, total" :total="totalItems"
          :current-page.sync="currentPage" :page-size="pageSize" @current-change="handlePageChange" />
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
/* General View Styles */
.maintenance-log-view {
  padding: 1.5vh;
  box-sizing: border-box;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.maintenance-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5vh 2vw;
  margin-bottom: 2vh;
  background: transparent;
  border: none;
  box-shadow: none;
}

.admin-title {
  font-size: 2rem;
  color: #4dabf5;
  margin: 0;
  flex: 1;
  text-align: center;
}

/* Content Container */
.content-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

/* Filter Box */
.filter-box {
  margin-bottom: 2vh;
  padding: 1.5vh;
  flex-shrink: 0;
  background: transparent;
  border: none;
  border-radius: 8px;
  box-shadow: none;
}
.filter-options {
  display: flex;
  align-items: center;
  gap: 15px;
}

.filter-label {
  color: #4dabf5;
  font-size: 1rem;
  font-weight: 500;
}

/* Data List */
.data-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2vh;
  flex: 1;
  align-content: start;
  overflow-y: auto;
  padding-bottom: 2vh;
}

.maintenance-item {
  background: rgba(13, 31, 61, 0.6);
  border-radius: 8px;
  padding: 2vh;
  border: 1px solid rgba(33, 150, 243, 0.3);
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  min-height: 200px;
  backdrop-filter: blur(5px);
}
.maintenance-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(33, 150, 243, 0.3);
  border-color: #4dabf5;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1vh;
  padding-bottom: 0.5vh;
  border-bottom: 1px solid rgba(33, 150, 243, 0.2);
}
.item-id { font-weight: 600; font-size: 1.1rem; color: #fff; }
.item-status { font-size: 0.9rem; padding: 4px 12px; border-radius: 12px; font-weight: 500; }
.item-status.resolved { background: rgba(76, 175, 80, 0.2); color: #4caf50; }
.item-status.pending { background: rgba(255, 152, 0, 0.2); color: #ff9800; }

.item-body {
  flex-grow: 1;
  margin-bottom: 1vh;
}
.info-item {
  margin-bottom: 0.8vh;
  font-size: 1rem;
  color: var(--text-secondary);
}
.info-item strong { color: #fff; }

/* 维护人员名字突出显示 */
.maintenance-personnel {
  color: #4dabf5;
  font-weight: bold;
  background: rgba(77, 171, 245, 0.1);
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid rgba(77, 171, 245, 0.3);
  display: inline-block;
  font-size: 0.8rem;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}
.item-time { font-size: 0.9rem; color: var(--text-secondary); }
.item-actions .el-button { margin-left: 10px; }

/* 状态指示器样式 */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4caf50;
  font-size: 0.9rem;
  font-weight: 500;
}

.status-indicator svg {
  width: 20px;
  height: 20px;
  color: #4caf50;
}

/* 移除了pending样式，管理员界面使用按钮而不是状态指示器 */

/* Common Styles */
.pagination-container { 
  margin-top: 2vh; 
  padding: 2vh;
  display: flex; 
  justify-content: center;
  flex-shrink: 0;
  background: transparent;
  border: none;
  border-radius: 8px;
}

/* 备注文本样式优化 */
.remark-item {
  overflow: hidden;
  flex-shrink: 0;
}
.remark-text {
  display: inline;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.loading-container, .no-data-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 40vh; color: var(--text-secondary); }
.loader { border: 4px solid rgba(255, 255, 255, 0.2); border-left-color: #4dabf5; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 1.5vh; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Element UI Overrides */
:deep(.el-select) {
  --el-select-border-color-hover: #4dabf5;
  --el-select-input-focus-border-color: #4dabf5;
}
:deep(.el-select .el-input__wrapper) {
  background-color: rgba(13, 31, 61, 0.8);
  border: none;
  box-shadow: none;
}
:deep(.el-select .el-input__wrapper:hover) {
  border-color: #4dabf5;
}
:deep(.el-select .el-input__wrapper.is-focus) {
  border-color: #4dabf5;
  box-shadow: 0 0 0 1px rgba(77, 171, 245, 0.2);
}
:deep(.el-select .el-input__inner) {
  color: #fff;
}
:deep(.el-select-dropdown) {
  background-color: rgba(13, 31, 61, 0.95);
  border: none;
}
:deep(.el-select-dropdown__item) {
  color: #fff;
}
:deep(.el-select-dropdown__item:hover) {
  background-color: rgba(77, 171, 245, 0.2);
}
:deep(.el-select-dropdown__item.selected) {
  background-color: #4dabf5;
  color: #fff;
}
:deep(.el-pagination) {
  --el-pagination-bg-color: transparent;
  --el-pagination-text-color: #fff;
  --el-pagination-border-radius: 6px;
}
:deep(.el-pagination.is-background .el-pager li:not(.disabled)) { 
  background-color: rgba(13, 31, 61, 0.8); 
  border: none;
  color: #fff;
  margin: 0 2px;
  border-radius: 6px;
}
:deep(.el-pagination.is-background .el-pager li:not(.disabled):hover) {
  background-color: rgba(77, 171, 245, 0.3);
  border-color: #4dabf5;
}
:deep(.el-pagination.is-background .el-pager li:not(.disabled).active) { 
  background-color: #4dabf5; 
  border-color: #4dabf5;
  color: #fff;
}
:deep(.el-pagination.is-background .btn-next), 
:deep(.el-pagination.is-background .btn-prev) { 
  background-color: rgba(13, 31, 61, 0.8); 
  border: none;
  color: #fff;
  border-radius: 6px;
}
:deep(.el-pagination.is-background .btn-next:hover), 
:deep(.el-pagination.is-background .btn-prev:hover) {
  background-color: rgba(77, 171, 245, 0.3);
  border-color: #4dabf5;
}
:deep(.el-pagination__total) {
  color: #4dabf5;
  font-weight: 500;
}


</style>