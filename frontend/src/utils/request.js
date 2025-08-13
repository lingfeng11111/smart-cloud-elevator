import axios from 'axios';
import { ElMessage } from 'element-plus';
import config from '../api/config';

// 创建axios实例
const request = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: 60000,
  withCredentials: true
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 在发送请求之前做些什么
    console.log('发送请求:', config.method?.toUpperCase(), config.url, config.data || config.params);
    return config;
  },
  (error) => {
    // 请求错误处理
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    // 2xx 范围内的状态码都会触发该函数
    console.log('接收响应:', response.status, response.data);
    
    // 检查业务状态码
    if (response.data && typeof response.data === 'object') {
      const { code, message } = response.data;
      
      // 如果业务状态码不是200，显示错误信息
      if (code && code !== 200) {
        console.error(`业务错误 [${code}]:`, message);
        ElMessage.error(`操作失败: ${message || '未知错误'}`);
        
        // 特殊处理一些错误码
        switch (code) {
          case 401:
            // 未登录，跳转到登录页
            window.location.href = '/login';
            break;
          case 403:
            // 无权限
            ElMessage.error('您没有权限执行此操作');
            break;
          case 500:
            // 服务器内部错误
            ElMessage.error('服务器内部错误，请稍后重试');
            break;
        }
        
        return Promise.reject(new Error(`业务错误: ${code} - ${message}`));
      }
    }
    
    return response;
  },
  (error) => {
    // 超出 2xx 范围的状态码都会触发该函数
    console.error('响应错误:', error);
    
    let errorMessage = '网络请求失败';
    
    if (error.response) {
      // 服务器响应了错误状态码
      const { status, statusText, data } = error.response;
      console.error(`HTTP错误 [${status}]:`, statusText, data);
      
      switch (status) {
        case 400:
          errorMessage = '请求参数错误';
          break;
        case 401:
          errorMessage = '未登录或登录已过期';
          window.location.href = '/login';
          break;
        case 403:
          errorMessage = '没有权限访问';
          break;
        case 404:
          errorMessage = '请求的资源不存在';
          break;
        case 500:
          errorMessage = '服务器内部错误';
          break;
        case 502:
          errorMessage = '网关错误';
          break;
        case 503:
          errorMessage = '服务不可用';
          break;
        case 504:
          errorMessage = '网关超时';
          break;
        default:
          errorMessage = `服务器错误 (${status})`;
      }
      
      // 如果后端返回了具体的错误信息，优先使用
      if (data && data.message) {
        errorMessage = data.message;
      }
    } else if (error.request) {
      // 请求已发出但没有收到响应
      console.error('网络错误 - 无响应:', error.request);
      errorMessage = '网络连接失败，请检查网络设置';
    } else {
      // 其他错误
      console.error('请求配置错误:', error.message);
      errorMessage = `请求错误: ${error.message}`;
    }
    
    ElMessage.error(errorMessage);
    return Promise.reject(error);
  }
);

export default request; 