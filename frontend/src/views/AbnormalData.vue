<template>
  <div class="abnormal-data-view">
    <TechGridBackground />
    <div class="abnormal-header">
      <div class="back-button" @click="$router.go(-1)">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        返回
      </div>
      <h1 class="admin-title tech-text glow">报警数据管理（未维护）</h1>
    </div>

    <div class="content-container">
      <div class="filter-box panel">
        <div class="filter-options">
          <label class="filter-label">故障类型筛选:</label>
          <el-select v-model="filterForm.systemName" @change="handleFilter" placeholder="请选择故障类型" clearable size="medium" style="width: 200px;">
            <el-option label="全部类型" value="" />
            <el-option v-for="option in systemOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
          <label class="filter-label">时间范围:</label>
          <el-date-picker
            v-model="filterForm.timeRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            size="medium"
            style="width: 300px;"
          />
          <el-button type="primary" @click="handleFilter" size="medium">筛选</el-button>
        </div>
      </div>

      <div v-if="loading" class="loading-container">
        <div class="loader"></div>
        <p class="tech-text">数据加载中...</p>
      </div>

      <div v-else-if="tableData.length === 0" class="no-data-container">
        <p>暂无未维护的报警数据</p>
      </div>

      <div v-else class="data-list">
        <div v-for="item in tableData" :key="item.id" class="abnormal-item">
          <div class="item-header">
          <div class="item-id">ID: {{ item.id }}</div>
          <div class="item-status" :class="item.status === '已处理' ? 'resolved' : 'pending'">
            {{ item.status === '已处理' ? '已维护' : '待处理' }}
          </div>
        </div>
          <div class="item-body">
            <div class="info-item"><strong>智云梯:</strong> {{ item.eName }}</div>
            <div class="info-item"><strong>故障系统:</strong> <span class="system-name" :class="getSeverityClass(item.systemName)">{{ item.systemName }}</span></div>
            <div class="info-item"><strong>子系统:</strong> {{ item.systemSqName }}</div>
            <div class="info-item"><strong>异常数据:</strong> <span class="data-value">{{ item.eData }}</span></div>
            <div v-if="item.aiResult" class="info-item ai-analysis">
              <strong>AI分析:</strong> 
              <span class="ai-result">{{ item.aiResult }}</span>
            </div>
          </div>
          <div class="item-footer">
            <div class="item-time">{{ item.createTime }}</div>
            <div class="item-actions">
            <!-- 管理员界面保留标记功能 -->
            <el-button size="small" type="primary" @click="markAsProcessed(item)"
              v-if="item.status !== '已处理'">
              标记为已维护
            </el-button>
            <div class="status-indicator" v-if="item.status === '已处理'">
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
        <el-pagination background layout="prev, pager, next, total" :total="totalItems" :current-page.sync="currentPage"
          :page-size="pageSize" @current-change="handlePageChange" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { abnormalDataApi, maintenanceApi } from '../api';
import { ElMessage } from 'element-plus'; // 恢复ElMessage导入
import AuthService from '../services/authService'; // 恢复AuthService导入
import TechGridBackground from '../components/TechGridBackground.vue';

const router = useRouter();
const goToHome = () => router.push('/');

// 筛选响应式数据
const filterForm = reactive({
  systemName: '',
  timeRange: []
});

const systemOptions = ref([
  { value: '曳引系统', label: '曳引系统' },
  { value: '门系统', label: '门系统' },
  { value: '控制系统', label: '控制系统' },
  { value: '安全系统', label: '安全系统' }
]);

const tableData = ref([]);
const loading = ref(false);
const totalItems = ref(0);
const currentPage = ref(1);
const pageSize = ref(9);

