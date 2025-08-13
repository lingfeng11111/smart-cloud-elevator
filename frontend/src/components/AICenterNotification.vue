<template>
  <div class="ai-center-notification-overlay" v-if="showNotification">
    <!-- AI模拟和ML分析弹窗 -->
    <div class="ai-center-notification" :class="[notificationClass, animationClass]" ref="notificationEl" v-if="!shouldShowMLModal">
      <div class="notification-header">
        <div class="notification-title">
          <div class="notification-icon">
            <!-- 加载中图标 -->
            <svg v-if="notificationIcon === 'loading'" class="icon-loading" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
              </circle>
            </svg>
            <!-- 错误图标 -->
            <svg v-else-if="notificationIcon === 'error'" class="icon-error" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
              <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
            </svg>
            <!-- 警告图标 -->
            <svg v-else-if="notificationIcon === 'warning'" class="icon-warning" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <circle cx="12" cy="17" r="1" fill="currentColor"/>
            </svg>
          </div>
          <h3>{{ title }}</h3>
        </div>
      </div>
      
      <div class="notification-content">
        <div class="system-info" v-if="analysisResult.systemInfo">
          <div class="system-name">{{ analysisResult.systemInfo.name }}</div>
          <div class="system-status" :class="statusClass">
            {{ analysisResult.systemInfo.status }}
          </div>
        </div>
        
        <div class="analysis-summary">
          {{ analysisResult.summary }}
        </div>
        
        <div class="analysis-details" v-if="analysisResult.details && analysisResult.details.length">
          <h4>详细分析:</h4>
          <ul>
            <li v-for="(detail, index) in analysisResult.details" :key="index">
              {{ detail }}
            </li>
          </ul>
        </div>
        
        <div class="recommendation" v-if="aiRecommendation">
          <h4>AI建议:</h4>
          <div class="recommendation-text">{{ aiRecommendation }}</div>
        </div>
      </div>
      
      <div class="notification-footer">
        <span class="timestamp">{{ formatTime(analysisResult.timestamp) }}</span>
        <div class="action-buttons">
          <button class="action-btn detail-btn" @click="viewDetails" v-if="analysisResult.systemId">
            查看系统详情
          </button>
          <button 
            class="action-btn repair-btn" 
            @click="showMaintenanceSelection" 
            v-if="severity === 'critical' || severity === 'warning'"
          >
            分配维修人员
          </button>
          <button 
            class="action-btn ignore-btn" 
            @click="ignoreWarning"
            v-if="severity === 'warning' && canClose"
          >
            忽略警告
          </button>
          <button 
            class="action-btn dismiss-btn" 
            @click="closeNotification"
            v-if="severity !== 'critical' && canClose && analysisStep !== 'deep-analyzing' && analysisStep !== 'deep-completed'"
          >
            关闭
          </button>
        </div>
      </div>
    </div>

    <!-- ML分析结果弹窗 -->
    <div class="ai-center-notification" :class="[mlModalClass, animationClass]" ref="mlModalEl" v-if="shouldShowMLModal">
      <div class="notification-header">
        <div class="notification-title">
          <div class="notification-icon">
            <!-- ML分析图标 -->
            <svg class="icon-ml" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3>前端ML模型分析完成</h3>
        </div>
      </div>
      
      <div class="notification-content">
        <div class="ml-analysis-result" v-if="quickAnalysisResult">
          <div class="severity-indicator">
            <span class="severity-label" :class="quickAnalysisResult.severity">
              {{ getSeverityText(quickAnalysisResult.severity) }}
            </span>
            <span class="confidence-score">
              置信度: {{ (quickAnalysisResult.confidence * 100).toFixed(1) }}%
            </span>
          </div>
          
          <div class="fault-info">
            <h4>故障类型</h4>
            <p class="fault-type">{{ quickAnalysisResult.faultType || '参数异常' }}</p>
            <p class="fault-description">{{ quickAnalysisResult.faultDescription || '检测到参数异常' }}</p>
          </div>
          
          <div class="parameter-details" v-if="quickAnalysisResult.parameterInfo">
            <h4>参数信息</h4>
            <div class="parameter-grid">
              <div class="parameter-item">
                <span class="label">参数名称:</span>
                <span class="value">{{ quickAnalysisResult.parameterInfo.displayName }}</span>
              </div>
              <div class="parameter-item">
                <span class="label">正常范围:</span>
                <span class="value">{{ quickAnalysisResult.parameterInfo.baseline }}</span>
              </div>
              <div class="parameter-item">
                <span class="label">当前偏差:</span>
                <span class="value">{{ quickAnalysisResult.parameterInfo.deviation }}</span>
              </div>
              <div class="parameter-item">
                <span class="label">异常评分:</span>
                <span class="value">{{ quickAnalysisResult.anomalyScore.toFixed(3) }}</span>
              </div>
            </div>
          </div>
          
          <div class="ml-recommendation" v-if="quickAnalysisResult && quickAnalysisResult.recommendation">
            <h4>ML建议</h4>
            <div class="recommendation-content">
              <!-- 对象格式的建议 -->
              <template v-if="typeof quickAnalysisResult.recommendation === 'object'">
                <p v-if="quickAnalysisResult.recommendation.main">{{ quickAnalysisResult.recommendation.main }}</p>
                <p v-if="quickAnalysisResult.recommendation.specific" class="specific-advice">
                  {{ quickAnalysisResult.recommendation.specific }}
                </p>
              </template>
              <!-- 字符串格式的建议 -->
              <template v-else-if="typeof quickAnalysisResult.recommendation === 'string'">
                <p>{{ quickAnalysisResult.recommendation }}</p>
              </template>
              <!-- 备用显示 -->
              <template v-else>
                <p>{{ aiRecommendation || '请根据分析结果进行相应处理' }}</p>
              </template>
            </div>
          </div>
        </div>
      </div>
      
      <div class="notification-footer">
        <span class="analysis-info">
          分析时间: {{ quickAnalysisResult?.analysisTime || 0 }}ms
        </span>
        <div class="action-buttons">
          <button 
            class="action-btn deep-analysis-btn" 
            @click="requestDeepAnalysis"
          >
            进行深度分析
          </button>
          <button 
            class="action-btn repair-btn" 
            :disabled="isAssigning"
            @click="acceptMLResult"
          >
            {{ isAssigning ? '分配中...' : '分配人员' }}
          </button>
          <button 
            class="action-btn ignore-btn" 
            @click="ignoreMLWarning"
            v-if="quickAnalysisResult?.severity === 'warning'"
          >
            忽略警告
          </button>
        </div>
      </div>
    </div>
    
    <!-- 维修人员选择弹窗 -->
    <div class="maintenance-modal-overlay" v-if="showMaintenanceModal" @click="closeMaintenanceModal">
      <div class="maintenance-modal" @click.stop>
        <div class="modal-header">
          <h3>选择维修人员</h3>
          <button class="close-btn" @click="closeMaintenanceModal">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>
        <div class="modal-content">
          <div class="personnel-list">
            <div 
              v-for="person in maintenancePersonnel" 
              :key="person.id"
              class="personnel-item"
              :class="{ 'selected': selectedPersonnel?.id === person.id }"
              @click="selectPersonnel(person)"
            >
              <div class="person-info">
                <div class="person-name">{{ person.name }}</div>
                <div class="person-details">{{ person.department }} | {{ person.level }}</div>
                <div class="person-status" :class="getPersonStatusClass(person.condition)">
                  {{ getPersonStatusText(person.condition) }}
                </div>
              </div>
              <div class="selection-indicator" v-if="selectedPersonnel?.id === person.id">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <polyline points="20,6 9,17 4,12" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn cancel-btn" @click="closeMaintenanceModal">取消</button>
          <button 
            class="modal-btn confirm-btn" 
            @click="assignMaintenance" 
            :disabled="!selectedPersonnel"
          >
            确认分配
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import usersApi from '../api/users';
import maintenanceApi from '../api/maintenance';
import abnormalDataApi from '../api/abnormalData';

