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
   * 获取AI寿命预测分析 (已弃用)
   * @deprecated 建议使用 getMCPLifetimeAnalysis
   * @returns {Promise<Object>}
   */
  getLifetimeAnalysis() {
    console.warn('⚠️ getLifetimeAnalysis已弃用，建议使用getMCPLifetimeAnalysis');
    
    // 使用axios发起GET请求
    return axios.get(`${config.API_BASE_URL}/data-etable/lifetime-analysis`)
      .then(response => {
        console.log('原始API返回数据:', response.data);
        
        // 情况1: 后端直接返回了正确的数据结构 {main: "...", message: "..."}
        if (response.data && 
            response.data.data && 
            typeof response.data.data === 'string') {
          
          try {
            // 尝试解析后端返回的JSON字符串
            const parsedData = JSON.parse(response.data.data);
            
            console.log('解析后的数据:', parsedData);
            
            // 如果解析成功且包含预期的字段，返回解析后的数据
            if (parsedData.main || parsedData.message) {
              return {
                success: true,
                data: parsedData
              };
            }
          } catch (e) {
            console.log('JSON解析失败，将原始字符串作为main返回');
            // 如果JSON解析失败，将整个字符串作为main字段返回
            return {
              success: true,
              data: {
                main: response.data.data,
                message: "AI分析完成"
              }
            };
          }
        }
        
        // 情况2: 如果数据结构不符合预期，尝试适配
        return {
          success: true,
          data: {
            main: response.data.data || "暂无分析结果",
            message: response.data.message || "分析完成"
          }
        };
      })
      .catch(error => {
        console.error('获取寿命分析数据失败:', error);
        throw error;
      });
  },

  /**
   * 获取MCP寿命分析信息 (新接口)
   * @returns {Promise<Object>}
   */
  getMCPLifetimeAnalysis() {
    return axios.get(`${config.API_BASE_URL}/data-etable/mcp-lifetime-analysis`)
      .then(response => {
        console.log('MCP寿命分析接口信息:', response.data);
        return {
          success: true,
          data: response.data.data
        };
      })
      .catch(error => {
        console.error('获取MCP寿命分析信息失败:', error);
        throw error;
      });
  },

  /**
   * 使用DeepSeek API进行MCP Function Calling寿命分析
   * @param {string} elevatorId - 电梯ID (可选)
   * @param {number} monthsBack - 分析几个月内的数据 (默认12)
   * @returns {Promise<Object>}
   */
  async analyzeLifespanWithMCP(elevatorId = null, monthsBack = 12) {
    try {
      // 这里应该是通过DeepSeek API进行function calling
      // 暂时返回模拟数据，实际项目中需要集成DeepSeek API
      
      console.log(`🤖 准备使用MCP分析电梯寿命: 电梯ID=${elevatorId}, 分析月数=${monthsBack}`);
      
      // 模拟DeepSeek Function Calling请求
      const mockAnalysis = {
        elevator_id: elevatorId || "ALL",
        analysis_period: `${monthsBack}个月`,
        health_score: 85.2,
        remaining_useful_life: "预计还可正常使用18-24个月",
        risk_factors: [
          "曳引系统磨损程度偏高",
          "门系统响应时间略有延迟"
        ],
        maintenance_recommendations: [
          "建议2周内检查曳引系统",
          "优化门系统校准参数",
          "增加日常润滑保养频次"
        ],
        prediction_confidence: 0.87,
        analysis_method: "MCP Function Calling + AI深度分析"
      };
      
      // 模拟异步处理时间
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return {
        success: true,
        data: {
          main: JSON.stringify(mockAnalysis, null, 2),
          message: "MCP寿命分析完成",
          analysis_type: "mcp_function_calling"
        }
      };
      
    } catch (error) {
      console.error('MCP寿命分析失败:', error);
      throw error;
    }
  }
};