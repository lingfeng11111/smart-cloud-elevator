<template>
  <div class="ml-performance-monitor">
    <!-- 性能概览卡片 -->
    <div class="performance-overview">
      <h3>
        <i class="fas fa-chart-line"></i>
        ML分析性能监控
      </h3>
      
      <!-- 核心指标 -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">{{ performanceData.totalAnalyses || 0 }}</div>
          <div class="metric-label">总分析次数</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-value">{{ formatTime(performanceData.averageAnalysisTime) }}</div>
          <div class="metric-label">平均分析时间</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-value">{{ formatPercentage(performanceData.cacheHitRate) }}</div>
          <div class="metric-label">缓存命中率</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-value">{{ formatTime(performanceData.dataLoadTime) }}</div>
          <div class="metric-label">数据加载时间</div>
        </div>
      </div>
    </div>

    <!-- 数据集状态 -->
    <div class="dataset-status">
      <h4>
        <i class="fas fa-database"></i>
        数据集状态
        <span v-if="datasetStatus.loading" class="loading-indicator">
          <i class="fas fa-spinner fa-spin"></i>
        </span>
      </h4>
      
      <div v-if="datasetStatus.error" class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        {{ datasetStatus.error }}
      </div>
      
              <div v-else-if="datasetStatus.loaded" class="dataset-grid">
          <div 
            v-for="(stats, system) in (datasetStatus.stats || {})" 
            :key="system"
            class="dataset-card"
            v-show="stats && typeof stats === 'object'"
          >
          <div class="system-name">{{ system }}</div>
                      <div class="dataset-info">
              <div class="sample-count">
                <span class="count">{{ stats?.samples || 0 }}</span>
                <span class="label">样本</span>
              </div>
              <div class="severity-breakdown">
                <div class="severity-item normal">
                  <span class="dot"></span>
                  正常: {{ stats?.normal || 0 }}
                </div>
                <div class="severity-item warning">
                  <span class="dot"></span>
                  警告: {{ stats?.warning || 0 }}
                </div>
                <div class="severity-item critical">
                  <span class="dot"></span>
                  严重: {{ stats?.critical || 0 }}
                </div>
              </div>
            </div>
        </div>
      </div>
      
      <div v-else class="no-data">
        <i class="fas fa-inbox"></i>
        <p>数据集未加载</p>
        <button @click="loadDatasets" class="load-btn">
          <i class="fas fa-download"></i>
          加载数据集
        </button>
      </div>
    </div>

    <!-- ML模型状态 -->
    <div class="ml-status">
      <h4>
        <i class="fas fa-brain"></i>
        ML模型状态
      </h4>
      
      <div class="status-grid">
        <div class="status-item">
          <div class="status-indicator" :class="{ active: isMLInitialized }"></div>
          <div class="status-text">
            <div class="status-title">模型状态</div>
            <div class="status-value">{{ isMLInitialized ? '已初始化' : '未初始化' }}</div>
          </div>
        </div>
        
        <div class="status-item">
          <div class="status-text">
            <div class="status-title">初始化时间</div>
            <div class="status-value">{{ formatTime(performanceData.initTime) }}</div>
          </div>
        </div>
        
        <div class="status-item">
          <div class="status-text">
            <div class="status-title">规则引擎使用</div>
            <div class="status-value">{{ performanceData.ruleEngineUsage || 0 }} 次</div>
          </div>
        </div>
        
        <div class="status-item">
          <div class="status-text">
            <div class="status-title">ML模型使用</div>
            <div class="status-value">{{ performanceData.mlModelUsage || 0 }} 次</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 性能建议 -->
    <div v-if="recommendations.length > 0" class="recommendations">
      <h4>
        <i class="fas fa-lightbulb"></i>
        性能优化建议
      </h4>
      <div class="recommendation-list">
        <div 
          v-for="(recommendation, index) in recommendations" 
          :key="index"
          class="recommendation-item"
        >
          <i class="fas fa-arrow-right"></i>
          {{ recommendation }}
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <button @click="refreshStats" class="action-btn primary">
        <i class="fas fa-sync-alt"></i>
        刷新统计
      </button>
      
      <button @click="clearCache" class="action-btn secondary">
        <i class="fas fa-trash"></i>
        清理缓存
      </button>
      
      <button @click="exportStats" class="action-btn secondary">
        <i class="fas fa-download"></i>
        导出统计
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useAIAnalysis } from '../composables/useAIAnalysis';