export default {
  name: 'AICenterNotification',
  props: {
    analysisResult: {
      type: Object,
      required: true
    },
    visible: {
      type: Boolean,
      default: false
    },
    aiRecommendation: {
      type: String,
      default: ''
    },
    isProcessing: {
      type: Boolean,
      default: false
    },
    analysisStep: {
      type: String,
      default: 'idle'
    },
    simulatedData: {
      type: Object,
      default: null
    },
    quickAnalysisResult: {
      type: Object,
      default: null
    },
    isDeepAnalyzing: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      showNotification: false,
      autoCloseTimer: null,
      isClosing: false,
      animating: false,
      canClose: false,
      previousSeverity: null,
      showMaintenanceModal: false,
      maintenancePersonnel: [],
      selectedPersonnel: null,
      isAssigning: false
    };
  },
  computed: {
    severity() {
      // 根据分析步骤确定弹窗类型
      if (this.analysisStep === 'simulating' || this.analysisStep === 'analyzing' || this.analysisStep === 'ml-analyzing' || this.isProcessing) {
        return 'processing';
      }
      
      // ML分析完成时，根据ML结果确定严重程度
      if (this.analysisStep === 'final-result' && this.quickAnalysisResult) {
        return this.quickAnalysisResult.severity;
      }
      
      // 深度分析时根据分析结果确定
      if (this.analysisStep === 'deep-analyzing' || this.analysisStep === 'deep-completed') {
        return this.analysisResult.code === 1 ? 'critical' : 'warning';
      }
      
      // 其他情况根据analysisResult确定
      if (this.analysisResult && this.analysisResult.code !== undefined) {
        return this.analysisResult.code === 1 ? 'critical' : 'warning';
      }
      
      // 默认为处理中
      return 'processing';
    },
    notificationClass() {
      return `notification-${this.severity}`;
    },
    mlModalClass() {
      if (!this.quickAnalysisResult) return 'notification-processing';
      return this.quickAnalysisResult.severity === 'critical' ? 'notification-critical' : 'notification-warning';
    },
    notificationIcon() {
      if (this.severity === 'processing') return 'loading';
      return this.severity === 'critical' ? 'error' : 'warning';
    },
    title() {
      // 根据分析步骤显示不同标题
      switch (this.analysisStep) {
        case 'simulating':
          return 'AI正在模拟异常数据...';
        case 'analyzing':
        case 'ml-analyzing':
          return 'ML模型正在分析...';
        case 'final-result':
          if (this.quickAnalysisResult) {
            return this.quickAnalysisResult.severity === 'critical' ? 'ML检测到严重故障' : 'ML检测到潜在警告';
          }
          return 'ML分析完成';
        case 'deep-analyzing':
          return '云端AI正在深度分析...';
        case 'deep-completed':
          return this.severity === 'critical' ? 'AI检测到严重故障' : 'AI检测到潜在警告';
        case 'completed':
          return this.severity === 'critical' ? 'AI检测到严重故障' : 'AI检测到潜在警告';
        default:
          if (this.isProcessing) return 'AI分析中...';
          return this.severity === 'critical' ? 'AI检测到严重故障' : 'AI检测到潜在警告';
      }
    },
    statusClass() {
      if (this.analysisResult.systemInfo && this.analysisResult.systemInfo.status) {
        if (this.isProcessing) return 'status-processing';
        return this.analysisResult.systemInfo.status === '正常' 
          ? 'status-normal' 
          : 'status-error';
      }
      return '';
    },
    animationClass() {
      return this.isClosing ? 'fade-out' : 'fade-in';
    },
    // 控制ML分析结果弹窗的显示
    shouldShowMLModal() {
      // 当分析步骤为final-result且有ML分析结果时显示ML弹窗
      const shouldShow = this.analysisStep === 'final-result' && this.quickAnalysisResult;
      console.log('🎯 shouldShowMLModal计算:', {
        analysisStep: this.analysisStep,
        hasQuickAnalysisResult: !!this.quickAnalysisResult,
        shouldShow
      });
      return shouldShow;
    }
  },
  watch: {
    visible: {
      immediate: true,
      handler(newVal) {
        console.log('AICenterNotification visible属性变化:', newVal);
        
        if (newVal) {
          console.log('设置showNotification为true');
          this.showNotification = true;
          this.isClosing = false;
          // 深度分析阶段不允许关闭
          const inDeep = this.analysisStep === 'deep-analyzing' || this.analysisStep === 'deep-completed';
          this.canClose = !this.isProcessing && this.severity !== 'critical' && !inDeep;
          this.previousSeverity = this.severity;
        } else if (this.showNotification && !this.isClosing) {
          console.log('通过visible变化触发closeNotification');
          this.closeNotification();
        }
      }
    },
    analysisStep: {
      immediate: true,
      handler(newVal, oldVal) {
        console.log('🔄 analysisStep变化:', oldVal, '->', newVal);
        
        // 当进入final-result状态时，确保弹窗显示
        if (newVal === 'final-result') {
          this.showNotification = true;
          console.log('📊 进入final-result状态，确保弹窗显示');
        }
      }
    },
    quickAnalysisResult: {
      immediate: true,
      handler(newVal) {
        console.log('🔄 quickAnalysisResult变化:', newVal ? '有数据' : '无数据', '当前analysisStep:', this.analysisStep);
      }
    },
    'analysisResult': {
      deep: true,
      handler(newVal) {
        console.log('analysisResult发生变化:', newVal);
        
        if (newVal && newVal.summary && !this.isProcessing) {
          this.canClose = true;
        }
        
        if (newVal.code !== undefined && !this.isProcessing) {
          this.$nextTick(() => {
            this.triggerColorChangeAnimation(newVal.code);
          });
        }
      }
    },
    isProcessing(newVal, oldVal) {
      // 深度分析阶段不允许关闭
      const inDeep = this.analysisStep === 'deep-analyzing' || this.analysisStep === 'deep-completed';
      this.canClose = !newVal && !inDeep;
      
      if (oldVal && !newVal) {
        const currentSeverity = this.severity;
        console.log('处理状态变化，从处理中变为:', currentSeverity);
        
        this.$nextTick(() => {
          this.triggerColorChangeAnimation(this.analysisResult.code, 'processing');
        });
      }
      
      this.previousSeverity = this.severity;
    },
    severity(newVal, oldVal) {
      if (newVal !== oldVal && !this.isClosing) {
        console.log('严重性状态变化:', oldVal, '->', newVal);
        this.previousSeverity = oldVal;
      }
    }
  },
  mounted() {
    console.log('AICenterNotification mounted, visible:', this.visible);
    console.log('AICenterNotification mounted, analysisResult:', JSON.stringify(this.analysisResult));
    console.log('AICenterNotification mounted, analysisStep:', this.analysisStep);
    
    this.showNotification = this.visible;
    this.canClose = !!(this.analysisResult && this.analysisResult.summary && !this.isProcessing);
    this.previousSeverity = this.severity;
    this.loadMaintenancePersonnel();
    
    console.log('初始化showNotification为:', this.showNotification);
    console.log('初始化canClose为:', this.canClose);
    console.log('初始化previousSeverity为:', this.previousSeverity);
  },
  beforeUnmount() {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
    }
  },
  methods: {
    getSeverityText(severity) {
      const textMap = {
        'critical': '严重故障',
        'warning': '潜在警告',
        'normal': '正常'
      };
      return textMap[severity] || '未知';
    },
    acceptMLResult() {
      // 用户选择直接分配人员（接受ML分析结果）
      console.log('🔧 用户选择分配人员');
      this.showMaintenanceModal = true;
      this.$emit('accept-quick-result');
    },
    ignoreMLWarning() {
      // 用户选择忽略ML警告
      console.log('🔧 用户选择忽略ML警告');
      this.closeNotification();
      this.$emit('warning-ignored', this.quickAnalysisResult);
    },
    requestDeepAnalysis() {
      // 用户选择进行深度分析
      console.log('🔧 用户选择进行深度分析');
      this.$emit('request-deep-analysis', {
        mlResult: this.quickAnalysisResult,
        simulatedData: this.simulatedData
      });
    },
    closeNotification() {
      if (!this.canClose && this.severity === 'critical') {
        console.log('严重故障弹窗不允许关闭');
        return;
      }
      
      console.log('关闭AI分析通知，当前showNotification:', this.showNotification);
      this.isClosing = true;
      
      setTimeout(() => {
        this.showNotification = false;
        this.isClosing = false;
        console.log('动画结束后设置showNotification为false');
        this.$emit('close');
      }, 500);
    },
    showMaintenanceSelection() {
      this.showMaintenanceModal = true;
      this.selectedPersonnel = null;
    },
    closeMaintenanceModal() {
      this.showMaintenanceModal = false;
      this.selectedPersonnel = null;
    },
    selectPersonnel(person) {
      if (person.available) {
        this.selectedPersonnel = person;
      }
    },
    async assignMaintenance() {
      if (!this.selectedPersonnel) return;
      if (this.isAssigning) return;
      this.isAssigning = true;
      
      try {
        console.log('分配任务 - 选中人员:', this.selectedPersonnel);
        console.log('分配任务 - 分析结果:', this.analysisResult);
        console.log('分配任务 - mtDataId:', this.analysisResult.mtDataId);
        
        if (!this.selectedPersonnel.id) {
          throw new Error('缺少用户ID');
        }
        
        // 如果没有mtDataId，需要先创建异常数据记录（特别是ML分析结果）
        let finalMtDataId = this.analysisResult.mtDataId;
        
        if (!finalMtDataId && this.quickAnalysisResult && this.shouldShowMLModal) {
          console.log('🔄 ML分析结果没有mtDataId，先创建异常数据记录');
          try {
            const abnormalDataResponse = await abnormalDataApi.createAbnormalData({
              systemName: this.simulatedData?.systemName || 'ML检测系统',
              systemSqName: this.simulatedData?.systemSqName || 'ML组件',
              eName: this.simulatedData?.eName || 'ML检测异常',
              eData: this.simulatedData?.eData || '0'
            });
            
            if (abnormalDataResponse.data && abnormalDataResponse.data.code === 200) {
              // 后端返回的 data 可能是 JSON 字符串，需要解析以获取 mtDataId
              let raw = abnormalDataResponse.data.data;
              let parsed;
              try {
                if (typeof raw === 'string') {
                  parsed = JSON.parse(raw);
                } else if (raw && typeof raw === 'object') {
                  parsed = raw;
                } else {
                  parsed = {};
                }
              } catch (e) {
                console.warn('解析异常数据返回失败，原始值:', raw);
                throw new Error('解析异常数据返回失败');
              }

              const mtId = parsed.mtDataId ?? parsed.id;
              const mtIdNum = Number(mtId);
              if (!mtId || Number.isNaN(mtIdNum)) {
                console.error('返回缺少有效的 mtDataId:', parsed);
                throw new Error('后端未返回有效的异常数据ID');
              }
              finalMtDataId = mtIdNum;
              console.log('✅ 成功创建异常数据记录，mtDataId:', finalMtDataId, '解析对象:', parsed);
            } else {
              throw new Error('创建异常数据记录失败');
            }
          } catch (createError) {
            console.error('创建异常数据记录失败:', createError);
            throw new Error('创建异常数据记录失败: ' + createError.message);
          }
        } else if (!finalMtDataId) {
          throw new Error('缺少异常数据ID');
        }
        
        // 根据分析类型构建任务数据
        let systemName, summary, mtDataId;
        
        if (this.quickAnalysisResult && this.shouldShowMLModal) {
          // ML分析结果
          systemName = this.simulatedData?.systemName || 'ML检测系统';
          summary = this.quickAnalysisResult.faultDescription || this.quickAnalysisResult.faultType || 'ML检测到异常';
          mtDataId = this.simulatedData?.id || this.analysisResult.mtDataId;
        } else {
          // 传统AI分析结果
          systemName = this.analysisResult.systemInfo?.name || '';
          summary = this.analysisResult.summary;
          mtDataId = this.analysisResult.mtDataId;
        }
        
        // 后端 MaintainTable 不接收 systemName，且 userId/mtDataId 需为整数
        const userIdNum = Number(this.selectedPersonnel.id);
        const mtDataIdNum = Number(finalMtDataId);
        if (Number.isNaN(userIdNum) || Number.isNaN(mtDataIdNum)) {
          throw new Error('用户ID或异常数据ID格式错误');
        }
        const assignmentData = {
          userId: userIdNum,
          mtDataId: mtDataIdNum,
          status: '待处理',
          remark: `${this.shouldShowMLModal ? 'ML模型' : 'AI'}检测到${summary}，分配给${this.selectedPersonnel.name}处理`
        };
        
        console.log('分配任务 - 请求数据:', assignmentData);
        
        const response = await maintenanceApi.createMaintenance(assignmentData);
        
        if (response.data && response.data.code === 200) {
          console.log('维修任务分配成功:', this.selectedPersonnel);
          
          try {
            await usersApi.updateUserStatus(this.selectedPersonnel.id, '忙碌');
            console.log('用户状态已更新为忙碌');
            
            const personnelIndex = this.maintenancePersonnel.findIndex(p => p.id === this.selectedPersonnel.id);
            if (personnelIndex !== -1) {
              this.maintenancePersonnel[personnelIndex].condition = '忙碌';
              this.maintenancePersonnel[personnelIndex].available = false;
            }
            
            await this.loadMaintenancePersonnel();
          } catch (statusError) {
            console.error('更新用户状态失败:', statusError);
          }
          
          this.$emit('maintenance-assigned', {
            personnel: this.selectedPersonnel,
            issue: this.analysisResult,
            success: true
          });
          
          this.$message?.success(`已成功将任务分配给${this.selectedPersonnel.name}`);
        } else {
          throw new Error(response.data?.message || '分配任务失败');
        }
      } catch (error) {
        console.error('分配维修任务失败:', error);
        
        this.$emit('maintenance-assigned', {
          personnel: this.selectedPersonnel,
          issue: this.analysisResult,
          success: false,
          error: error.message
        });
        
        this.$message?.error(`分配任务失败: ${error.message}`);
      } finally {
        this.isAssigning = false;
      }
      
      this.closeMaintenanceModal();
      this.closeNotification();
    },
    ignoreWarning() {
      console.log('忽略警告:', this.analysisResult);
      this.$emit('warning-ignored', this.analysisResult);
      this.closeNotification();
    },
    async loadMaintenancePersonnel() {
       try {
         const response = await usersApi.getUsers();
         if (response.data && response.data.data) {
           this.maintenancePersonnel = response.data.data
             .filter(user => user.position === '维护人员' || user.position === '技术人员')
             .map(user => ({
               id: user.id,
               name: user.userName,
               department: user.position === '维护人员' ? '维护部' : '技术部',
               level: user.position,
               available: user.condition === '空闲' || user.condition === 'active',
               condition: user.condition || '未知',
               phone: user.userPhone,
               email: user.email
             }));
         }
       } catch (error) {
         console.error('获取维修人员列表失败:', error);
         this.maintenancePersonnel = [
           {
             id: 1,
             name: '张师傅',
             department: '维护部',
             level: '维护人员',
             available: true,
             condition: '空闲'
           },
           {
             id: 2,
             name: '李工程师',
             department: '技术部',
             level: '技术人员',
             available: true,
             condition: '空闲'
           }
         ];
       }
     },
    viewDetails() {
       if (this.analysisResult.systemId) {
         this.$emit('system-details', this.analysisResult.systemId);
       }
     },
     getPersonStatusClass(condition) {
       switch (condition) {
         case '空闲':
         case 'active':
           return 'available';
         case '忙碌':
         case 'busy':
           return 'busy';
         case '离线':
         case 'offline':
           return 'offline';
         default:
           return 'unknown';
       }
     },
     getPersonStatusText(condition) {
       switch (condition) {
         case '空闲':
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
     },
    formatTime(timestamp) {
      if (!timestamp) return '';
      
      const date = new Date(timestamp);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    },
    triggerColorChangeAnimation(code, fromState = null) {
      if (this.animating) return;
      
      const notification = this.$refs.notificationEl;
      if (!notification) {
        console.error('无法找到通知元素，动画未执行');
        return;
      }
      
      const sourceState = fromState || this.previousSeverity || 'processing';
      const targetState = code === 1 ? 'critical' : 'warning';
      
      console.log(`触发颜色变化动画，从 ${sourceState} 到 ${targetState}, code:`, code);
      this.animating = true;
      
      notification.classList.remove(
        'transition-to-critical', 
        'transition-to-warning', 
        'transition-from-processing-to-critical',
        'transition-from-processing-to-warning'
      );
      
      if (sourceState === 'processing') {
        if (targetState === 'critical') {
          notification.classList.add('transition-to-critical');
        } else {
          notification.classList.add('transition-to-warning');
        }
      } else if (sourceState === 'warning' && targetState === 'critical') {
        notification.classList.add('transition-to-critical');
      } else if (sourceState === 'critical' && targetState === 'warning') {
        notification.classList.add('transition-to-warning');
      }
      
      setTimeout(() => {
        this.animating = false;
        this.previousSeverity = targetState;
      }, 1500);
    }
  }
};
</script>

