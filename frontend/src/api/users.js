import request from '../utils/request';

/**
 * 用户相关API
 */
export default {
  /**
   * 获取所有用户列表
   * @param {Object} [params] - 查询参数
   * @returns {Promise<Object>} 返回用户列表
   */
  getUsers(params = {}) {
    return request.get('/users/get-user', { params });
  },

  /**
   * 添加维修人员
   * @param {Object} user - 用户对象
   * @param {string} user.userName - 用户名称
   * @param {string} user.userPhone - 用户手机号
   * @param {string} user.position - 用户职位
   * @param {string} user.role - 用户角色
   * @param {string} user.password - 用户密码
   * @param {string} user.email - 用户邮箱
   * @returns {Promise<Object>} 返回添加结果
   */
  addUser(user) {
    return request.post('/users/add-user', user);
  },

  /**
   * 更新用户信息
   * @param {Object} user - 用户对象
   * @param {number|string} user.id - 用户ID
   * @param {string} [user.position] - 用户职位
   * @returns {Promise<Object>} 返回更新结果
   */
  updateUser(user) {
    return request.post('/users/update-user', user);
  },

  /**
   * 删除人员
   * @param {number|string} id - 用户ID
   * @returns {Promise<Object>} 返回删除结果
   */
  deleteUser(id) {
    return request.post('/users/delete-user', { id });
  },

  /**
   * 更新用户状态
   * @param {number|string} userId - 用户ID
   * @param {string} condition - 用户状态（如：空闲、忙碌、离线等）
   * @returns {Promise<Object>} 返回更新结果
   */
  updateUserStatus(userId, condition) {
    return request.post('/users/update-user', {
      id: userId,
      condition: condition
    });
  }
};