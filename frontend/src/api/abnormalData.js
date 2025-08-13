import request from '../utils/request';

/**
 * 异常数据相关API
 */
export default {
  /**
   * 添加异常数据（AI分析）
   */
  addAbnormalData(data) {
    const requestData = {
      systemName: data.systemName || '未知系统',
      systemSqName: data.systemSqName || '未知组件',
      eName: data.eName || '未知异常',
      eData: data.eData || '0'
    };
    if (data.aiResult) requestData.aiResult = data.aiResult;
    if (data.aiCode !== undefined) requestData.aiCode = data.aiCode;
    console.log('发送异常数据到后端:', requestData);
    return request.post('/data-etable/gain-data', requestData);
  },

  /**
   * 快速创建异常数据（不触发AI）
   */
  createAbnormalData(data) {
    const requestData = {
      systemName: data.systemName || '未知系统',
      systemSqName: data.systemSqName || '未知组件',
      eName: data.eName || '未知异常',
      eData: data.eData || '0'
    };
    return request.post('/data-etable/create', requestData);
  },

  /**
   * 分页查询异常数据
   */
  getAbnormalData(params) {
    return request.get('/data-etable/selectData', { params });
  },

  /**
   * 根据mtDataId获取单个异常数据
   */
  getAbnormalDataById(mtDataId) {
    return request.get('/data-etable/selectData', {
      params: { current: 1, size: 1, mtDataId: mtDataId }
    });
  },

  /**
   * 发送数据给AI分析
   */
  sendDataToAI(data) {
    const requestData = { ...data };
    if (!requestData.systemName) requestData.systemName = '曳引系统';
    if (!requestData.systemSqName) requestData.systemSqName = '未知组件';
    console.log('发送AI分析请求:', requestData);
    return request.post('/data-etable/gain-data', requestData);
  },

  /**
   * 获取模拟的AI分析结果
   */
  getSimulatedAIResult() {
    // Implementation of getSimulatedAIResult method
  }
};