<style scoped>
.ai-center-notification-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
}

.ai-center-notification {
  width: 500px;
  max-width: 90vw;
  max-height: 80vh;
  background: rgba(16, 20, 28, 0.75);
  border-radius: 12px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(100, 181, 246, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.5s ease-out;
  position: relative;
  border: 1px solid rgba(100, 181, 246, 0.15);
}

.ai-center-notification::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0) 50%),
    repeating-linear-gradient(rgba(255, 255, 255, 0.05) 0px, rgba(255, 255, 255, 0) 1px, rgba(255, 255, 255, 0) 4px);
  pointer-events: none;
  border-radius: 12px;
  z-index: -1;
}

.notification-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.notification-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(to right, 
    rgba(255, 255, 255, 0), 
    rgba(255, 255, 255, 0.3), 
    rgba(255, 255, 255, 0));
}

.notification-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notification-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.2);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
}

.notification-icon svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.icon-loading {
  color: #64b5f6;
}

.icon-error {
  color: #ff5252;
}

.icon-warning {
  color: #ffa726;
}

.notification-title h3 {
  margin: 0;
  font-size: 1.4rem;
  color: #fff;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
}

.notification-content {
  padding: 20px;
  overflow-y: auto;
  flex-grow: 1;
}

.system-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}

