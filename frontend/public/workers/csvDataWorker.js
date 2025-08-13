/**
 * CSV数据处理Web Worker
 * 用于在后台处理大型CSV文件，避免主线程阻塞
 */

// Worker状态
let isProcessing = false;
let processingQueue = [];

// 消息处理
self.onmessage = function(e) {
  const { type, data, id } = e.data;
  
  switch (type) {
    case 'PARSE_CSV':
      handleParseCSV(data, id);
      break;
    case 'FILTER_DATA':
      handleFilterData(data, id);
      break;
    case 'ANALYZE_SAMPLES':
      handleAnalyzeSamples(data, id);
      break;
    case 'GET_ANOMALY_CASES':
      handleGetAnomalyCases(data, id);
      break;
    default:
      postMessage({
        type: 'ERROR',
        id,
        error: `未知操作类型: ${type}`
      });
  }
};

/**
 * 处理CSV解析
 */
function handleParseCSV(data, id) {
  if (isProcessing) {
    processingQueue.push({ type: 'PARSE_CSV', data, id });
    return;
  }
  
  isProcessing = true;
  
  try {
    const { csvText, systemType, batchSize = 100 } = data;
    const result = parseCSVInBatches(csvText, systemType, batchSize);
    
    postMessage({
      type: 'PARSE_CSV_COMPLETE',
      id,
      result
    });
  } catch (error) {
    postMessage({
      type: 'ERROR',
      id,
      error: error.message
    });
  } finally {
    isProcessing = false;
    processQueue();
  }
}

/**
 * 批量解析CSV数据
 */
function parseCSVInBatches(csvText, systemType, batchSize) {
  const lines = csvText.split('\n');
  if (lines.length < 2) {
    throw new Error('CSV文件格式错误');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  let processedCount = 0;

  // 分批处理以避免阻塞
  for (let i = 1; i < lines.length; i += batchSize) {
    const batchEnd = Math.min(i + batchSize, lines.length);
    
    for (let j = i; j < batchEnd; j++) {
      if (lines[j].trim()) {
        try {
          const values = parseCSVLine(lines[j]);
          if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
              row[header] = values[index];
            });
            
            // 只保留有效的数据行
            if (row.parameter_name && row.parameter_value && !isNaN(parseFloat(row.parameter_value))) {
              data.push(normalizeDataRow(row));
              processedCount++;
            }
          }
        } catch (error) {
          // 跳过解析错误的行
          continue;
        }
      }
    }
    
    // 发送进度更新
    if (i % (batchSize * 10) === 0) {
      postMessage({
        type: 'PARSE_PROGRESS',
        progress: {
          processed: processedCount,
          total: lines.length - 1,
          percentage: Math.round((j / (lines.length - 1)) * 100)
        }
      });
    }
  }

  return data;
}

/**
 * 解析CSV行（处理引号和转义字符）
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * 标准化数据行
 */
function normalizeDataRow(row) {
  return {
    timestamp: row.timestamp,
    systemName: row.system_name,
    componentName: row.component_name,
    parameterName: row.parameter_name,
    unit: row.unit,
    value: parseFloat(row.parameter_value),
    anomalyScore: parseFloat(row.anomaly_score) || 0,
    severityLevel: row.severity_level,
    loadWeight: parseFloat(row.load_weight) || 0,
    speed: parseFloat(row.speed) || 0,
    operatingHours: parseFloat(row.operating_hours) || 0,
    ambientTemp: parseFloat(row.ambient_temp) || 25,
    humidity: parseFloat(row.humidity) || 50,
    maintenanceDaysSince: parseInt(row.maintenance_days_since) || 0,
    usageIntensity: row.usage_intensity,
    deviationFromBaseline: parseFloat(row.deviation_from_baseline) || 0,
    deviationPercentage: parseFloat(row.deviation_percentage) || 0,
    compositeRiskScore: parseFloat(row.composite_risk_score) || 0
  };
}

/**
 * 处理数据过滤
 */
function handleFilterData(data, id) {
  if (isProcessing) {
    processingQueue.push({ type: 'FILTER_DATA', data, id });
    return;
  }
  
  isProcessing = true;
  
  try {
    const { dataset, filters } = data;
    const result = filterData(dataset, filters);
    
    postMessage({
      type: 'FILTER_DATA_COMPLETE',
      id,
      result
    });
  } catch (error) {
    postMessage({
      type: 'ERROR',
      id,
      error: error.message
    });
  } finally {
    isProcessing = false;
    processQueue();
  }
}

/**
 * 数据过滤
 */
