<template>
  <div class="maintenance-chart">
    <v-chart class="chart" :option="chartOption" autoresize />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import * as echarts from 'echarts/core';

const props = defineProps({
  records: {
    type: Array,
    required: true
  }
});

// 处理日期格式
const formatDate = (dateStr) => {
  const date = new Date(dateStr.replace(/-/g, '/'));
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

// 创建图表配置
const chartOption = computed(() => {
  // 颜色映射表
  const typeColors = {
    '常规检查': '#4CAF50',
    '季度保养': '#2196F3',
    '半年检查': '#9C27B0',
    '年度检查': '#FF9800',
    '双月保养': '#00BCD4',
    '紧急维修': '#F44336'
  };
  
  // 按日期排序
  const sortedRecords = [...props.records].sort((a, b) => {
    return new Date(a.date.replace(/-/g, '/')) - new Date(b.date.replace(/-/g, '/'));
  });
  
  // 提取日期和类型
  const dates = sortedRecords.map(r => formatDate(r.date));
  const types = sortedRecords.map(r => r.type);
  const findings = sortedRecords.map(r => r.findings);
  const technicians = sortedRecords.map(r => r.technician);
  
  // 为每个记录生成数据点
  const dataPoints = sortedRecords.map((record, index) => {
    return {
      value: [record.date, index + 1],
      itemStyle: {
        color: typeColors[record.type] || '#607D8B'
      },
      symbolSize: 20,
      record: record
    };
  });
  
  // 生成背景区域
  const markArea = {
    silent: true,
    data: [
      [{
        name: '最近检查区域',
        xAxis: sortedRecords[sortedRecords.length - 2]?.date || '',
        itemStyle: {
          color: 'rgba(250, 250, 250, 0.05)',
          borderColor: 'rgba(250, 250, 250, 0.1)',
          borderWidth: 1
        }
      }, {
        xAxis: sortedRecords[sortedRecords.length - 1]?.date || ''
      }]
    ]
  };
  
  return {
    backgroundColor: 'transparent',
    title: {
      text: '维护时间线',
      left: 'center',
      top: 0,
      textStyle: {
        color: '#5fb1f6',
        fontSize: 16,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const record = params.data.record;
        if (!record) return '';
        
        return `
          <div style="padding: 10px">
            <div style="font-weight: bold; margin-bottom: 5px">${record.date}</div>
            <div>类型: <span style="color:${typeColors[record.type] || '#607D8B'}">${record.type}</span></div>
            <div>发现: ${record.findings}</div>
            <div>维护人员: ${record.technician}</div>
          </div>
        `;
      },
      backgroundColor: 'rgba(40, 40, 40, 0.9)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: {
        color: '#fff'
      }
    },
    grid: {
      left: '10%',
      right: '10%',
      top: '25%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'time',
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.3)'
        }
      },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 11,
        formatter: '{MM}-{dd}'
      },
      splitLine: {
        show: false
      },
      axisTick: {
        show: false
      }
    },
    yAxis: {
      type: 'value',
      show: false,
      min: 0,
      max: Math.max(sortedRecords.length, 1) + 1
    },
    series: [
      // 时间轴线
      {
        name: '维护记录',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: dataPoints.map(dp => ({
          value: dp.value,
          symbol: 'none'
        })),
        lineStyle: {
          width: 3,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            {offset: 0, color: 'rgba(80, 120, 200, 0.8)'},
            {offset: 1, color: 'rgba(80, 190, 180, 0.8)'}
          ]),
          shadowColor: 'rgba(0, 0, 0, 0.3)',
          shadowBlur: 8,
          cap: 'round'
        },
        markArea: markArea,
        z: 1
      },
      // 维护点
      {
        name: '维护点',
        type: 'scatter',
        coordinateSystem: 'cartesian2d',
        data: dataPoints,
        symbolKeepAspect: true,
        symbol: (value, params) => {
          // 根据维护类型返回不同的图形
          const record = params.data.record;
          if (!record) return 'circle';
          
          if (record.type.includes('紧急')) {
            return 'path://M928 480c0-0.8-0.8-1.6-0.8-2.4s0-1.6-0.8-2.4c0-0.8-0.8-1.6-0.8-2.4 0-0.8-0.8-0.8-0.8-1.6 0-0.8-0.8-1.6-0.8-2.4-0.8-0.8-0.8-0.8-0.8-1.6-0.8-0.8-0.8-1.6-1.6-1.6 0-0.8-0.8-0.8-0.8-1.6-0.8-0.8-0.8-0.8-1.6-1.6-0.8 0-0.8-0.8-1.6-0.8-0.8-0.8-0.8-0.8-1.6-0.8-0.8-0.8-1.6-0.8-1.6-0.8-0.8 0-0.8-0.8-1.6-0.8-0.8 0-1.6-0.8-2.4-0.8h-2.4c-0.8 0-1.6 0-3.2-0.8h-608c-1.6 0-2.4 0-4 0.8-0.8 0-1.6 0-2.4 0.8-0.8 0-0.8 0-1.6 0.8-0.8 0-1.6 0.8-2.4 0.8-0.8 0-0.8 0.8-1.6 0.8-0.8 0.8-0.8 0.8-1.6 1.6 0 0-0.8 0.8-0.8 0.8-0.8 0.8-0.8 0.8-1.6 1.6 0 0.8-0.8 0.8-0.8 1.6-0.8 0.8-0.8 1.6-1.6 1.6 0 0.8-0.8 0.8-0.8 1.6 0 0.8-0.8 1.6-0.8 2.4 0 0.8-0.8 0.8-0.8 1.6 0 0.8-0.8 1.6-0.8 2.4 0 0.8 0 1.6-0.8 2.4 0 0.8 0 1.6-0.8 2.4v32c0 0.8 0 1.6 0.8 2.4 0 0.8 0 1.6 0.8 2.4s0 1.6 0.8 2.4c0 0.8 0.8 1.6 0.8 1.6 0 0.8 0.8 1.6 0.8 2.4 0.8 0.8 0.8 0.8 0.8 1.6 0.8 0.8 0.8 1.6 1.6 1.6 0 0.8 0.8 0.8 0.8 1.6 0.8 0.8 0.8 0.8 1.6 1.6 0 0 0.8 0.8 0.8 0.8 0.8 0.8 1.6 0.8 1.6 0.8 0.8 0 0.8 0.8 1.6 0.8 0.8 0 1.6 0.8 2.4 0.8 0.8 0 1.6 0 2.4 0.8h608c0.8 0 2.4 0 3.2-0.8h2.4c0.8 0 1.6-0.8 2.4-0.8 0.8 0 0.8-0.8 1.6-0.8 0.8 0 1.6-0.8 1.6-0.8 0.8 0 0.8-0.8 1.6-0.8 0.8-0.8 0.8-0.8 1.6-1.6 0.8 0 0.8-0.8 0.8-0.8 0.8-0.8 0.8-1.6 1.6-1.6 0-0.8 0.8-0.8 0.8-1.6 0.8-0.8 0.8-1.6 0.8-1.6 0-0.8 0.8-0.8 0.8-1.6 0-0.8 0.8-1.6 0.8-2.4s0-0.8 0.8-1.6c0-0.8 0-1.6 0.8-2.4 0-0.8 0-1.6 0-2.4s0-1.6 0-2.4v-32zM512 720c-26.4 0-48-21.6-48-48s21.6-48 48-48 48 21.6 48 48-21.6 48-48 48zM576 448h-128v-192h128v192z';
          }
          if (record.type.includes('常规')) {
            return 'path://M512 64c-247.4 0-448 200.6-448 448s200.6 448 448 448 448-200.6 448-448-200.6-448-448-448zM512 890.7c-209.6 0-379.7-170.1-379.7-379.7s170.1-379.7 379.7-379.7 379.7 170.1 379.7 379.7-170.1 379.7-379.7 379.7zM512 342.3c-93.9 0-169.7 75.9-169.7 169.7s75.9 169.7 169.7 169.7 169.7-75.9 169.7-169.7-75.9-169.7-169.7-169.7z';
          }
          if (record.type.includes('季度')) {
            return 'path://M512.1 64.3c-247.5 0-448 200.5-448 448s200.5 448 448 448 448-200.5 448-448-200.5-448-448-448zM770.6 771.2c-61.5 61.5-146.4 99.5-240.5 99.5s-179-38.1-240.5-99.5c-61.5-61.5-99.5-146.4-99.5-240.5s38-179 99.5-240.5c61.5-61.5 146.4-99.5 240.5-99.5s179 38 240.5 99.5c61.5 61.5 99.5 146.4 99.5 240.5s-38.1 179-99.5 240.5z';
          }
          if (record.type.includes('年度')) {
            return 'path://M512 0c-282.8 0-512 229.2-512 512s229.2 512 512 512 512-229.2 512-512-229.2-512-512-512zM512 896c-212.1 0-384-171.9-384-384s171.9-384 384-384 384 171.9 384 384-171.9 384-384 384zM384 256l384 256-384 256v-512z';
          }
          
          return 'path://M956.9 844.1c-18.8 0-34.1-15.3-34.1-34.1v-596c0-56.4-46-102.4-102.4-102.4h-324.2c-18.8 0-34.1-15.3-34.1-34.1s15.3-34.1 34.1-34.1h324.2c94.1 0 170.6 76.5 170.6 170.6v596c0 18.8-15.3 34.1-34.1 34.1zM238.9 844.1h-34.1c-94.1 0-170.6-76.5-170.6-170.6v-596c0-18.8 15.3-34.1 34.1-34.1s34.1 15.3 34.1 34.1v596c0 56.4 46 102.4 102.4 102.4h34.1c18.8 0 34.1 15.3 34.1 34.1s-15.3 34.1-34.1 34.1zM614.4 435.2c0 56.554-45.846 102.4-102.4 102.4s-102.4-45.846-102.4-102.4c0-56.554 45.846-102.4 102.4-102.4s102.4 45.846 102.4 102.4zM512 844.1c-18.8 0-34.1-15.3-34.1-34.1v-221.9c0-18.8 15.3-34.1 34.1-34.1s34.1 15.3 34.1 34.1v221.9c0 18.8-15.3 34.1-34.1 34.1zM512 255c-18.8 0-34.1-15.3-34.1-34.1v-153.4c0-18.8 15.3-34.1 34.1-34.1s34.1 15.3 34.1 34.1v153.4c0 18.8-15.3 34.1-34.1 34.1z';
        },
        label: {
          show: true,
          position: 'top',
          distance: 15,
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: 12,
          formatter: (params) => {
            const record = params.data.record;
            return `${record.type}`;
          }
        },
        z: 10
      },
      // 信息标签
      {
        name: '详细信息',
        type: 'scatter',
        coordinateSystem: 'cartesian2d',
        data: dataPoints,
        symbolSize: 0,
        label: {
          show: true,
          position: 'bottom',
          distance: 10,
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: 10,
          formatter: (params) => {
            const record = params.data.record;
            return `${record.findings}\n${record.technician}`;
          }
        },
        z: 2
      }
    ]
  };
});

// 根据维护类型获取颜色
function getTypeColor(type) {
  if (type.includes('常规')) return '#4CAF50';
  if (type.includes('季度')) return '#2196F3';
  if (type.includes('半年')) return '#9C27B0';
  if (type.includes('年度')) return '#FF9800';
  if (type.includes('双月')) return '#00BCD4';
  if (type.includes('紧急')) return '#F44336';
  return '#607D8B';
}
</script>

<style scoped>
.maintenance-chart {
  width: 100%;
  height: 100%;
  min-height: 340px;
  padding: 10px;
  box-sizing: border-box;
}

.chart {
  width: 100%;
  height: 100%;
  min-height: 320px;
}

/* 添加响应式调整 */
@media (max-width: 1400px) {
  .maintenance-chart {
    min-height: 320px;
  }
  .chart {
    min-height: 300px;
  }
}

@media (max-width: 768px) {
  .maintenance-chart {
    min-height: 300px;
  }
  .chart {
    min-height: 280px;
  }
}
</style> 