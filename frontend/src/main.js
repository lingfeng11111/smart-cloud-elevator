import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import App from './App.vue'
import router from './router'
import axios from 'axios'

// 引入Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// 引入 ECharts 核心模块
import * as echarts from 'echarts/core'
// 引入图表类型
import {
  BarChart,
  LineChart,
  PieChart,
  GaugeChart,
  RadarChart,
  ScatterChart,
  PictorialBarChart
} from 'echarts/charts'
// 引入提示框、标题、直角坐标系、图例等组件
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  LegendComponent,
  ToolboxComponent,
  GraphicComponent
} from 'echarts/components'
// 引入 Canvas 渲染器
import { CanvasRenderer } from 'echarts/renderers'

// 引入 vue-echarts 组件
import VChart, { THEME_KEY } from 'vue-echarts'

// 注册必需的组件
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GaugeChart,
  RadarChart,
  ScatterChart,
  PictorialBarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  LegendComponent,
  ToolboxComponent,
  GraphicComponent,
  CanvasRenderer
])

// 配置axios默认设置
axios.defaults.withCredentials = true; // 支持cookie
axios.defaults.timeout = 60000; // 设置请求超时时间为1分钟

const app = createApp(App)
app.use(router)
app.use(ElementPlus)

// 全局注册 vue-echarts 组件
app.component('v-chart', VChart)

// 全局提供echarts实例
app.config.globalProperties.$echarts = echarts

app.mount('#app')