function filterData(dataset, filters) {
  return dataset.filter(row => {
    // 参数名过滤
    if (filters.parameterName && row.parameterName !== filters.parameterName) {
      return false;
    }
    
    // 严重性过滤
    if (filters.severityLevel && row.severityLevel !== filters.severityLevel) {
      return false;
    }
    
    // 值范围过滤
    if (filters.valueRange) {
      const { min, max } = filters.valueRange;
      if (row.value < min || row.value > max) {
        return false;
      }
    }
    
    // 时间范围过滤
    if (filters.timeRange) {
      const rowTime = new Date(row.timestamp);
      const { start, end } = filters.timeRange;
      if (rowTime < start || rowTime > end) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * 处理样本分析
 */
function handleAnalyzeSamples(data, id) {
  if (isProcessing) {
    processingQueue.push({ type: 'ANALYZE_SAMPLES', data, id });
    return;
  }
  
  isProcessing = true;
  
  try {
    const { samples } = data;
    const result = analyzeSamples(samples);
    
    postMessage({
      type: 'ANALYZE_SAMPLES_COMPLETE',
      id,
      result
    });
  } catch (error) {
    postMessage({
      type: 'ERROR',
      id,
      error: error.message
    });
  } finally {
    isProcessing = false;
    processQueue();
  }
}

/**
 * 样本分析
 */
function analyzeSamples(samples) {
  if (!samples || samples.length === 0) {
    return null;
  }

  const values = samples.map(s => s.value);
  const anomalyScores = samples.map(s => s.anomalyScore);
  
  // 统计计算
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  
  const meanAnomalyScore = anomalyScores.reduce((a, b) => a + b, 0) / anomalyScores.length;
  
  // 异常统计
  const normalCount = samples.filter(s => s.severity === 'normal').length;
  const warningCount = samples.filter(s => s.severity === 'warning').length;
  const criticalCount = samples.filter(s => s.severity === 'critical').length;
  
  // 分位数计算
  const sortedValues = [...values].sort((a, b) => a - b);
  const q1 = sortedValues[Math.floor(sortedValues.length * 0.25)];
  const median = sortedValues[Math.floor(sortedValues.length * 0.5)];
  const q3 = sortedValues[Math.floor(sortedValues.length * 0.75)];
  
  return {
    count: samples.length,
    mean,
    std,
    variance,
    min: Math.min(...values),
    max: Math.max(...values),
    median,
    q1,
    q3,
    meanAnomalyScore,
    distribution: {
      normal: normalCount,
      warning: warningCount,
      critical: criticalCount
    },
    normalRate: normalCount / samples.length,
    anomalyRate: (warningCount + criticalCount) / samples.length
  };
}

/**
 * 处理异常案例获取
 */
function handleGetAnomalyCases(data, id) {
  if (isProcessing) {
    processingQueue.push({ type: 'GET_ANOMALY_CASES', data, id });
    return;
  }
  
  isProcessing = true;
  
  try {
    const { dataset, limit = 10 } = data;
    const result = getAnomalyCases(dataset, limit);
    
    postMessage({
      type: 'GET_ANOMALY_CASES_COMPLETE',
      id,
      result
    });
  } catch (error) {
    postMessage({
      type: 'ERROR',
      id,
      error: error.message
    });
  } finally {
    isProcessing = false;
    processQueue();
  }
}

/**
 * 获取异常案例
 */
function getAnomalyCases(dataset, limit) {
  return dataset
    .filter(row => row.severityLevel === 'warning' || row.severityLevel === 'critical')
    .sort((a, b) => b.anomalyScore - a.anomalyScore)
    .slice(0, limit)
    .map(row => ({
      parameterName: row.parameterName,
      value: row.value,
      anomalyScore: row.anomalyScore,
      severity: row.severityLevel,
      deviation: row.deviationFromBaseline,
      deviationPercentage: row.deviationPercentage,
      timestamp: row.timestamp,
      context: {
        componentName: row.componentName,
        loadWeight: row.loadWeight,
        operatingHours: row.operatingHours,
        maintenanceDaysSince: row.maintenanceDaysSince,
        ambientTemp: row.ambientTemp,
        usageIntensity: row.usageIntensity
      }
    }));
}

/**
 * 处理队列中的任务
 */
function processQueue() {
  if (processingQueue.length > 0 && !isProcessing) {
    const nextTask = processingQueue.shift();
    self.onmessage({ data: nextTask });
  }
}

// 发送Worker就绪消息
postMessage({
  type: 'WORKER_READY',
  message: 'CSV数据处理Worker已就绪'
}); 