.system-info::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(to right, 
    rgba(255, 255, 255, 0), 
    rgba(255, 255, 255, 0.2), 
    rgba(255, 255, 255, 0));
}

.system-name {
  font-weight: bold;
  font-size: 1.2rem;
  color: #e0e0e0;
}

.status-error {
  font-weight: bold;
  color: #ff5252;
  text-shadow: 0 0 5px rgba(255, 82, 82, 0.5);
}

.status-normal {
  font-weight: bold;
  color: #66bb6a;
  text-shadow: 0 0 5px rgba(102, 187, 106, 0.5);
}

.status-processing {
  font-weight: bold;
  color: #64b5f6;
  text-shadow: 0 0 5px rgba(100, 181, 246, 0.5);
}

.analysis-summary {
  margin-bottom: 15px;
  color: rgba(255, 255, 255, 0.95);
  line-height: 1.5;
  font-size: 1.1rem;
}

.analysis-details h4,
.recommendation h4 {
  margin: 15px 0 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.1rem;
}

.analysis-details ul {
  margin: 5px 0;
  padding-left: 20px;
  color: rgba(255, 255, 255, 0.8);
}

.analysis-details li {
  margin-bottom: 8px;
  line-height: 1.4;
}

.recommendation-text {
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
  margin-top: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.notification-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
}

