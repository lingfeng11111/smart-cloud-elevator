<template>
  <div class="parameter-chart">
    <v-chart class="chart" :option="chartOption" autoresize />
  </div>
</template>

<script setup>
import { ref, computed, watch, getCurrentInstance } from 'vue';
import * as echarts from 'echarts/core';
import 'echarts-gl'; // 导入echarts-gl以支持3D图表

const props = defineProps({
  // 图表类型属性
  chartType: {
    type: String,
    default: 'bar',
    validator: (value) => ['bar', 'line', 'radar', 'pie', 'gauge', 'bar3D', 'line3D', 'scatter3D', 'surface3D', 'gauge3D'].includes(value)
  },
  paramGroup: {
    type: String,
    required: false
  },
  parameters: {
    type: Array,
    required: false
  },
  // 时间轴属性
  timeLabels: {
    type: Array,
    required: false
  },
  // 趋势数据属性
  trendData: {
    type: Object,
    required: false
  }
});

// 计算每个参数的状态
const getParamStatus = (param) => {
  if (param.name === '电机温度') return param.value <= 80 ? 'normal' : param.value <= 95 ? 'warning' : 'critical';
  if (param.name === '轴承温度') return param.value <= 95 ? 'normal' : 'warning';
  if (param.name === '振动速度') return param.value <= 2.8 ? 'normal' : param.value <= 4.5 ? 'warning' : 'critical';
  if (param.name === '电流') return Math.abs(param.value - 18.5) <= 1.85 ? 'normal' : Math.abs(param.value - 18.5) <= 2.775 ? 'warning' : 'critical';
  if (param.name === '钢丝绳磨损') return param.value <= 10 ? 'normal' : 'critical';
  if (param.name === '断丝数') return param.value <= 5 ? 'normal' : param.value <= 8 ? 'warning' : 'critical';
  if (param.name === '制动间隙') return param.value >= 0.5 && param.value <= 1.0 ? 'normal' : param.value > 1.0 && param.value <= 1.5 ? 'warning' : 'critical';
  if (param.name === '制动力矩') return param.value >= 300 ? 'normal' : param.value >= 250 ? 'warning' : 'critical';
  if (param.name === '导轨垂直度偏差') return param.value <= 0.5 ? 'normal' : param.value <= 1 ? 'warning' : 'critical';
  if (param.name === '接头间隙') return param.value <= 0.5 ? 'normal' : 'critical';
  if (param.name === '导靴磨损量') return param.value <= 2 ? 'normal' : param.value <= 3 ? 'warning' : 'critical';
  if (param.name === '触点电阻') return param.value <= 0.5 ? 'normal' : param.value <= 1 ? 'warning' : 'critical';
  if (param.name === '机械闭合深度') return param.value >= 7 ? 'normal' : param.value >= 5 ? 'warning' : 'critical';
  if (param.name === '开关门时间') return param.value >= 2 && param.value <= 3 ? 'normal' : param.value > 3 && param.value <= 5 ? 'warning' : 'critical';
  if (param.name === '电压波动') return Math.abs(param.value) <= 10 ? 'normal' : Math.abs(param.value) <= 15 ? 'warning' : 'critical';
  if (param.name === '电流负载') return param.value <= 100 ? 'normal' : param.value <= 120 ? 'warning' : 'critical';
  if (param.name === '触点电压降') return param.value <= 50 ? 'normal' : param.value <= 100 ? 'warning' : 'critical';
  if (param.name === '触点位置偏差') return Math.abs(param.value) <= 5 ? 'normal' : Math.abs(param.value) <= 15 ? 'warning' : 'critical';
  if (param.name === '控制响应时间') return param.value <= 0.5 ? 'normal' : param.value <= 1.0 ? 'warning' : 'critical';
  if (param.name === '二次响应时间') return param.value >= 0.5 && param.value <= 1.0 ? 'normal' : 'critical';
  if (param.name === '电源开关状态') return param.value === '正常' ? 'normal' : 'critical';
  if (param.name === '电源稳定性') return param.value >= 95 ? 'normal' : param.value >= 90 ? 'warning' : 'critical';
  return 'normal';
};

// 计算状态颜色
const getStatusColor = (status) => {
  if (status === 'normal') return '#4CAF50';
  if (status === 'warning') return '#FFC107';
  return '#F44336';
};

