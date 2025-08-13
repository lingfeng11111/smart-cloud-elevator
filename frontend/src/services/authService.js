import axios from 'axios';
import config from '../api/config';

const API_BASE_URL = config.API_BASE_URL;

// 从sessionStorage初始化状态，这样刷新页面后状态不会丢失
let isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
let userRole = sessionStorage.getItem('userRole');
let currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');

/**
 * 认证相关的服务
 */
const AuthService = {
  /**
   * 登录方法
   * @param {string} userPhone - 用户手机号或邮箱
   * @param {string} password - 密码
   * @returns {Promise<Object>} 登录结果
   */
  async login(userPhone, password) {
    try {
      const response = await axios.post(`${API_BASE_URL}/users/login`, {
        userPhone: userPhone,
        email: userPhone, // 支持邮箱登录
        password: password
      }, {
        withCredentials: true // 支持cookie
      });
      
      if (response.data.code === 200) {
        const userData = response.data.data;
        const role = userData; // 后端返回的role字符串
        
        isAuthenticated = true;
        userRole = role;
        
        // 获取当前登录用户信息
        const userInfoResponse = await axios.get(`${API_BASE_URL}/users/me`, {
          withCredentials: true
        });
        
        if (userInfoResponse.data.code === 200) {
          currentUser = userInfoResponse.data.data;
          sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        // 将登录状态保存到sessionStorage
        sessionStorage.setItem('isAuthenticated', 'true');
        sessionStorage.setItem('userRole', role);
        
        return {
          success: true,
          data: {
            role: role,
            user: currentUser
          },
        };
      } else {
        return {
          success: false,
          message: response.data.message || '登录失败',
        };
      }
     } catch (error) {
       console.error('登录请求失败:', error);
       return {
         success: false,
         message: error.response?.data?.message || '网络错误，请稍后再试',
       };
     }
  },

  /**
   * 注销方法
   */
  async logout() {
    try {
      await axios.post(`${API_BASE_URL}/users/logout`, {}, {
        withCredentials: true
      });
    } catch (error) {
      console.error('登出请求失败:', error);
    } finally {
      // 无论后端请求是否成功，都清除前端状态
      isAuthenticated = false;
      userRole = null;
      currentUser = null;
      // 从sessionStorage中移除登录状态
      sessionStorage.removeItem('isAuthenticated');
      sessionStorage.removeItem('userRole');
      sessionStorage.removeItem('currentUser');
    }
  },

  /**
   * 检查用户是否已认证
   * @returns {boolean} 是否已认证
   */
  isAuthenticated() {
    return isAuthenticated;
  },

  /**
   * 获取当前用户角色
   * @returns {string|null} 用户角色
   */
  getUserRole() {
    return userRole;
  },

  /**
   * 获取用户应该被重定向到的路由
   * @returns {string} 重定向路由
   */
  getRedirectRoute() {
    if (this.isAuthenticated()) {
      const role = this.getUserRole();
      // 根据角色跳转到不同页面
      if (role === 'admin') {
        return '/';
      } else if (role === 'maintenance') {
        return '/maintenance-dashboard';
      } else {
        return '/';
      }
    }
    return '/login';
  },

  /**
   * 获取当前用户信息
   */
  getCurrentUser() {
    return currentUser;
  },
};

export default AuthService;