.notification-footer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(to right, 
    rgba(255, 255, 255, 0), 
    rgba(255, 255, 255, 0.2), 
    rgba(255, 255, 255, 0));
}

.timestamp {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.action-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
  white-space: nowrap;
  min-width: 90px;
}

.action-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    rgba(255, 255, 255, 0), 
    rgba(255, 255, 255, 0.1), 
    rgba(255, 255, 255, 0));
  transition: all 0.6s;
}

.action-btn:hover::before {
  left: 100%;
}

.detail-btn {
  background: rgba(25, 118, 210, 0.3);
  color: #64b5f6;
  border: 1px solid rgba(25, 118, 210, 0.4);
  box-shadow: 0 0 5px rgba(100, 181, 246, 0.3);
}

.detail-btn:hover {
  background: rgba(25, 118, 210, 0.4);
  box-shadow: 0 0 8px rgba(100, 181, 246, 0.5);
}

.repair-btn {
  background: rgba(46, 125, 50, 0.3);
  color: #81c784;
  border: 1px solid rgba(46, 125, 50, 0.4);
  font-weight: bold;
  box-shadow: 0 0 5px rgba(129, 199, 132, 0.3);
}

.repair-btn:hover {
  background: rgba(46, 125, 50, 0.4);
  box-shadow: 0 0 8px rgba(129, 199, 132, 0.5);
}

