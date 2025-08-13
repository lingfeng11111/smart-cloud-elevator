<template>
  <div class="ml-recommendation-test">
    <h3>🧪 ML建议功能测试</h3>
    
    <div class="test-controls">
      <button @click="testMLAnalysis" :disabled="testing">
        {{ testing ? '测试中...' : '测试ML分析' }}
      </button>
      <button @click="clearResults">清除结果</button>
    </div>

    <div class="test-results" v-if="testResult">
      <h4>测试结果:</h4>
      <div class="result-section">
        <h5>quickAnalysisResult:</h5>
        <pre>{{ JSON.stringify(testResult.quickAnalysisResult, null, 2) }}</pre>
      </div>
      
      <div class="result-section">
        <h5>aiRecommendation:</h5>
        <div class="recommendation-display">{{ testResult.aiRecommendation }}</div>
      </div>
      
      <div class="result-section">
        <h5>建议格式检查:</h5>
        <ul>
          <li>有recommendation: {{ testResult.hasRecommendation ? '✅' : '❌' }}</li>
          <li>recommendation类型: {{ testResult.recommendationType }}</li>
          <li>有main属性: {{ testResult.hasMain ? '✅' : '❌' }}</li>
          <li>有specific属性: {{ testResult.hasSpecific ? '✅' : '❌' }}</li>
        </ul>
      </div>
    </div>

    <div class="error-log" v-if="errors.length > 0">
      <h4>错误日志:</h4>
      <div v-for="(error, index) in errors" :key="index" class="error-item">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useAIAnalysis } from '../composables/useAIAnalysis.js';

export default {
  name: 'MLRecommendationTest',
  setup() {
    const testing = ref(false);
    const testResult = ref(null);
    const errors = ref([]);
    
    const { 
      generateAbnormalData, 
      quickAnalysisResult, 
      aiRecommendation,
      performQuickAnalysis 
    } = useAIAnalysis();

    const testMLAnalysis = async () => {
      testing.value = true;
      errors.value = [];
      testResult.value = null;
      
      try {
        console.log('🧪 开始ML建议测试...');
        
        // 模拟异常数据
        const mockData = {
          eName: 'motorTemperature',
          eData: '85.5',
          systemName: 'traction',
          systemSqName: '曳引机',
          timestamp: new Date().toISOString()
        };
        
        console.log('📊 模拟数据:', mockData);
        
        // 执行ML分析
        await performQuickAnalysis(mockData);
        
        // 收集测试结果
        const recommendation = quickAnalysisResult.value?.recommendation;
        
        testResult.value = {
          quickAnalysisResult: quickAnalysisResult.value,
          aiRecommendation: aiRecommendation.value,
          hasRecommendation: !!recommendation,
          recommendationType: typeof recommendation,
          hasMain: recommendation && typeof recommendation === 'object' && !!recommendation.main,
          hasSpecific: recommendation && typeof recommendation === 'object' && !!recommendation.specific
        };
        
        console.log('✅ 测试完成:', testResult.value);
        
      } catch (error) {
        console.error('❌ 测试失败:', error);
        errors.value.push(`测试失败: ${error.message}`);
      } finally {
        testing.value = false;
      }
    };

    const clearResults = () => {
      testResult.value = null;
      errors.value = [];
    };

    return {
      testing,
      testResult,
      errors,
      testMLAnalysis,
      clearResults
    };
  }
};
</script>

<style scoped>
.ml-recommendation-test {
  padding: 20px;
  border: 2px solid #4CAF50;
  border-radius: 8px;
  margin: 20px;
  background: #f9f9f9;
}

.test-controls {
  margin: 15px 0;
}

.test-controls button {
  margin-right: 10px;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.test-controls button:first-child {
  background: #4CAF50;
  color: white;
}

.test-controls button:first-child:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.test-controls button:last-child {
  background: #f44336;
  color: white;
}

.test-results {
  margin-top: 20px;
}

.result-section {
  margin: 15px 0;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
}

.result-section h5 {
  margin: 0 0 10px 0;
  color: #333;
}

pre {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
}

.recommendation-display {
  background: #e8f5e8;
  padding: 10px;
  border-radius: 4px;
  border-left: 4px solid #4CAF50;
}

.error-log {
  margin-top: 20px;
  padding: 10px;
  background: #ffebee;
  border-radius: 4px;
}

.error-item {
  color: #d32f2f;
  margin: 5px 0;
}

ul {
  margin: 0;
  padding-left: 20px;
}

li {
  margin: 5px 0;
}
</style> 