const fetchData = async () => {
  loading.value = true;
  try {
    const params = {
      current: currentPage.value,
      size: pageSize.value,
      systemName: filterForm.systemName,
    };
    if (filterForm.timeRange && filterForm.timeRange.length === 2) {
      params.startDate = filterForm.timeRange[0];
      params.endDate = filterForm.timeRange[1];
    }
    
    // 获取异常数据
    const response = await abnormalDataApi.getAbnormalData(params);
    if (response.data.code === 200) {
      const abnormalData = response.data.data.records;
      
      // 获取维护记录以确定状态
      const maintenanceResponse = await maintenanceApi.getMaintenance({ current: 1, size: 1000 });
      let maintenanceRecords = [];
      if (maintenanceResponse.data.code === 200) {
        maintenanceRecords = maintenanceResponse.data.data.records;
      }
      
      // 处理维护记录的字段映射（与AbnormalDataLog组件保持一致）
       maintenanceRecords.forEach(record => {
         if (record.mt_data_id) {
           record.mtDataId = record.mt_data_id;
         }
         if (record.system_name) {
           record.systemName = record.system_name;
         }
         if (record.user_id) {
           record.userId = record.user_id;
         }
         if (record.mt_time) {
           record.mtTime = record.mt_time;
         }
         if (!record.status) {
           record.status = '待维护';
         }
       });
       
       // 处理异常数据，添加状态信息，并过滤只显示未维护的
       const processedData = abnormalData.map(item => {
         // 查找对应的维护记录（使用与AbnormalDataLog相同的匹配逻辑）
         const maintenanceRecord = maintenanceRecords.find(record => {
           const recordMtDataId = record.mtDataId || record.mt_data_id;
           const itemDataId = item.mtDataId || item.id;
           return (recordMtDataId === itemDataId || record.id === itemDataId) && record.status === '已维护';
         });
         
         console.log(`异常数据ID: ${item.id}, mtDataId: ${item.mtDataId}, 匹配的维护记录:`, maintenanceRecord);
         
         return {
           ...item,
           status: maintenanceRecord ? '已处理' : '待处理'
         };
       });
       
              // 报警数据管理只显示未维护的信息
       tableData.value = processedData.filter(item => item.status === '待处理');
       
       // 更新总数为过滤后的数量
       totalItems.value = tableData.value.length;
      console.log('异常数据:', tableData.value);
    }
  } catch (error) {
    console.error('获取异常数据出错:', error);
    ElMessage.error('获取异常数据出错');
  } finally {
    loading.value = false;
  }
};

// 恢复markAsProcessed函数 - 管理员界面需要此功能
const markAsProcessed = async (item) => {
  try {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      ElMessage.error('无法获取当前用户信息，请重新登录');
      return;
    }
    
    // 先检查是否已存在该异常数据的维护记录（使用与AbnormalDataLog相同的查询方式）
    const existingRecords = await maintenanceApi.getMaintenance({
      mtDataId: item.mtDataId || item.id,
      current: 1,
      size: 10
    });
    
    let response;
    if (existingRecords.data.code === 200 && existingRecords.data.data.records.length > 0) {
      // 如果已存在记录，更新状态
      const existingRecord = existingRecords.data.data.records[0];
      const updateData = {
        id: existingRecord.id,
        user_id: currentUser.id,
        status: '已维护'
      };
      response = await maintenanceApi.updateMaintenance(updateData);
    } else {
      // 如果不存在记录，创建新的维护记录
      const maintenanceData = {
        user_id: currentUser.id,
        mt_data_id: item.mtDataId || item.id, // 使用mtDataId字段
        system_name: item.systemName,
        status: '已维护',
        descr: `管理员标记处理完成: ${item.eName} - ${item.eData}`, // 使用descr字段存储处理说明
        remark: item.aiResult || '' // 保存AI分析结果到remark字段
      };
      response = await maintenanceApi.createMaintenance(maintenanceData);
    }
    
    if (response.data && response.data.code === 200) {
      ElMessage.success('标记为已维护成功');
      // 更新本地状态
      item.status = '已处理';
      console.log('异常记录已标记为已维护:', item);
    } else {
      throw new Error(response.data?.message || '标记为已维护失败');
    }
  } catch (error) {
    console.error('标记为已维护失败:', error);
    ElMessage.error(`标记为已维护失败: ${error.message}`);
  }
};

const handleFilter = () => {
  currentPage.value = 1;
  fetchData();
};

const handlePageChange = (page) => {
  currentPage.value = page;
  fetchData();
};

onMounted(fetchData);

