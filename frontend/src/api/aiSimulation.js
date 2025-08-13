import OpenAI from 'openai';
import axios from 'axios';
import config from './config';

/**
 * AI模拟数据相关API
 */
export default {
  /**
 * 获取模拟的智云梯异常数据
   * @param {string} systemType - 系统类型 (e.g., 'traction', 'guidance')
   * @returns {Promise<Object>} 返回一个包含模拟异常数据的Promise
   */
  getSimulatedAbnormalData(systemType) {
    return new Promise((resolve) => {
      // 模拟网络延迟
      setTimeout(() => {
        let abnormalData = {
          eName: 'EL-001',
          eData: '',
          systemName: '',
          systemSqName: ''
        };

        switch (systemType) {
          case 'traction':
            abnormalData.systemName = '曳引系统';
            abnormalData.systemSqName = '曳引钢丝绳断丝数量';
            abnormalData.eData = '141';
            break;
          case 'guidance':
            abnormalData.systemName = '导向系统';
            abnormalData.systemSqName = '导轨垂直度偏差';
            abnormalData.eData = '1.2';
            break;
          case 'electrical':
            abnormalData.systemName = '电气控制系统';
            abnormalData.systemSqName = '触点电压降';
            abnormalData.eData = '95';
            break;
          case 'door':
            abnormalData.systemName = '门系统';
            abnormalData.systemSqName = '机械闭合深度';
            abnormalData.eData = '4.5';
            break;
          default:
            abnormalData.systemName = '曳引系统';
            abnormalData.systemSqName = '曳引钢丝绳断丝数量';
            abnormalData.eData = '141';
        }
        resolve(abnormalData);
      }, 500); // 500ms 延迟
    });
  },

  /**
   * 调用DeepSeek AI生成一个模拟的异常数据点
   * @param {string} systemType - 系统类型 ('traction', 'guidance', 'electrical', 'door')
   * @returns {Promise<Object>} 返回一个由AI生成的、符合格式的异常数据JSON对象
   */
  async generateSimulatedAbnormalDataWithAI(systemType) {
    const apiKey = 'sk-be78f7e5e1f74f478d49a6636aa2b3ea';

    // 使用官方推荐的OpenAI SDK进行初始化
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.deepseek.com/v1',
      dangerouslyAllowBrowser: true,
      timeout: 60000
    });

    // 1. 专业系统提示词 - 基于真实电梯安全标准GB/T 24475-2009
    const systemPrompt = `你是智云梯专业异常检测数据生成器，严格遵循国家电梯安全标准GB/T 24475-2009。

【核心任务】
根据指定电梯系统的技术参数表，生成一个真实可信的异常数据点，用于机器学习模型训练。

【输出要求】
严格返回JSON格式: {"systemName": "string", "systemSqName": "string", "eName": "string", "eData": "string"}

【数据生成原则】
1. 参数值必须超出正常运行范围但符合物理实际
2. 考虑负载、速度、环境温度等因素的影响
3. 遵循设备磨损、老化的真实规律
4. 数值精度符合实际传感器规格
5. 异常程度应体现渐进式或突发式故障特征

【严重性分级】
- 警告级(Warning): 超出正常范围但尚可运行
- 故障级(Critical): 严重威胁安全，需立即停机

不得包含解释、注释或非JSON内容。`;

    // 2. 基于数据集的精确参数规范
    const systemContexts = {
      traction: {
        name: '曳引系统',
        prompt: `【曳引系统异常检测】
生成超出正常运行范围的异常数据，考虑物理关联性。

【组件参数规范表】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
组件："曳引机"
├─ motorTemperature(电机温度): 正常≤80°C, 警告80-95°C, 故障>95°C
├─ bearingTemperature(轴承温度): 正常≤95°C, 警告95-105°C, 故障>105°C  
├─ vibrationSpeed(振动速度): 正常≤2.8mm/s, 警告2.8-4.5mm/s, 故障>4.5mm/s
└─ current(电流): 正常16.65-20.35A, 警告20.35-21.28A, 故障>21.28A

组件："钢丝绳"  
├─ steelRopeWear(钢丝绳磨损): 正常≤10%, 警告10-12%, 故障>12%
└─ brokenWires(断丝数): 正常≤5根/股, 警告5-8根/股, 故障>8根/股

组件："制动机"
├─ brakeClearance(制动间隙): 正常0.5-1.0mm, 警告1.0-1.5mm, 故障>1.5mm  
└─ brakingTorque(制动力矩): 正常300-350N·m, 警告250-300N·m, 故障<250N·m
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【物理关联考虑】
• 高负载(>700kg) → 电机温度↑, 轴承温度↑, 电流↑
• 高速运行(>1.5m/s) → 振动↑, 温度↑
• 长期运行(>8000h) → 磨损加剧, 间隙增大
• 环境高温(>28°C) → 所有温度参数偏高

【生成示例】
负载800kg，运行12000小时，环境32°C条件下的异常：
{"systemName": "曳引系统", "systemSqName": "曳引机", "eName": "motorTemperature", "eData": "98.4"}`
      },
      
      guidance: {
        name: '导向系统',
        prompt: `【导向系统异常检测】
生成符合实际工况的导向系统异常数据。

【组件参数规范表】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
组件："导轨"
├─ railDeviation(导轨垂直度偏差): 正常≤0.5mm, 警告0.5-1.0mm, 故障>1.0mm
└─ railJointGap(接头间隙): 正常≤0.5mm, 警告0.5-1.0mm, 故障>1.0mm

组件："导靴"  
└─ guideShoeWear(导靴磨损量): 正常≤2mm, 警告2-3mm, 故障>3mm
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【影响因素】
• 运行频次高 → 导靴磨损加速
• 负载偏心 → 导轨变形增大  
• 安装误差 → 初始偏差影响
• 温度变化 → 导轨热膨胀，间隙变化
• 维护不当 → 润滑不良，磨损加剧

【典型异常场景】
高频使用写字楼，日运行300次，使用5年：
{"systemName": "导向系统", "systemSqName": "导靴", "eName": "guideShoeWear", "eData": "3.2"}`
      },
      
      electrical: {
        name: '电气控制系统', 
        prompt: `【电气控制系统异常检测】
生成真实电气故障数据，考虑电网波动和设备老化。

【组件参数规范表】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
组件："控制器"
└─ controlResponseTime(控制响应时间): 正常≤0.5s, 警告0.5-1.0s, 故障>1.0s

组件："电源"
├─ voltageFluctuation(电压波动): 正常≤10%, 警告10-15%, 故障>15%  
└─ contactVoltageDrops(触点电压降): 正常≤50mV, 警告50-100mV, 故障>100mV

组件："负载"
└─ currentLoad(电流负载): 正常16.65-20.35A, 警告20.35-21.28A, 故障>21.28A
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【电气故障特征】
• 电网不稳定 → 电压波动加剧
• 接触器老化 → 触点电压降增大
• 负载过重 → 电流超标，温升异常  
• 控制模块故障 → 响应时间延长
• 谐波污染 → 系统稳定性下降

【时段性影响】
用电高峰期(18:00-20:00)，工业区电网：
{"systemName": "电气控制系统", "systemSqName": "电源", "eName": "voltageFluctuation", "eData": "16.8"}`
      },
      
      door: {
        name: '门系统',
        prompt: `【门系统异常检测】  
生成门系统机械电气故障数据，考虑使用频次和环境影响。

【组件参数规范表】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
组件："门机"
├─ openCloseTime(开关门时间): 正常2-3s, 警告3-5s, 故障>5s
└─ doorCurrent(门机电流): 正常4.5-5.5A, 警告5.5-6.0A, 故障>6.0A  

组件："门锁装置"
├─ contactResistance(触点电阻): 正常≤0.5Ω, 警告0.5-1.0Ω, 故障>1.0Ω
└─ mechanicalDepth(机械闭合深度): 正常≥7mm, 警告5-7mm, 故障<5mm
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【故障演化规律】
• 机械磨损 → 开关门时间延长，电流增大
• 润滑不良 → 阻力增加，电流上升
• 门锁调整不当 → 闭合深度不足，安全隐患
• 接触腐蚀 → 电阻增大，信号不稳
• 频繁使用 → 加速所有部件老化

【环境因素影响】
商场高层，湿度75%，日开关2000次：
{"systemName": "门系统", "systemSqName": "门锁装置", "eName": "contactResistance", "eData": "1.15"}`
      }
    };
    
    const context = systemContexts[systemType] || systemContexts.traction;

    // 3. 发起API请求
    try {
      const completion = await openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context.prompt }
        ],
        temperature: 0.7, // 降低随机性，提高专业性
        max_tokens: 200,  // 限制输出长度，专注于JSON
        response_format: { type: 'json_object' }
      });

      // 4. 解析并返回结果
      if (completion.choices && completion.choices[0]) {
        const content = completion.choices[0].message.content;
        const jsonData = JSON.parse(content);
        
        // 数据验证和标准化
        jsonData.systemName = context.name;
        
        // 确保数值格式正确
        if (jsonData.eData && typeof jsonData.eData === 'string') {
          const numValue = parseFloat(jsonData.eData);
          if (!isNaN(numValue)) {
            // 根据参数类型调整精度
            if (jsonData.eName.includes('Temperature') || jsonData.eName.includes('温度')) {
              jsonData.eData = numValue.toFixed(1);
            } else if (jsonData.eName.includes('current') || jsonData.eName === 'brokenWires') {
              jsonData.eData = Math.round(numValue).toString();
            } else {
              jsonData.eData = numValue.toFixed(2);
            }
          }
        }
        
        console.log('DeepSeek AI生成的专业异常数据:', jsonData);
        return jsonData;
      } else {
        throw new Error('AI未能返回有效的模拟数据');
      }
    } catch (error) {
      console.error('调用DeepSeek AI失败:', error);
      throw new Error(`调用AI模拟数据失败: ${error.message}`);
    }
  },

  /**
   * 获取AI寿命预测分析
   * @returns {Promise<Object>}
   */
  getLifetimeAnalysis() {
    // 使用axios发起GET请求
    return axios.get(`${config.API_BASE_URL}/data-etable/lifetime-analysis`)
      .then(response => {
        console.log('原始API返回数据:', response.data);
        
        // 情况1: 后端直接返回了正确的数据结构 {main: "...", message: "..."}
        if (response.data && 
            typeof response.data.main === 'string' && 
            typeof response.data.message === 'string') {
          console.log('直接使用返回的main和message字段');
          return { data: response.data };
        }
        
        // 情况2: 处理嵌套JSON的情况
        if (response.data && response.data.message && typeof response.data.message === 'string') {
          // 检查是否是Markdown代码块格式
          const markdownMatch = response.data.message.match(/```json\s*([\s\S]*?)\s*```/);
          if (markdownMatch && markdownMatch[1]) {
            try {
              // 提取并解析内部JSON
              const innerJson = JSON.parse(markdownMatch[1]);
              console.log('成功提取Markdown代码块中的JSON:', innerJson);
              return { data: innerJson };
            } catch (e) {
              console.error('内部JSON解析失败:', e);
            }
          }
          
          // 如果不是Markdown格式，尝试直接作为JSON解析
          if (response.data.message.trim().startsWith('{')) {
            try {
              const jsonData = JSON.parse(response.data.message);
              console.log('直接从message解析JSON:', jsonData);
              return { data: jsonData };
            } catch (e) {
              console.error('message解析为JSON失败:', e);
            }
          }
        }
        
        // 情况3: 返回的数据包含在data字段中
        if (response.data && response.data.data) {
          if (typeof response.data.data === 'string' && response.data.data.trim().startsWith('{')) {
            try {
              // 尝试解析data字段中的JSON字符串
              const jsonData = JSON.parse(response.data.data);
              console.log('从data字段解析JSON:', jsonData);
              if (jsonData.main && jsonData.message) {
                return { data: jsonData };
              }
            } catch (e) {
              console.error('解析data字段中的JSON失败:', e);
            }
          } else if (response.data.data.main && response.data.data.message) {
            // data字段已经是一个包含所需字段的对象
            console.log('使用data字段中的对象');
            return { data: response.data.data };
          }
        }
        
        // 情况4: 整个响应就是JSON字符串
        if (typeof response.data === 'string' && response.data.trim().startsWith('{')) {
          try {
            const jsonData = JSON.parse(response.data);
            console.log('解析整个响应作为JSON:', jsonData);
            if (jsonData.main && jsonData.message) {
              return { data: jsonData };
            } else if (jsonData.data && jsonData.data.main && jsonData.data.message) {
              return { data: jsonData.data };
            }
          } catch (e) {
            console.error('解析整个响应为JSON失败:', e);
          }
        }
        
        // 情况5: 检查是否已经是所需格式的部分内容
        if (response.data && (response.data.main || response.data.message)) {
          console.log('数据部分匹配预期格式，尝试构造完整对象');
          return { 
            data: {
              main: response.data.main || "无主要分析内容",
              message: response.data.message || "无详细分析内容"
            } 
          };
        }
        
        // 如果以上都失败，返回默认值
        console.warn('无法解析数据，使用默认值');
        return {
          data: {
            main: "无法解析服务器返回数据",
            message: "服务器返回了无法识别的数据格式。请检查API响应格式或联系管理员。"
          }
        };
      })
      .catch(error => {
        console.error('获取AI寿命预测分析失败:', error);
        // 如果API不可用，返回模拟数据
        return {
          data: {
            main: "智云梯1号预计使用寿命还剩7.2年，智云梯2号需注意曳引系统异常情况。",
            message: "基于过去6个月的运行数据分析，系统监测到以下情况：\n\n1. 智云梯1号：\n- 曳引系统运行稳定，参数在正常范围内\n- 导向系统磨损率低于平均水平15%\n- 电气控制系统响应时间稳定\n- 门系统开关次数累计达标\n\n2. 智云梯2号：\n- 曳引钢丝绳有轻微磨损迹象，但仍在安全范围内\n- 轴承温度在过去两个月有小幅上升趋势\n- 建议在下次维护时进行详细检查\n\n总体评估：设备运行状态良好，建议保持现有维护周期，特别关注智云梯2号的曳引系统。"
          }
        };
      });
  }
};