.ignore-btn {
  background: rgba(255, 152, 0, 0.3);
  color: #ffb74d;
  border: 1px solid rgba(255, 152, 0, 0.4);
  font-weight: bold;
  box-shadow: 0 0 5px rgba(255, 183, 77, 0.3);
}

.ignore-btn:hover {
  background: rgba(255, 152, 0, 0.4);
  box-shadow: 0 0 8px rgba(255, 183, 77, 0.5);
}

.dismiss-btn {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.dismiss-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 通知颜色样式 */
.notification-critical {
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(211, 47, 47, 0.3);
  background: linear-gradient(135deg, rgba(103, 53, 53, 0.75) 0%, rgba(16, 20, 28, 0.75) 100%);
  border: 1px solid rgba(211, 47, 47, 0.3);
}

.notification-warning {
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(249, 168, 37, 0.3);
  background: linear-gradient(135deg, rgba(83, 75, 43, 0.75) 0%, rgba(16, 20, 28, 0.75) 100%);
  border: 1px solid rgba(249, 168, 37, 0.3);
}

.notification-processing {
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(25, 118, 210, 0.3);
  background: linear-gradient(135deg, rgba(43, 65, 83, 0.75) 0%, rgba(16, 20, 28, 0.75) 100%);
  border: 1px solid rgba(25, 118, 210, 0.3);
}

/* 颜色变化动画 */
@keyframes to-critical {
  0% { 
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(25, 118, 210, 0.3);
    background: linear-gradient(135deg, rgba(43, 65, 83, 0.75) 0%, rgba(16, 20, 28, 0.75) 100%);
    border: 1px solid rgba(25, 118, 210, 0.3);
  }
  25% { 
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(249, 168, 37, 0.3);
    background: linear-gradient(135deg, rgba(83, 75, 43, 0.75) 0%, rgba(16, 20, 28, 0.75) 100%);
    border: 1px solid rgba(249, 168, 37, 0.3);
  }
  50% { 
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 111, 0, 0.3);
    background: linear-gradient(135deg, rgba(93, 64, 43, 0.75) 0%, rgba(16, 20, 28, 0.75) 100%);
    border: 1px solid rgba(255, 111, 0, 0.3);
  }
  100% { 
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(211, 47, 47, 0.3);
    background: linear-gradient(135deg, rgba(103, 53, 53, 0.75) 0%, rgba(16, 20, 28, 0.75) 100%);
    border: 1px solid rgba(211, 47, 47, 0.3);
  }
}

