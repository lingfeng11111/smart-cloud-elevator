<template>
  <div class="system-dashboard">
    <v-chart class="chart" :option="chartOption" autoresize />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import * as echarts from 'echarts/core';
import { GraphicComponent } from 'echarts/components';

// 注册图形组件
echarts.use([GraphicComponent]);

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: '⚙️'
  },
  value: {
    type: Number,
    required: true
  },
  min: {
    type: Number,
    default: 0
  },
  max: {
    type: Number,
    default: 100
  },
  unit: {
    type: String,
    default: '%'
  },
  warningThreshold: {
    type: Number,
    default: 70
  },
  criticalThreshold: {
    type: Number,
    default: 90
  },
  isHigherBetter: {
    type: Boolean,
    default: true
  }
});

// 计算状态
const status = computed(() => {
  if (props.isHigherBetter) {
    if (props.value <= props.criticalThreshold) return 'critical';
    if (props.value <= props.warningThreshold) return 'warning';
    return 'normal';
  } else {
    if (props.value >= props.criticalThreshold) return 'critical';
    if (props.value >= props.warningThreshold) return 'warning';
    return 'normal';
  }
});

// 计算颜色
const color = computed(() => {
  if (status.value === 'normal') return '#4CAF50';
  if (status.value === 'warning') return '#FFC107';
  return '#F44336';
});

// 计算状态描述
const statusText = computed(() => {
  if (status.value === 'normal') return '正常';
  if (status.value === 'warning') return '警告';
  return '危险';
});

// 计算百分比值
const percentValue = computed(() => {
  return Math.round(((props.value - props.min) / (props.max - props.min)) * 100);
});

// 创建图表配置
const chartOption = computed(() => {
  // 计算百分比值，用于环形图显示
  const percent = percentValue.value / 100;
  
  // 确定颜色渐变
  let colorStops;
  if (props.isHigherBetter) {
    colorStops = [
      {offset: 0, color: '#F44336'}, // 红色（危险）
      {offset: props.criticalThreshold / 100, color: '#FF9800'}, // 橙色（警告）
      {offset: props.warningThreshold / 100, color: '#4CAF50'} // 绿色（正常）
    ];
  } else {
    colorStops = [
      {offset: 0, color: '#4CAF50'}, // 绿色（正常）
      {offset: props.warningThreshold / 100, color: '#FF9800'}, // 橙色（警告）
      {offset: props.criticalThreshold / 100, color: '#F44336'} // 红色（危险）
    ];
  }

  return {
    backgroundColor: 'transparent',
    title: {
      text: props.name,
      subtext: statusText.value,
      left: 'center',
      top: '38%',
      textStyle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: 'normal'
      },
      subtextStyle: {
        fontSize: 12,
        color: color.value
      }
    },
    series: [
      // 外环 - 显示当前值
      {
        name: props.name,
        type: 'gauge',
        radius: '80%',
        startAngle: 90,
        endAngle: -270,
        pointer: {
          show: false
        },
        progress: {
          show: true,
          overlap: false,
          roundCap: true,
          clip: false,
          itemStyle: {
            color: color.value
          }
        },
        axisLine: {
          lineStyle: {
            width: 15,
            color: [
              [1, 'rgba(255, 255, 255, 0.1)']
            ]
          }
        },
        splitLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          show: false
        },
        detail: {
          show: true,
          offsetCenter: [0, '20%'],
          fontSize: 24,
          fontWeight: 'bold',
          color: color.value,
          formatter: function(value) {
            return `${props.value.toFixed(1)}${props.unit}`;
          }
        },
        data: [{
          value: percentValue.value,
          name: props.icon
        }],
        title: {
          fontSize: 28,
          offsetCenter: [0, '-30%'],
          color: 'rgba(255, 255, 255, 0.8)'
        },
        anchor: {
          show: true,
          showAbove: true,
          size: 18,
          itemStyle: {
            color: color.value
          }
        }
      },
      // 中环 - 显示刻度和阈值
      {
        name: 'middle',
        type: 'gauge',
        radius: '65%',
        startAngle: 90,
        endAngle: -270,
        min: 0,
        max: 100,
        pointer: {
          show: false
        },
        axisLine: {
          show: true,
          lineStyle: {
            width: 8,
            color: [
              [props.isHigherBetter ? props.criticalThreshold/100 : props.warningThreshold/100, '#4CAF50'],
              [props.isHigherBetter ? props.warningThreshold/100 : props.criticalThreshold/100, '#FFC107'],
              [1, '#F44336']
            ]
          }
        },
        axisTick: {
          show: false
        },
        splitLine: {
          show: true,
          length: 5,
          distance: 0,
          lineStyle: {
            width: 2,
            color: 'rgba(255, 255, 255, 0.5)'
          }
        },
        axisLabel: {
          show: true,
          distance: 10,
          fontSize: 10,
          color: 'rgba(255, 255, 255, 0.7)',
          formatter: function(value) {
            if (value % 20 === 0) {
              return value + '%';
            }
            return '';
          }
        },
        detail: {
          show: false
        },
        data: [{
          value: 0,
          name: ''
        }]
      },
      // 内环 - 装饰用
      {
        name: 'inner',
        type: 'gauge',
        radius: '50%',
        startAngle: 90,
        endAngle: -270,
        pointer: {
          show: false
        },
        axisLine: {
          show: true,
          lineStyle: {
            width: 5,
            color: [[1, 'rgba(255, 255, 255, 0.05)']]
          }
        },
        axisTick: {
          show: false
        },
        splitLine: {
          show: false
        },
        axisLabel: {
          show: false
        },
        detail: {
          show: false
        },
        data: [{
          value: 0,
          name: ''
        }]
      }
    ]
  };
});
</script>

<style scoped>
.system-dashboard {
  width: 100%;
  height: 100%;
  padding: 5px;
  box-sizing: border-box;
  min-height: 280px;
}

.chart {
  width: 100%;
  height: 100%;
  min-height: 270px;
}

@media (max-width: 1400px) {
  .system-dashboard {
    min-height: 250px;
  }
  .chart {
    min-height: 240px;
  }
}
</style>