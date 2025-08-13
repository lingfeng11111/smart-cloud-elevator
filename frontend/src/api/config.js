// API配置文件

// 后端API基础URL
// 在开发环境下使用代理，生产环境下直接使用相对路径
const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : '/api';

export default {
  API_BASE_URL
};