@keyframes to-warning {
  0% { 
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(25, 118, 210, 0.3);
    background: linear-gradient(135deg, rgba(43, 65, 83, 0.75) 0%, rgba(16, 20, 28, 0.75) 100%);
    border: 1px solid rgba(25, 118, 210, 0.3);
  }
  50% { 
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 111, 0, 0.3);
    background: linear-gradient(135deg, rgba(93, 64, 43, 0.75) 0%, rgba(16, 20, 28, 0.75) 100%);
    border: 1px solid rgba(255, 111, 0, 0.3);
  }
  100% { 
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(249, 168, 37, 0.3);
    background: linear-gradient(135deg, rgba(83, 75, 43, 0.75) 0%, rgba(16, 20, 28, 0.75) 100%);
    border: 1px solid rgba(249, 168, 37, 0.3);
  }
}

.transition-to-critical {
  animation: to-critical 1.5s ease-in-out forwards;
}

.transition-to-warning {
  animation: to-warning 1.5s ease-in-out forwards;
}

/* 淡入淡出动画 */
.fade-in {
  animation: fade-in 0.5s cubic-bezier(0.19, 1, 0.22, 1) forwards;
}

.fade-out {
  animation: fade-out 0.5s cubic-bezier(0.19, 1, 0.22, 1) forwards;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
    filter: blur(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@keyframes fade-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
  to {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
    filter: blur(5px);
  }
}

/* 处理中状态的动画 */
.notification-processing .notification-header {
  background: rgba(25, 118, 210, 0.2);
  position: relative;
  overflow: hidden;
}

.notification-processing .notification-header::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 200%;
  height: 100%;
  background: linear-gradient(90deg, 
    rgba(25, 118, 210, 0), 
    rgba(25, 118, 210, 0.2), 
    rgba(25, 118, 210, 0));
  animation: header-shine 2s linear infinite;
}

@keyframes header-shine {
  0% { transform: translateX(0); }
  100% { transform: translateX(50%); }
}

.notification-icon {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}

.notification-processing .notification-icon {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 添加边缘发光效果 */
.notification-critical::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 12px;
  box-shadow: inset 0 0 15px rgba(211, 47, 47, 0.3);
  pointer-events: none;
}

.notification-warning::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 12px;
  box-shadow: inset 0 0 15px rgba(249, 168, 37, 0.3);
  pointer-events: none;
}

.notification-processing::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 12px;
  box-shadow: inset 0 0 15px rgba(25, 118, 210, 0.3);
  pointer-events: none;
  animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {
  0% { box-shadow: inset 0 0 15px rgba(25, 118, 210, 0.2); }
  50% { box-shadow: inset 0 0 20px rgba(25, 118, 210, 0.4); }
  100% { box-shadow: inset 0 0 15px rgba(25, 118, 210, 0.2); }
}

