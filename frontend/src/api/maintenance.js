import request from '../utils/request';

/**
 * 维护记录相关API
 */
export default {
  /**
   * 分页查询维护记录
   * @param {Object} params - 查询参数
   * @param {number} params.current - 当前页码
   * @param {number} params.size - 每页数据条数
   * @param {number} [params.id] - 维护记录ID
   * @param {number} [params.userId] - 员工ID
   * @param {string} [params.systemName] - 系统名称
   * @param {string[]} [params.mtTime] - 维护时间范围
   * @returns {Promise<Object>} 返回查询结果
   */
  getMaintenance(params) {
    return request.get('/maintain-table/get-maintain', { params });
  },

  /**
   * 创建维护任务
   * @param {Object} data - 维护任务对象
   * @param {number} data.userId - 用户ID
   * @param {string} data.mtDataId - 维护数据ID
   * @param {string} data.systemName - 系统名称
   * @param {string} data.status - 维护状态
   * @param {string} [data.remark] - 备注信息
   * @returns {Promise<Object>} 返回创建结果
   */
  createMaintenance(data) {
    return request.post('/maintain-table/add-maintain', data);
  },

  /**
   * 更新维护记录
   * @param {Object} data - 维护记录对象
   * @param {number} data.id - 记录ID
   * @param {number} data.userId - 用户ID
   * @param {string} data.status - 维护状态
   * @param {string} [data.remark] - 备注信息
   * @param {string} [data.descr] - 维修日志描述
   * @returns {Promise<Object>} 返回更新结果
   */
  updateMaintenance(data) {
    return request.post('/maintain-table/update-maintain', data);
  }
};