// 获取视觉颜色映射
const getVisualMap = (data, type = 'continuous') => {
  return {
    type: type,
    show: false,
    min: 0,
    max: Math.max(...Object.values(data).flat()),
    inRange: {
      color: ['#3498db', '#2ecc71', '#f1c40f', '#e67e22', '#e74c3c'].reverse()
    }
  };
};

// 格式化工具提示内容
const formatTooltip = (param) => {
  const dataIndex = param.dataIndex;
  const parameter = props.parameters[dataIndex];
  return `
    <div style="padding: 10px">
      <div style="font-weight: bold; margin-bottom: 5px">${parameter.name}</div>
      <div>当前值: ${parameter.value}${parameter.unit}</div>
      <div>正常范围: ${parameter.normal}</div>
      <div>故障范围: ${parameter.critical}</div>
    </div>
  `;
};

// 创建图表配置
const chartOption = computed(() => {
  // 处理趋势图表 - 3D线图
  if (props.chartType === 'line3D' && props.timeLabels && props.trendData) {
    const series = [];
    const legend = [];
    
    // 构建3D数据结构
    Object.entries(props.trendData).forEach(([key, values], index) => {
      let name;
      let color;
      
      switch(key) {
        case 'temperature': 
          name = '电机温度'; 
          color = '#5470c6';
          break;
        case 'vibration': 
          name = '振动速度'; 
          color = '#91cc75';
          break;
        case 'current': 
          name = '电流'; 
          color = '#fac858';
          break;
        default: 
          name = key;
          color = ['#5470c6', '#91cc75', '#fac858'][index % 3];
      }
      
      legend.push(name);
      
      // 创建3D数据点
      const data = [];
      for (let i = 0; i < values.length; i++) {
        // x为时间索引，y为数据类型，z为值
        data.push([i, index, values[i]]);
      }
      
      series.push({
        name: name,
        type: 'line3D',
        data: data,
        lineStyle: {
          width: 4,
          color: color
        },
        itemStyle: {
          opacity: 0.8,
          color: color
        },
        emphasis: {
          lineStyle: {
            width: 6,
            color: echarts.color.modifyAlpha(color, 1)
          },
          itemStyle: {
            color: echarts.color.modifyAlpha(color, 1)
          }
        }
      });
    });
    
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        axisPointer: {
          type: 'cross'
        },
        formatter: (params) => {
          let name;
          let value;
          
          // 确定数据点对应的参数名和值
          const dataY = params.data[1]; // Y轴表示数据类型
          const dataX = params.data[0]; // X轴表示时间
          
          // 从索引获取名称
          switch(dataY) {
            case 0: name = '电机温度'; break;
            case 1: name = '振动速度'; break;
            case 2: name = '电流'; break;
            default: name = '未知参数';
          }
          
          value = params.data[2]; // Z轴表示值
          
          return `
            <div style="padding: 8px">
              <div style="font-weight: bold; margin-bottom: 5px">${name}</div>
              <div>时间: ${props.timeLabels[dataX]}</div>
              <div>值: ${value}</div>
            </div>
          `;
        },
        backgroundColor: 'rgba(40, 40, 40, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: {
          color: '#fff'
        }
      },
      legend: {
        data: legend,
        textStyle: {
          color: '#fff',
          fontSize: 14,
          fontWeight: 'bold'
        },
        icon: 'roundRect',
        top: 10,
        left: 'center',
        orient: 'horizontal',
        itemGap: 30,
        itemHeight: 14,
        itemWidth: 14
      },
      xAxis3D: {
        type: 'category',
        data: props.timeLabels,
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 10,
          margin: 8
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.3)'
          }
        }
      },
      yAxis3D: {
        type: 'category',
        data: legend,
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 10,
          margin: 8
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.3)'
          }
        }
      },
      zAxis3D: {
        type: 'value',
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 10
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.3)'
          }
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      },
      grid3D: {
        boxWidth: 200,
        boxDepth: 80,
        boxHeight: 100,
        viewControl: {
          autoRotate: true,
          autoRotateSpeed: 5,
          distance: 200,
          alpha: 20,
          beta: 40
        },
        light: {
          main: {
            intensity: 1.2,
            shadow: true
          },
          ambient: {
            intensity: 0.3
          }
        },
        environment: '#000',
        postEffect: {
          enable: true,
          bloom: {
            intensity: 0.1
          },
          SSAO: {
            enable: true,
            intensity: 1.5
          }
        },
        temporalSuperSampling: {
          enable: true
        }
      },
      series: series
    };
  }
  
  // 处理趋势图表
  if (props.chartType === 'line' && props.timeLabels && props.trendData) {
    const series = [];
    const legend = [];
    
    // 为每个参数创建一条折线
    Object.entries(props.trendData).forEach(([key, values], index) => {
      let name;
      let color;
      
      switch(key) {
        case 'temperature': 
          name = '电机温度'; 
          color = '#5470c6';  // 改为和关键指标一致的蓝色
          break;
        case 'vibration': 
          name = '振动速度'; 
          color = '#91cc75';  // 改为和关键指标一致的绿色
          break;
        case 'current': 
          name = '电流'; 
          color = '#fac858';  // 改为和关键指标一致的黄色
          break;
        case 'verticality': 
          name = '导轨垂直度'; 
          color = '#9C27B0';
          break;
        case 'wear': 
          name = '导靴磨损量'; 
          color = '#795548';
          break;
        case 'gap': 
          name = '接头间隙'; 
          color = '#607D8B';
          break;
        case 'voltage': 
          name = '电压波动'; 
          color = '#FF9800';
          break;
        case 'response': 
          name = '响应时间'; 
          color = '#00BCD4';
          break;
        case 'resistance': 
          name = '触点电阻'; 
          color = '#8BC34A';
          break;
        case 'depth': 
          name = '闭合深度'; 
          color = '#FFC107';
          break;
        case 'time': 
          name = '开关门时间'; 
          color = '#9E9E9E';
          break;
        default: 
          name = key;
          color = ['#5470c6', '#91cc75', '#fac858'][index % 3];  // 使用一致的颜色循环
      }
      
      legend.push(name);
      
      const isArea = index === 0; // 第一条线使用区域图
      
      series.push({
        name: name,
        type: 'line',
        smooth: true,
        symbol: isArea ? 'circle' : 'emptyCircle',
        symbolSize: isArea ? 8 : 6,
        data: values,
        lineStyle: {
          width: isArea ? 4 : 2,
          color: color
        },
        itemStyle: {
          color: color
        },
        areaStyle: isArea ? {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: echarts.color.modifyAlpha(color, 0.6) },
            { offset: 1, color: echarts.color.modifyAlpha(color, 0.1) }
          ])
        } : null,
        emphasis: {
          focus: 'series',
          itemStyle: {
            borderWidth: 4,
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      });
    });
    
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        },
        backgroundColor: 'rgba(40, 40, 40, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: {
          color: '#fff'
        }
      },
      legend: {
        data: legend,
        textStyle: {
          color: '#fff',
          fontSize: 14,
          fontWeight: 'bold'
        },
        icon: 'roundRect',
        top: 10,
        left: 'center',
        orient: 'horizontal',
        itemGap: 30,
        itemHeight: 14,
        itemWidth: 14
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: props.timeLabels,
        boundaryGap: false,
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.3)'
          }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 11
        },
        axisTick: {
          alignWithLabel: true
        }
      },
      yAxis: {
        type: 'value',
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.3)'
          }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 11
        }
      },
      series: series
    };
  }
  
  // 处理普通参数图表
  if (props.parameters && props.paramGroup) {
    const filteredParams = props.parameters;
    
    // 提取参数名称和值
    const names = filteredParams.map(param => param.name);
    const values = filteredParams.map(param => param.value);
    const statuses = filteredParams.map(param => getParamStatus(param));
    const colors = statuses.map(status => getStatusColor(status));
    
    // 根据图表类型返回不同配置
    switch (props.chartType) {
      case 'bar':
        return {
          backgroundColor: 'transparent',
          title: {
            text: props.paramGroup,
            left: 'center',
            textStyle: {
              color: '#5fb1f6',
              fontSize: 16,
              fontWeight: 'normal'
            }
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'shadow'
            },
            formatter: formatTooltip,
            backgroundColor: 'rgba(40, 40, 40, 0.9)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            textStyle: {
              color: '#fff'
            }
          },
          grid: {
            left: '8%',
            right: '8%',
            bottom: '18%',
            top: '22%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: names,
            axisLine: {
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.3)'
              }
            },
            axisLabel: {
              color: 'rgba(255, 255, 255, 0.7)',
              rotate: 30,
              fontSize: 12,
              interval: 0,
              margin: 14,
              hideOverlap: true,
              formatter: function(value) {
                if(value.length > 8) {
                  return value.substring(0, 8) + '...';
                }
                return value;
              }
            }
          },
          yAxis: {
            type: 'value',
            axisLine: {
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.3)'
              }
            },
            axisLabel: {
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 11
            },
            splitLine: {
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            }
          },
          series: [
            {
              type: 'bar',
              data: values.map((value, index) => ({
                value,
                itemStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    {offset: 0, color: echarts.color.modifyAlpha(colors[index], 0.9)},
                    {offset: 1, color: echarts.color.modifyAlpha(colors[index], 0.3)}
                  ]),
                  borderRadius: [4, 4, 0, 0]
                }
              })),
              barWidth: '50%',
              barGap: '5%',
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
              },
              label: {
                show: true,
                position: 'top',
                formatter: (params) => {
                  const param = filteredParams[params.dataIndex];
                  if (typeof param.value === 'string' && !param.unit) {
                    return param.value;
                  }
                  return `${param.value}${param.unit}`;
                },
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: 11
              }
            }
          ]
        };
      
      case 'radar':
        const indicators = filteredParams.map(param => {
          // 估计最大值，确保适合雷达图
          let max = param.value * 2;
          if (typeof param.value === 'number') {
            if (param.normal && param.normal.includes('≤')) {
              const normalValue = parseFloat(param.normal.replace('≤', '').replace(/[^\d.-]/g, ''));
              if (!isNaN(normalValue)) max = normalValue * 1.5;
            } else if (param.normal && param.normal.includes('~')) {
              const parts = param.normal.split('~');
              if (parts.length === 2) {
                const highValue = parseFloat(parts[1].replace(/[^\d.-]/g, ''));
                if (!isNaN(highValue)) max = highValue * 1.2;
              }
            } else if (param.normal && param.normal.includes('±')) {
              // 处理±格式的正常范围
              const baseValue = parseFloat(param.normal.replace(/[^\d.-]/g, ''));
              if (!isNaN(baseValue)) max = baseValue * 2;
            }
          }
          
          // 确保max至少是参数值的1.5倍，避免雷达图显示不全
          if (typeof param.value === 'number' && max < param.value * 1.5) {
            max = param.value * 1.5;
          }
          
          return {
            name: param.name,
            max: max
          };
        });
        
        return {
          backgroundColor: 'transparent',
          title: {
            text: props.paramGroup,
            left: 'center',
            textStyle: {
              color: '#5fb1f6',
              fontSize: 16,
              fontWeight: 'normal'
            }
          },
          tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(40, 40, 40, 0.9)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            textStyle: {
              color: '#fff'
            },
            formatter: (params) => {
              const dataIndex = params.dataIndex || 0;
              const value = params.value[dataIndex];
              const indicator = indicators[dataIndex];
              const param = filteredParams.find(p => p.name === indicator.name);
              if (param) {
                return `
                  <div style="padding: 8px">
                    <div style="font-weight: bold; margin-bottom: 5px">${param.name}</div>
                    <div>当前值: ${param.value}${param.unit}</div>
                    <div>正常范围: ${param.normal}</div>
                  </div>
                `;
              }
              return params.name;
            }
          },
          radar: {
            indicator: indicators,
            shape: 'circle',
            radius: '65%',
            center: ['50%', '55%'],
            splitNumber: 5,
            nameGap: 10,
            axisName: {
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 12,
              padding: [3, 5]
            },
            splitLine: {
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.1)',
                width: 1.5
              }
            },
            splitArea: {
              show: true,
              areaStyle: {
                color: ['rgba(255, 255, 255, 0.02)', 'rgba(255, 255, 255, 0.05)']
              }
            },
            axisLine: {
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.1)',
                width: 1.5
              }
            }
          },
          series: [
            {
              name: props.paramGroup,
              type: 'radar',
              data: [
                {
                  value: values,
                  name: props.paramGroup,
                  areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
                      {offset: 0, color: 'rgba(100, 160, 230, 0.7)'},
                      {offset: 1, color: 'rgba(100, 190, 170, 0.2)'}
                    ])
                  },
                  lineStyle: {
                    width: 2,
                    color: '#64c8ff'
                  },
                  symbol: 'circle',
                  symbolSize: 6,
                  itemStyle: {
                    color: '#64c8ff'
                  }
                }
              ]
            }
          ]
        };
        
      case 'pie':
        return {
          backgroundColor: 'transparent',
          title: {
            text: props.paramGroup,
            left: 'center',
            textStyle: {
              color: '#5fb1f6',
              fontSize: 16,
              fontWeight: 'normal'
            }
          },
          tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)',
            backgroundColor: 'rgba(40, 40, 40, 0.9)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            textStyle: {
              color: '#fff'
            }
          },
          legend: {
            orient: 'vertical',
            right: '5%',
            top: '15%',
            itemGap: 10,
            formatter: (name) => {
              const item = filteredParams.find(p => p.name === name);
              return `${name}: ${item ? item.value + (item.unit || '') : ''}`;
            },
            textStyle: {
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 11
            }
          },
          series: [
            {
              name: props.paramGroup,
              type: 'pie',
              radius: ['35%', '70%'],
              center: ['40%', '50%'],
              avoidLabelOverlap: true,
              roseType: 'radius', // 南丁格尔玫瑰图样式
              itemStyle: {
                borderRadius: 4,
                borderColor: 'rgba(0, 0, 0, 0.1)',
                borderWidth: 2
              },
              label: {
                show: false
              },
              emphasis: {
                label: {
                  show: true,
                  fontSize: 12,
                  fontWeight: 'bold',
                  color: '#fff',
                  formatter: (params) => {
                    const param = filteredParams.find(p => p.name === params.name);
                    return `${params.name}\n${param ? param.value + (param.unit || '') : ''}`;
                  }
                },
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
              },
              labelLine: {
                show: false
              },
              data: filteredParams.map((param, index) => ({
                value: typeof param.value === 'number' ? param.value : 1,
                name: param.name,
                itemStyle: {
                  color: colors[index]
                }
              }))
            }
          ]
        };

      case 'gauge':
        // 处理仪表盘图表
        if (filteredParams.length === 0) return {};
        
        // 为每个参数创建一个仪表盘
        const series = filteredParams.map((param, index) => {
          const status = getParamStatus(param);
          const color = getStatusColor(status);
          
          // 计算最小值和最大值
          let min = 0;
          let max = param.value * 2;
          
          if (param.normal) {
            if (param.normal.includes('≤')) {
              const normalValue = parseFloat(param.normal.replace('≤', ''));
              if (!isNaN(normalValue)) max = normalValue * 1.5;
            } else if (param.normal.includes('~')) {
              const parts = param.normal.split('~');
              if (parts.length === 2) {
                min = parseFloat(parts[0]);
                max = parseFloat(parts[1]) * 1.2;
              }
            }
          }
          
          // 计算仪表盘位置，优化布局，始终按2x2网格排列
          const totalItems = filteredParams.length;
          let centerX, centerY;
          
          if (totalItems === 1) {
            // 单个仪表盘居中显示
            centerX = '50%';
            centerY = '50%';
          } else if (totalItems === 2) {
            // 两个仪表盘左右排列
            centerX = index === 0 ? '25%' : '75%';
            centerY = '50%';
          } else if (totalItems === 3 || totalItems === 4) {
            // 三个或四个仪表盘使用2x2网格
            const row = Math.floor(index / 2);
            const col = index % 2;
            centerX = col === 0 ? '25%' : '75%'; // 更分散的水平定位
            centerY = row === 0 ? '30%' : '75%'; // 增加垂直间距
          } else {
            // 更多指标时使用更紧凑的网格
            const cols = Math.ceil(Math.sqrt(totalItems));
            const col = index % cols;
            const row = Math.floor(index / cols);
            centerX = `${(col * 100 / (cols - 1 || 1))}%`;
            centerY = `${(row * 100 / (Math.ceil(totalItems / cols) - 1 || 1))}%`;
          }
          
          // 根据参数总数调整仪表盘半径
          let radius;
          if (totalItems <= 2) {
            radius = '70%';
          } else if (totalItems <= 4) {
            radius = '50%'; // 略微减小半径，确保不重叠
          } else {
            radius = '40%';
          }
          
          return {
            name: param.name,
            type: 'gauge',
            radius: radius,
            center: [centerX, centerY],
            min: min,
            max: max,
            splitNumber: 5,
            axisLine: {
              lineStyle: {
                width: 8,
                color: [
                  [0.3, '#91c7ae'],
                  [0.7, '#63869e'],
                  [1, '#c23531']
                ]
              }
            },
            pointer: {
              itemStyle: {
                color: 'auto'
              }
            },
            axisTick: {
              distance: -8,
              length: 4,
              lineStyle: {
                color: 'auto'
              }
            },
            splitLine: {
              distance: -14,
              length: 10,
              lineStyle: {
                color: 'auto'
              }
            },
            axisLabel: {
              distance: -16,
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 10
            },
            title: {
              offsetCenter: [0, '60%'],
              fontSize: 12,
              color: 'rgba(255, 255, 255, 0.7)'
            },
            detail: {
              formatter: `{value} ${param.unit}`,
              fontSize: 14,
              offsetCenter: [0, '90%'],
              color: color
            },
            data: [{
              value: param.value,
              name: param.name
            }],
            animation: true
          };
        });
        
        return {
          backgroundColor: 'transparent',
          title: {
            text: props.paramGroup,
            left: 'center',
            textStyle: {
              color: '#5fb1f6',
              fontSize: 16,
              fontWeight: 'normal'
            }
          },
          tooltip: {
            formatter: (params) => {
              const param = filteredParams.find(p => p.name === params.seriesName);
              if (param) {
                return `
                  <div style="padding: 8px">
                    <div style="font-weight: bold; margin-bottom: 5px">${param.name}</div>
                    <div>当前值: ${param.value}${param.unit}</div>
                    <div>正常范围: ${param.normal}</div>
                    <div>故障范围: ${param.critical}</div>
                  </div>
                `;
              }
              return params.name;
            },
            backgroundColor: 'rgba(40, 40, 40, 0.9)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            textStyle: {
              color: '#fff'
            }
          },
          grid: {
            top: '15%',    // 添加grid配置，确保标题有足够空间
            bottom: '5%',
            containLabel: true
          },
          series: series
        };
      
      case 'bar3D':
        // 生成3D数据点
        const data = filteredParams.map((param, index) => {
          return [index, 0, param.value]; // [x, y, z/height]
        });
        
        return {
          backgroundColor: 'transparent',
          tooltip: {
            trigger: 'item',
            formatter: (params) => {
              const param = filteredParams[params.data[0]];
              return `${param.name}: ${param.value}${param.unit}<br/>正常范围: ${param.normal}`;
            },
            backgroundColor: 'rgba(40, 40, 40, 0.9)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            textStyle: {
              color: '#fff'
            }
          },
          visualMap: {
            show: false,
            min: 0,
            max: Math.max(...values),
            inRange: {
              color: ['#1a9bfc', '#34d5eb', '#9af5fc']
            }
          },
          xAxis3D: {
            type: 'category',
            data: names,
            nameTextStyle: {
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 12,
            },
            axisLine: {
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.3)'
              }
            },
            axisLabel: {
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 10,
              rotate: 45,
              margin: 10
            }
          },
          yAxis3D: {
            type: 'category',
            data: [''],
            axisLine: {
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.3)'
              }
            },
            axisLabel: {
              show: false
            }
          },
          zAxis3D: {
            type: 'value',
            axisLine: {
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.3)'
              }
            },
            axisLabel: {
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 10
            },
            splitLine: {
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            }
          },
          grid3D: {
            boxWidth: 160,
            boxDepth: 80,
            boxHeight: 100,
            viewControl: {
              autoRotate: true,
              autoRotateSpeed: 5,
              distance: 180,
              alpha: 20,
              beta: 30
            },
            light: {
              main: {
                intensity: 1.2,
                shadow: true
              },
              ambient: {
                intensity: 0.3
              }
            },
            environment: '#000',
            postEffect: {
              enable: true,
              bloom: {
                intensity: 0.1
              },
              SSAO: {
                enable: true,
                intensity: 1.5
              }
            },
            temporalSuperSampling: {
              enable: true
            }
          },
          series: [{
            type: 'bar3D',
            data: data,
            shading: 'realistic',
            itemStyle: {
              opacity: 0.8,
              borderWidth: 1,
              borderColor: '#fff'
            },
            label: {
              show: false
            },
            emphasis: {
              itemStyle: {
                color: '#32c5ff'
              }
            },
            bevelSize: 0.3,
            bevelSmoothness: 4
          }]
        };
      
      case 'scatter3D':
        const scatterData = filteredParams.map((param, index) => {
          // 创建围绕一个圆的散点
          const theta = index * (Math.PI * 2 / filteredParams.length);
          const r = 1 + param.value / 100; // 归一化的半径
          const x = Math.cos(theta) * r;
          const y = Math.sin(theta) * r;
          const z = param.value;
          return [x, y, z, param.value, param.name];
        });
        
        return {
          backgroundColor: 'transparent',
          tooltip: {
            formatter: (params) => {
              const name = params.data[4];
              const value = params.data[3];
              const param = filteredParams.find(p => p.name === name);
              if (param) {
                return `
                  <div style="padding: 8px">
                    <div style="font-weight: bold; margin-bottom: 5px">${param.name}</div>
                    <div>当前值: ${param.value}${param.unit}</div>
                    <div>正常范围: ${param.normal}</div>
                  </div>
                `;
              }
              return params.name;
            },
            backgroundColor: 'rgba(40, 40, 40, 0.9)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            textStyle: {
              color: '#fff'
            }
          },
          legend: {
            textStyle: {
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 12
            }
          },
          xAxis3D: {
            type: 'value',
            scale: true,
            axisLine: {
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.3)'
              }
            },
            axisLabel: {
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 10
            }
          },
          yAxis3D: {
            type: 'value',
            scale: true,
            axisLine: {
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.3)'
              }
            },
            axisLabel: {
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 10
            }
          },
          zAxis3D: {
            type: 'value',
            axisLine: {
              lineStyle: {
                color: 'rgba(255, 255, 255, 0.3)'
              }
            },
            axisLabel: {
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 10
            }
          },
          grid3D: {
            viewControl: {
              autoRotate: true,
              autoRotateSpeed: 10,
              distance: 170
            },
            light: {
              main: {
                intensity: 1.2,
                shadow: true
              },
              ambient: {
                intensity: 0.3
              }
            },
            environment: '#000',
            postEffect: {
              enable: true,
              bloom: {
                intensity: 0.1
              }
            },
            temporalSuperSampling: {
              enable: true
            }
          },
          series: [{
            type: 'scatter3D',
            name: props.paramGroup,
            data: scatterData,
            symbolSize: 15,
            itemStyle: {
              opacity: 0.9,
              borderWidth: 1,
              borderColor: '#fff',
              color: (params) => {
                const param = filteredParams.find(p => p.name === params.data[4]);
                const status = param ? getParamStatus(param) : 'normal';
                return getStatusColor(status);
              }
            },
            emphasis: {
              itemStyle: {
                opacity: 1
              }
            },
            label: {
              show: true,
              formatter: (params) => params.data[4],
              textStyle: {
                color: '#fff',
                fontSize: 12,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                padding: [3, 5]
              }
            }
          }]
        };
      
      case 'gauge3D':
        // 使用3D旋转的普通仪表盘
        const gaugeSeries = filteredParams.map((param, index) => {
          const status = getParamStatus(param);
          const color = getStatusColor(status);
          
          // 计算最小值和最大值
          let min = 0;
          let max = param.value * 2;
          
          if (param.normal) {
            if (param.normal.includes('≤')) {
              const normalValue = parseFloat(param.normal.replace('≤', ''));
              if (!isNaN(normalValue)) max = normalValue * 1.5;
            } else if (param.normal.includes('~')) {
              const parts = param.normal.split('~');
              if (parts.length === 2) {
                min = parseFloat(parts[0]);
                max = parseFloat(parts[1]) * 1.2;
              }
            }
          }
          
          // 计算仪表盘位置
          const totalItems = filteredParams.length;
          let centerX, centerY;
          
          if (totalItems === 1) {
            centerX = '50%';
            centerY = '50%';
          } else if (totalItems === 2) {
            centerX = index === 0 ? '25%' : '75%';
            centerY = '50%';
          } else if (totalItems === 3 || totalItems === 4) {
            const row = Math.floor(index / 2);
            const col = index % 2;
            centerX = col === 0 ? '25%' : '75%';
            centerY = row === 0 ? '30%' : '75%';
          } else {
            const cols = Math.ceil(Math.sqrt(totalItems));
            const col = index % cols;
            const row = Math.floor(index / cols);
            centerX = `${(col * 100 / (cols - 1 || 1))}%`;
            centerY = `${(row * 100 / (Math.ceil(totalItems / cols) - 1 || 1))}%`;
          }
          
          // 根据参数总数调整仪表盘半径
          let radius;
          if (totalItems <= 2) {
            radius = '70%';
          } else if (totalItems <= 4) {
            radius = '50%';
          } else {
            radius = '40%';
          }
          
          return {
            name: param.name,
            type: 'gauge',
            radius: radius,
            center: [centerX, centerY],
            min: min,
            max: max,
            splitNumber: 5,
            axisLine: {
              lineStyle: {
                width: 12, // 加粗线条以提升3D感
                color: [
                  [0.3, '#91c7ae'],
                  [0.7, '#63869e'],
                  [1, '#c23531']
                ],
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            pointer: {
              itemStyle: {
                color: 'auto'
              },
              width: 6, // 加粗指针
              length: '80%',
              shadowBlur: 5,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            },
            axisTick: {
              distance: -12,
              length: 6,
              lineStyle: {
                color: 'auto',
                shadowBlur: 2
              }
            },
            splitLine: {
              distance: -20,
              length: 15,
              lineStyle: {
                color: 'auto',
                shadowBlur: 3
              }
            },
            axisLabel: {
              distance: -25,
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 12,
              fontWeight: 'bold',
              shadowBlur: 2,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            },
            title: {
              offsetCenter: [0, '60%'],
              fontSize: 14,
              fontWeight: 'bold',
              color: 'rgba(255, 255, 255, 0.9)',
              shadowBlur: 2,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            },
            detail: {
              formatter: `{value} ${param.unit}`,
              fontSize: 16,
              fontWeight: 'bold',
              offsetCenter: [0, '90%'],
              color: color,
              shadowBlur: 3,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            },
            data: [{
              value: param.value,
              name: param.name
            }],
            animation: true
          };
        });
        
        return {
          backgroundColor: 'transparent',
          title: {
            text: props.paramGroup,
            left: 'center',
            textStyle: {
              color: '#5fb1f6',
              fontSize: 16,
              fontWeight: 'bold'
            }
          },
          tooltip: {
            formatter: (params) => {
              const param = filteredParams.find(p => p.name === params.seriesName);
              if (param) {
                return `
                  <div style="padding: 8px">
                    <div style="font-weight: bold; margin-bottom: 5px">${param.name}</div>
                    <div>当前值: ${param.value}${param.unit}</div>
                    <div>正常范围: ${param.normal}</div>
                    <div>故障范围: ${param.critical}</div>
                  </div>
                `;
              }
              return params.name;
            },
            backgroundColor: 'rgba(40, 40, 40, 0.9)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            textStyle: {
              color: '#fff'
            }
          },
          graphic: [
            // 添加图形元素来增强3D效果
            ...filteredParams.map((param, index) => {
              // 计算图形元素位置
              const totalItems = filteredParams.length;
              let centerX, centerY;
              
              if (totalItems === 1) {
                centerX = '50%';
                centerY = '50%';
              } else if (totalItems === 2) {
                centerX = index === 0 ? '25%' : '75%';
                centerY = '50%';
              } else if (totalItems === 3 || totalItems === 4) {
                const row = Math.floor(index / 2);
                const col = index % 2;
                centerX = col === 0 ? '25%' : '75%';
                centerY = row === 0 ? '30%' : '75%';
              } else {
                const cols = Math.ceil(Math.sqrt(totalItems));
                const col = index % cols;
                const row = Math.floor(index / cols);
                centerX = `${(col * 100 / (cols - 1 || 1))}%`;
                centerY = `${(row * 100 / (Math.ceil(totalItems / cols) - 1 || 1))}%`;
              }
              
              // 为每个仪表盘添加一个圆形底座，增强3D效果
              return {
                type: 'group',
                left: centerX,
                top: centerY,
                children: [{
                  type: 'circle',
                  z: -1,
                  shape: { r: 65 },
                  style: {
                    fill: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
                      { offset: 0, color: 'rgba(30, 59, 117, 0.8)' },
                      { offset: 1, color: 'rgba(15, 29, 58, 0.2)' }
                    ]),
                    shadowBlur: 20,
                    shadowColor: 'rgba(0, 40, 120, 0.3)',
                    shadowOffsetY: 5
                  }
                }]
              };
            })
          ],
          series: gaugeSeries
        };
      
      default:
        return {};
    }
  }
  
  return {};
});
</script>

<style scoped>
.parameter-chart {
  width: 100%;
  height: 100%;
  min-height: 350px;
  padding: 10px;
  box-sizing: border-box;
}

.chart {
  width: 100%;
  height: 100%;
  min-height: 330px;
  padding-top: 20px; /* 为图例留出更多空间 */
}

/* 添加响应式调整 */
@media (max-width: 1400px) {
  .parameter-chart {
    min-height: 320px;
  }
  .chart {
    min-height: 300px;
  }
}

@media (max-width: 768px) {
  .parameter-chart {
    min-height: 300px;
  }
  .chart {
    min-height: 280px;
  }
}
</style>