/* ML分析结果弹窗样式 */
.ml-analysis-result {
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
  margin-top: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.severity-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.severity-label {
  font-size: 1.1rem;
  font-weight: bold;
  padding: 4px 12px;
  border-radius: 12px;
  display: inline-block;
}

.severity-label.critical {
  background: rgba(103, 53, 53, 0.75);
  color: #ff5252;
  border: 1px solid rgba(211, 47, 47, 0.3);
}

.severity-label.warning {
  background: rgba(83, 75, 43, 0.75);
  color: #ffa726;
  border: 1px solid rgba(249, 168, 37, 0.3);
}

.severity-label.normal {
  background: rgba(43, 65, 83, 0.75);
  color: #66bb6a;
  border: 1px solid rgba(102, 187, 106, 0.3);
}

.confidence-score {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
}

.fault-info {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.fault-info h4 {
  margin: 0 0 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.1rem;
}

.fault-type {
  font-weight: bold;
  color: #ff5252;
  text-shadow: 0 0 5px rgba(255, 82, 82, 0.5);
}

.fault-description {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.95rem;
}

.parameter-details {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.parameter-details h4 {
  margin: 0 0 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.1rem;
}

.parameter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.parameter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
}

.label {
  font-weight: bold;
  color: #64b5f6;
}

.value {
  text-align: right;
  color: #e0e0e0;
}

.ml-recommendation {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.ml-recommendation h4 {
  margin: 0 0 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.1rem;
}

.recommendation-content {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
}

.specific-advice {
  margin-top: 8px;
  color: #ffb74d;
  font-style: italic;
}

.analysis-info {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
}

.deep-analysis-btn {
  background: rgba(25, 118, 210, 0.3);
  color: #64b5f6;
  border: 1px solid rgba(25, 118, 210, 0.4);
  box-shadow: 0 0 5px rgba(100, 181, 246, 0.3);
}

.deep-analysis-btn:hover {
  background: rgba(25, 118, 210, 0.4);
  box-shadow: 0 0 8px rgba(100, 181, 246, 0.5);
}

/* 维修人员选择弹窗样式 */
.maintenance-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(8px);
}

.maintenance-modal {
  width: 450px;
  max-width: 90vw;
  max-height: 80vh;
  background: rgba(16, 20, 28, 0.95);
  border-radius: 12px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(100, 181, 246, 0.2);
  border: 1px solid rgba(100, 181, 246, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: modal-fade-in 0.3s ease-out;
}

@keyframes modal-fade-in {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h3 {
  margin: 0;
  color: #fff;
  font-size: 1.3rem;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.close-btn svg {
  width: 20px;
  height: 20px;
  color: rgba(255, 255, 255, 0.7);
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.personnel-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.personnel-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.personnel-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    rgba(100, 181, 246, 0), 
    rgba(100, 181, 246, 0.1), 
    rgba(100, 181, 246, 0));
  transition: all 0.6s;
}

.personnel-item:hover::before {
  left: 100%;
}

.personnel-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(100, 181, 246, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.personnel-item.selected {
  background: rgba(100, 181, 246, 0.15);
  border-color: rgba(100, 181, 246, 0.5);
  box-shadow: 0 0 15px rgba(100, 181, 246, 0.3);
}

.personnel-item:not(.selected):has(.person-status.busy) {
  opacity: 0.6;
  cursor: not-allowed;
}

.person-info {
  flex: 1;
}

.person-name {
  font-size: 1.1rem;
  font-weight: bold;
  color: #fff;
  margin-bottom: 4px;
}

.person-details {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 6px;
}

.person-status {
  font-size: 0.85rem;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-block;
}

.person-status.available {
  background: rgba(76, 175, 80, 0.2);
  color: #81c784;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.person-status.busy {
  background: rgba(244, 67, 54, 0.2);
  color: #e57373;
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.person-status.offline {
  background: rgba(158, 158, 158, 0.2);
  color: #bdbdbd;
  border: 1px solid rgba(158, 158, 158, 0.3);
}

.person-status.unknown {
  background: rgba(255, 87, 34, 0.2);
  color: #ff8a65;
  border: 1px solid rgba(255, 87, 34, 0.3);
}

.selection-indicator {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(100, 181, 246, 0.2);
  border-radius: 50%;
  border: 2px solid #64b5f6;
}

.selection-indicator svg {
  width: 14px;
  height: 14px;
  color: #64b5f6;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.modal-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    rgba(255, 255, 255, 0), 
    rgba(255, 255, 255, 0.1), 
    rgba(255, 255, 255, 0));
  transition: all 0.6s;
}

.modal-btn:hover::before {
  left: 100%;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.confirm-btn {
  background: rgba(46, 125, 50, 0.3);
  color: #81c784;
  border: 1px solid rgba(46, 125, 50, 0.4);
  font-weight: bold;
}

.confirm-btn:hover:not(:disabled) {
  background: rgba(46, 125, 50, 0.4);
  box-shadow: 0 0 10px rgba(129, 199, 132, 0.4);
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>