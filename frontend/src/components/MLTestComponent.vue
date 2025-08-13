<template>
  <div class="ml-test-component">
    <h3>🧪 ML功能测试</h3>
    
    <!-- 状态显示 -->
    <div class="status-section">
      <div class="status-item" :class="{ success: !hasErrors, error: hasErrors }">
        <i :class="hasErrors ? 'fas fa-exclamation-triangle' : 'fas fa-check-circle'"></i>
        {{ hasErrors ? '存在错误' : '功能正常' }}
      </div>
      
      <div class="status-item">
        <i class="fas fa-database"></i>
        数据加载器: {{ csvLoaderStatus }}
      </div>
      
      <div class="status-item">
        <i class="fas fa-brain"></i>
        ML分析器: {{ mlAnalyzerStatus }}
      </div>
    </div>

    <!-- 错误信息 -->
    <div v-if="errors.length > 0" class="error-section">
      <h4>🔍 检测到的错误:</h4>
      <ul>
        <li v-for="(error, index) in errors" :key="index" class="error-item">
          {{ error }}
        </li>
      </ul>
    </div>

    <!-- 测试按钮 -->
    <div class="test-section">
      <button @click="testBasicFunctions" :disabled="isLoading" class="test-btn">
        <i class="fas fa-play"></i>
        {{ isLoading ? '测试中...' : '基础功能测试' }}
      </button>
      
      <button @click="testDataGeneration" :disabled="isLoading" class="test-btn">
        <i class="fas fa-cog"></i>
        测试数据生成
      </button>
      
      <button @click="testMLAnalysis" :disabled="isLoading" class="test-btn">
        <i class="fas fa-chart-line"></i>
        测试ML分析
      </button>
    </div>

    <!-- 测试结果 -->
    <div v-if="testResults.length > 0" class="results-section">
      <h4>📊 测试结果:</h4>
      <div class="results-list">
        <div 
          v-for="(result, index) in testResults" 
          :key="index" 
          class="result-item"
          :class="{ success: result.success, error: !result.success }"
        >
          <i :class="result.success ? 'fas fa-check' : 'fas fa-times'"></i>
          <span class="result-name">{{ result.name }}</span>
          <span class="result-time">{{ result.time }}ms</span>
          <div v-if="result.error" class="result-error">{{ result.error }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';

export default {
  name: 'MLTestComponent',
  setup() {
    const errors = ref([]);
    const csvLoaderStatus = ref('检查中...');
    const mlAnalyzerStatus = ref('检查中...');
    const isLoading = ref(false);
    const testResults = ref([]);

    const hasErrors = computed(() => errors.value.length > 0);

    // 基础状态检查
    const checkBasicStatus = async () => {
      errors.value = [];
      
      try {
        // 检查useAIAnalysis
        const { useAIAnalysis } = await import('../composables/useAIAnalysis');
        const aiAnalysis = useAIAnalysis();
        
        // 检查CSV数据加载器
        if (!aiAnalysis.csvDataLoader) {
          errors.value.push('CSV数据加载器未初始化');
          csvLoaderStatus.value = '❌ 未初始化';
        } else {
          csvLoaderStatus.value = '✅ 已初始化';
        }
        
        // 检查ML分析器
        try {
          await aiAnalysis.initializeMLAnalyzer();
          mlAnalyzerStatus.value = '✅ 已初始化';
        } catch (error) {
          mlAnalyzerStatus.value = '⚠️ 初始化失败';
          errors.value.push(`ML分析器初始化失败: ${error.message}`);
        }
        
      } catch (error) {
        errors.value.push(`模块加载失败: ${error.message}`);
        csvLoaderStatus.value = '❌ 加载失败';
        mlAnalyzerStatus.value = '❌ 加载失败';
      }
    };

    // 测试基础功能
    const testBasicFunctions = async () => {
      isLoading.value = true;
      testResults.value = [];
      
      const tests = [
        {
          name: '模块导入测试',
          test: async () => {
            const { useAIAnalysis } = await import('../composables/useAIAnalysis');
            return useAIAnalysis();
          }
        },
        {
          name: 'CSV数据加载器测试',
          test: async () => {
            const CSVDataLoader = (await import('../services/CSVDataLoader')).default;
            const loader = new CSVDataLoader();
            return loader;
          }
        },
        {
          name: 'ML分析器测试',
          test: async () => {
            const ElevatorMLAnalyzer = (await import('../services/ElevatorMLAnalyzer')).default;
            const analyzer = new ElevatorMLAnalyzer();
            return analyzer;
          }
        }
      ];

      for (const test of tests) {
        const startTime = performance.now();
        try {
          await test.test();
          testResults.value.push({
            name: test.name,
            success: true,
            time: Math.round(performance.now() - startTime)
          });
        } catch (error) {
          testResults.value.push({
            name: test.name,
            success: false,
            time: Math.round(performance.now() - startTime),
            error: error.message
          });
        }
      }
      
      isLoading.value = false;
    };

    // 测试数据生成
    const testDataGeneration = async () => {
      isLoading.value = true;
      const startTime = performance.now();
      
      try {
        const { useAIAnalysis } = await import('../composables/useAIAnalysis');
        const { generateRealDataBasedAnomaly } = useAIAnalysis();
        
        const result = await generateRealDataBasedAnomaly('曳引系统');
        
        testResults.value.push({
          name: '数据生成测试',
          success: !!result && !!result.eName,
          time: Math.round(performance.now() - startTime),
          data: result
        });
      } catch (error) {
        testResults.value.push({
          name: '数据生成测试',
          success: false,
          time: Math.round(performance.now() - startTime),
          error: error.message
        });
      }
      
      isLoading.value = false;
    };

    // 测试ML分析
    const testMLAnalysis = async () => {
      isLoading.value = true;
      const startTime = performance.now();
      
      try {
        const { useAIAnalysis } = await import('../composables/useAIAnalysis');
        const { performQuickAnalysis } = useAIAnalysis();
        
        const testData = {
          eName: 'motorTemperature',
          eData: '85.5',
          systemName: '曳引系统'
        };
        
        const result = await performQuickAnalysis(testData);
        
        testResults.value.push({
          name: 'ML分析测试',
          success: !!result && !!result.severity,
          time: Math.round(performance.now() - startTime),
          data: result
        });
      } catch (error) {
        testResults.value.push({
          name: 'ML分析测试',
          success: false,
          time: Math.round(performance.now() - startTime),
          error: error.message
        });
      }
      
      isLoading.value = false;
    };

    onMounted(() => {
      checkBasicStatus();
    });

    return {
      errors,
      hasErrors,
      csvLoaderStatus,
      mlAnalyzerStatus,
      isLoading,
      testResults,
      testBasicFunctions,
      testDataGeneration,
      testMLAnalysis
    };
  }
};
</script>

<style scoped>
.ml-test-component {
  background: #f8fafc;
  border-radius: 8px;
  padding: 20px;
  margin: 20px;
  font-family: 'Microsoft YaHei', Arial, sans-serif;
}

.ml-test-component h3 {
  margin: 0 0 20px 0;
  color: #1f2937;
  font-size: 18px;
}

.status-section {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.status-item {
  background: white;
  padding: 10px 15px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #e5e7eb;
  font-size: 14px;
}

.status-item.success {
  border-color: #10b981;
  color: #065f46;
  background-color: #ecfdf5;
}

.status-item.error {
  border-color: #ef4444;
  color: #991b1b;
  background-color: #fef2f2;
}

.error-section {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 20px;
}

.error-section h4 {
  margin: 0 0 10px 0;
  color: #991b1b;
  font-size: 14px;
}

.error-item {
  color: #7f1d1d;
  font-size: 13px;
  margin-bottom: 5px;
}

.test-section {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.test-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  transition: all 0.2s;
}

.test-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.test-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

.results-section h4 {
  margin: 0 0 15px 0;
  color: #1f2937;
  font-size: 16px;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.result-item.success {
  border-color: #10b981;
  background-color: #f0fdf4;
}

.result-item.error {
  border-color: #ef4444;
  background-color: #fef2f2;
}

.result-name {
  flex: 1;
  font-weight: 500;
  font-size: 14px;
}

.result-time {
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}

.result-error {
  width: 100%;
  font-size: 12px;
  color: #991b1b;
  margin-top: 5px;
  padding-top: 5px;
  border-top: 1px solid #fecaca;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .status-section {
    flex-direction: column;
  }
  
  .test-section {
    flex-direction: column;
  }
}
</style> 