const getSeverityClass = (systemName) => {
  switch (systemName) {
    case '安全系统':
    case '控制系统': return 'error';
    case '曳引系统': return 'warning';
    default: return 'info';
  }
};
</script>

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
.abnormal-data-view {
  padding: 1.5vh;
  box-sizing: border-box;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.abnormal-header {
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
  overflow: hidden;
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

.abnormal-item {
  background: rgba(13, 31, 61, 0.6);
  border-radius: 8px;
  padding: 1.5vh;
  border: 1px solid rgba(33, 150, 243, 0.3);
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  max-height: 240px;
  min-height: 220px;
  backdrop-filter: blur(5px);
  overflow: hidden;
}
.abnormal-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(33, 150, 243, 0.3);
  border-color: #4dabf5;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8vh;
  padding-bottom: 0.4vh;
  border-bottom: 1px solid rgba(33, 150, 243, 0.2);
  flex-shrink: 0;
}
.item-id { font-weight: 600; font-size: 1.1rem; color: #fff; }
.item-status { font-size: 0.9rem; padding: 4px 12px; border-radius: 12px; font-weight: 500; }
.item-status.resolved { background: rgba(76, 175, 80, 0.2); color: #4caf50; }
.item-status.pending { background: rgba(255, 152, 0, 0.2); color: #ff9800; }

.item-body {
  flex-grow: 1;
  margin-bottom: 0.8vh;
  overflow: hidden;
}
.info-item {
  margin-bottom: 0.6vh;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.info-item strong { color: #fff; }

/* AI分析样式 */
.info-item.ai-analysis {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
  white-space: normal;
  line-height: 1.4;
}

.ai-result {
  color: #60a5fa;
  font-weight: 500;
  display: block;
  margin-top: 4px;
  text-shadow: 0 0 10px rgba(96, 165, 250, 0.3);
}

/* 系统名称突出显示 */
.system-name {
  font-weight: bold;
  padding: 1px 4px;
  border-radius: 3px;
  display: inline-block;
  font-size: 0.8rem;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: top;
}
.system-name.error { background: rgba(244, 67, 54, 0.2); color: #f44336; border: 1px solid rgba(244, 67, 54, 0.3); }
.system-name.warning { background: rgba(255, 152, 0, 0.2); color: #ff9800; border: 1px solid rgba(255, 152, 0, 0.3); }
.system-name.info { background: rgba(33, 150, 243, 0.2); color: #2196f3; border: 1px solid rgba(33, 150, 243, 0.3); }

.data-value {
  color: #f44336;
  font-weight: bold;
  display: inline-block;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: top;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  flex-shrink: 0;
}
.item-time { 
  font-size: 0.8rem; 
  color: var(--text-secondary); 
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}
.item-actions .el-button { 
  margin-left: 10px;
  font-size: 0.8rem;
  padding: 4px 8px;
  height: auto;
}

/* 状态指示器样式 */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #4caf50;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-indicator svg {
  width: 16px;
  height: 16px;
  color: #4caf50;
  flex-shrink: 0;
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

/* Loading and No-data states */
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

/* Date Picker Styles */
:deep(.el-date-editor) {
  background-color: rgba(13, 31, 61, 0.8) !important;
  border: none !important;
  box-shadow: none !important;
}
:deep(.el-date-editor .el-range-input) {
  color: #fff !important;
  background-color: transparent !important;
}
:deep(.el-date-editor .el-range-separator) {
  color: var(--text-secondary);
}
:deep(.el-date-editor .el-input__icon) {
  color: var(--text-secondary);
}
</style>
<style>
/* Global overrides for date picker popper, cannot be scoped */
.el-picker-panel {
  background: #1a2b47 !important;
  border: 1px solid rgba(33, 150, 243, 0.6) !important;
  color: #fff !important;
}
.el-picker-panel .el-picker-panel__icon-btn,
.el-picker-panel .el-date-picker__header-label {
  color: #fff !important;
}
.el-picker-panel .el-date-table th {
  color: var(--text-secondary);
}
.el-picker-panel .el-date-table td.in-range .el-date-table-cell {
  background-color: rgba(33, 150, 243, 0.2) !important;
}
.el-picker-panel .el-date-table td.today .el-date-table-cell__text {
  color: #4dabf5 !important;
}
.el-picker-panel .el-date-table td.available:hover {
  color: #4dabf5 !important;
}
.el-picker-panel .el-picker-panel__footer .el-button {
  background: transparent !important;
  color: #4dabf5 !important;
  border: 1px solid #4dabf5 !important;
}
.el-picker-panel .el-picker-panel__footer .el-button.is-plain:hover {
  background: rgba(33, 150, 243, 0.2) !important;
}
.el-popper__arrow::before {
  background: #1a2b47 !important;
  border-color: rgba(33, 150, 243, 0.6) !important;
}
</style>