export default {
  name: 'MLPerformanceMonitor',
  setup() {
    let composableData;
    try {
      composableData = useAIAnalysis();
    } catch (error) {
      console.error('useAIAnalysis初始化失败:', error);
      // 提供默认值
      composableData = {
        performanceMetrics: ref({
          initTime: 0,
          analysisTime: 0,
          ruleEngineUsage: 0,
          mlModelUsage: 0,
          dataLoadTime: 0,
          cacheHitRate: 0
        }),
        datasetStatus: ref({
          loaded: false,
          loading: false,
          error: '组件初始化失败',
          stats: {}
        }),
        preloadDatasets: () => Promise.resolve(),
        csvDataLoader: { clearCache: () => {} },
        getPerformanceStats: () => Promise.resolve({})
      };
    }
    
    const {
      performanceMetrics,
      datasetStatus,
      preloadDatasets,
      csvDataLoader,
      getPerformanceStats
    } = composableData;

    const isMLInitialized = ref(false);
    const recommendations = ref([]);

    // 计算属性
    const performanceData = computed(() => performanceMetrics.value);

    // 格式化时间（毫秒转换为可读格式）
    const formatTime = (ms) => {
      if (!ms || ms === 0) return '0ms';
      if (ms < 1000) return `${Math.round(ms)}ms`;
      return `${(ms / 1000).toFixed(2)}s`;
    };

    // 格式化百分比
    const formatPercentage = (value) => {
      if (!value || value === 0) return '0%';
      return `${(value * 100).toFixed(1)}%`;
    };

    // 加载数据集
    const loadDatasets = async () => {
      try {
        await preloadDatasets();
      } catch (error) {
        console.error('加载数据集失败:', error);
      }
    };

    // 刷新统计信息
    const refreshStats = async () => {
      try {
        const stats = await getPerformanceStats();
        
        // 更新ML初始化状态
        isMLInitialized.value = stats.mlInitialized || false;
        
        // 生成性能建议
        generateRecommendations(stats);
        
        console.log('📊 性能统计已刷新:', stats);
      } catch (error) {
        console.error('刷新统计失败:', error);
      }
    };

    // 生成性能建议
    const generateRecommendations = (stats) => {
      const newRecommendations = [];
      
      if (stats.averageAnalysisTime > 100) {
        newRecommendations.push('分析时间较长，建议优化算法或增加缓存');
      }
      
      if (stats.cacheHitRate < 0.3) {
        newRecommendations.push('缓存命中率低，建议增加缓存大小或优化缓存策略');
      }
      
      if (!stats.mlInitialized) {
        newRecommendations.push('ML模型未初始化，建议检查TensorFlow.js加载状态');
      }
      
      if (stats.dataLoadTime > 2000) {
        newRecommendations.push('数据加载时间较长，建议启用数据预加载');
      }
      
      if (stats.mlModelUsage === 0 && stats.ruleEngineUsage > 10) {
        newRecommendations.push('ML模型未被使用，建议检查模型初始化状态');
      }
      
      recommendations.value = newRecommendations;
    };

    // 清理缓存
    const clearCache = () => {
      try {
        if (csvDataLoader && typeof csvDataLoader.clearCache === 'function') {
          csvDataLoader.clearCache();
        }
        
        // 重置性能指标
        if (performanceMetrics && performanceMetrics.value) {
          performanceMetrics.value = {
            initTime: 0,
            analysisTime: 0,
            ruleEngineUsage: 0,
            mlModelUsage: 0,
            dataLoadTime: 0,
            cacheHitRate: 0
          };
        }
        
        console.log('🧹 缓存已清理');
      } catch (error) {
        console.error('清理缓存失败:', error);
      }
    };

    // 导出统计数据
    const exportStats = () => {
      try {
        const statsData = {
          performance: performanceData.value,
          dataset: datasetStatus.value,
          timestamp: new Date().toISOString(),
          recommendations: recommendations.value
        };
        
        const dataStr = JSON.stringify(statsData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `ml-performance-stats-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        console.log('📊 统计数据已导出');
      } catch (error) {
        console.error('导出统计失败:', error);
      }
    };

    // 监听数据集状态变化
    watch(datasetStatus, (newStatus) => {
      if (newStatus.loaded && !newStatus.loading) {
        refreshStats();
      }
    }, { deep: true });

    // 组件挂载时初始化
    onMounted(() => {
      refreshStats();
      
      // 如果数据集未加载，自动加载
      if (!datasetStatus.value.loaded && !datasetStatus.value.loading) {
        loadDatasets();
      }
    });

    return {
      performanceData,
      datasetStatus,
      isMLInitialized,
      recommendations,
      formatTime,
      formatPercentage,
      loadDatasets,
      refreshStats,
      clearCache,
      exportStats
    };
  }
};
</script>

<style scoped>
.ml-performance-monitor {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  color: white;
  font-family: 'Microsoft YaHei', Arial, sans-serif;
}

.performance-overview h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
}

.metric-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  text-align: center;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 5px;
  color: #fff;
}

.metric-label {
  font-size: 12px;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dataset-status, .ml-status, .recommendations {
  margin-top: 25px;
}

.dataset-status h4, .ml-status h4, .recommendations h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.loading-indicator {
  margin-left: 10px;
}

.error-message {
  background: rgba(255, 107, 107, 0.2);
  border: 1px solid rgba(255, 107, 107, 0.4);
  border-radius: 6px;
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dataset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.dataset-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.system-name {
  font-weight: 600;
  margin-bottom: 10px;
  font-size: 14px;
}

.sample-count {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-bottom: 10px;
}

.sample-count .count {
  font-size: 20px;
  font-weight: 700;
}

.sample-count .label {
  font-size: 12px;
  opacity: 0.8;
}

.severity-breakdown {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.severity-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.severity-item .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.severity-item.normal .dot {
  background: #4ade80;
}

.severity-item.warning .dot {
  background: #fbbf24;
}

.severity-item.critical .dot {
  background: #f87171;
}

.no-data {
  text-align: center;
  padding: 30px;
  opacity: 0.7;
}

.no-data i {
  font-size: 48px;
  margin-bottom: 15px;
  opacity: 0.5;
}

.load-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px auto 0;
}

.load-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.status-indicator.active {
  background: #4ade80;
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.5);
}

.status-text {
  flex: 1;
}

.status-title {
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 2px;
}

.status-value {
  font-size: 14px;
  font-weight: 600;
}

.recommendation-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recommendation-item {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.actions {
  margin-top: 25px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 10px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.action-btn.primary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.action-btn.primary:hover {
  background: rgba(255, 255, 255, 0.3);
}

.action-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .ml-performance-monitor {
    padding: 15px;
  }
  
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .dataset-grid {
    grid-template-columns: 1fr;
  }
  
  .status-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .actions {
    flex-direction: column;
  }
}
</style> 