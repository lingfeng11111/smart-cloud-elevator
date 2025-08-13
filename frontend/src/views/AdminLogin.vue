<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AuthService from '../services/authService';
import TechGridBackground from '../components/TechGridBackground.vue';

const router = useRouter();
const userPhone = ref('');
const password = ref('');
const rememberMe = ref(false);
const errorMessage = ref('');
const isLoading = ref(false);

const handleLogin = async () => {
  if (!userPhone.value || !password.value) {
    errorMessage.value = '请输入手机号/邮箱和密码';
    return;
  }
  
  isLoading.value = true;
  
  try {
    const result = await AuthService.login(userPhone.value, password.value);
    
    if (result.success) {
      // 登录成功后不再需要保存用户数据
      // AuthService.saveUserData(result.data);
      
      // if (rememberMe.value) {
      //   localStorage.setItem('rememberedUsername', username.value);
      // }
      
      // 使用重定向方法获取路由
      router.push(AuthService.getRedirectRoute());
    } else {
      errorMessage.value = result.message || '用户名或密码错误';
    }
  } catch (error) {
    console.error('登录失败:', error);
    errorMessage.value = '登录失败，请稍后再试';
  } finally {
    isLoading.value = false;
  }
};

// 不再需要自动填充用户名
// if (localStorage.getItem('rememberedUsername')) {
//   username.value = localStorage.getItem('rememberedUsername');
//   rememberMe.value = true;
// }
</script>

<template>
  <div class="login-container">
    <TechGridBackground />
    <div class="floating-elements">
      <div class="floating-circle circle-1"></div>
      <div class="floating-circle circle-2"></div>
      <div class="floating-circle circle-3"></div>
    </div>
    <div class="login-panel panel">
      <div class="login-header">
        <div class="logo-container">
          <div class="logo-icon">
            <svg viewBox="0 0 100 100" class="elevator-icon">
              <rect x="20" y="10" width="60" height="80" fill="none" stroke="currentColor" stroke-width="2" rx="5"/>
              <rect x="25" y="15" width="50" height="15" fill="currentColor" opacity="0.3"/>
              <rect x="25" y="35" width="50" height="15" fill="currentColor" opacity="0.5"/>
              <rect x="25" y="55" width="50" height="15" fill="currentColor" opacity="0.7"/>
              <rect x="25" y="75" width="50" height="10" fill="currentColor"/>
              <circle cx="85" cy="50" r="3" fill="currentColor"/>
            </svg>
          </div>
        </div>
        <h1 class="login-title">
          <span class="title-text">智云梯</span>
          <div class="title-underline"></div>
        </h1>
        <p class="login-subtitle">
          <span class="subtitle-text">SMART CLOUD ELEVATOR</span>
          <span class="subtitle-accent">用户登录</span>
        </p>
      </div>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="userPhone">手机号/邮箱</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </span>
            <input 
              type="text" 
              id="userPhone" 
              v-model="userPhone" 
              placeholder="请输入手机号或邮箱"
              autocomplete="username"
              class="tech-input"
            />
            <div class="input-border-effect"></div>
          </div>
        </div>
        
        <div class="form-group">
          <label for="password">密码</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </span>
            <input 
              type="password" 
              id="password" 
              v-model="password"
              placeholder="请输入密码" 
              autocomplete="current-password"
              class="tech-input"
            />
            <div class="input-border-effect"></div>
          </div>
        </div>
        
        <div class="form-options">
          <label class="remember-me">
            <input type="checkbox" v-model="rememberMe" />
            <span>记住我</span>
          </label>
          <!-- <a href="#" class="forgot-password">忘记密码?</a> -->
        </div>
        
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        
        <button 
          type="submit" 
          class="login-button tech-button"
          :disabled="isLoading"
        >
          <div class="button-bg"></div>
          <div class="button-content">
            <span v-if="isLoading" class="loading-spinner"></span>
            <span v-else class="button-text">登录</span>
            <div class="button-particles"></div>
          </div>
          <div class="button-glow"></div>
        </button>
      </form>
      
      <div class="login-footer">
        <p class="system-version">智云梯 v1.0</p>
        <p class="system-info tech-text">SMART CLOUD ELEVATOR</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

/* 浮动装饰元素 */
.floating-elements {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.floating-circle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(30, 144, 255, 0.3), rgba(100, 181, 246, 0.1));
  animation: float 6s ease-in-out infinite;
}

.circle-1 {
  width: 120px;
  height: 120px;
  top: 10%;
  left: 10%;
  animation-delay: 0s;
}

.circle-2 {
  width: 80px;
  height: 80px;
  top: 70%;
  right: 15%;
  animation-delay: 2s;
}

.circle-3 {
  width: 60px;
  height: 60px;
  top: 30%;
  right: 25%;
  animation-delay: 4s;
}

.login-panel {
  width: 100%;
  max-width: 450px;
  background: rgba(15, 25, 45, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(30, 144, 255, 0.3);
  border-radius: 20px;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.4),
    0 0 60px rgba(30, 144, 255, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  padding: 0;
  position: relative;
  z-index: 2;
  animation: panelSlideIn 1s ease-out;
}

.login-header {
  text-align: center;
  padding: 40px 30px 30px;
  background: linear-gradient(135deg, rgba(30, 144, 255, 0.1), rgba(100, 181, 246, 0.05));
  border-bottom: 1px solid rgba(30, 144, 255, 0.2);
  border-radius: 20px 20px 0 0;
  position: relative;
  overflow: hidden;
}

.login-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(30, 144, 255, 0.1), transparent);
  animation: shimmer 3s infinite;
}

.logo-container {
  margin-bottom: 20px;
}

.logo-icon {
  display: inline-block;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #1e90ff, #64b5f6);
  border-radius: 15px;
  padding: 12px;
  box-shadow: 0 8px 25px rgba(30, 144, 255, 0.4);
  animation: logoFloat 3s ease-in-out infinite;
}

.elevator-icon {
  width: 100%;
  height: 100%;
  color: white;
}

.login-title {
  margin: 0 0 15px;
  position: relative;
}

.title-text {
  font-size: 1.8rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1e90ff, #64b5f6, #42a5f5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: block;
  animation: titleGlow 2s ease-in-out infinite alternate;
}

.title-underline {
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, #1e90ff, #64b5f6);
  margin: 8px auto;
  border-radius: 2px;
  animation: underlineExpand 1.5s ease-out 0.5s both;
}

.login-subtitle {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.subtitle-text {
  font-size: 0.85rem;
  color: rgba(30, 144, 255, 0.8);
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
  font-weight: 500;
}

.subtitle-accent {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.login-form {
  padding: 40px 30px 30px;
  position: relative;
}

.form-group {
  margin-bottom: 25px;
  position: relative;
}

.form-group label {
  display: block;
  margin-bottom: 10px;
  font-weight: 600;
  font-size: 0.9rem;
  color: rgba(30, 144, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 16px;
  color: rgba(30, 144, 255, 0.7);
  display: flex;
  align-items: center;
  z-index: 2;
  transition: all 0.3s ease;
}

.tech-input {
  width: 100%;
  padding: 16px 16px 16px 50px;
  border: 2px solid rgba(30, 144, 255, 0.3);
  background: rgba(15, 25, 45, 0.8);
  border-radius: 12px;
  color: #ffffff;
  font-size: 1rem;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 1;
}

.tech-input:focus {
  outline: none;
  border-color: #1e90ff;
  background: rgba(15, 25, 45, 0.95);
  box-shadow: 
    0 0 20px rgba(30, 144, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.tech-input:focus + .input-border-effect {
  opacity: 1;
  transform: scaleX(1);
}

.tech-input:focus ~ .input-icon {
  color: #1e90ff;
  transform: scale(1.1);
}

.tech-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
  transition: color 0.3s ease;
}

.tech-input:focus::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.input-border-effect {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, #1e90ff, #64b5f6, #42a5f5);
  border-radius: 0 0 12px 12px;
  opacity: 0;
  transform: scaleX(0);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 2;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  font-size: 0.9rem;
}

.remember-me {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.8);
  transition: color 0.3s ease;
}

.remember-me:hover {
  color: #1e90ff;
}

.remember-me input {
  margin-right: 10px;
  accent-color: #1e90ff;
  transform: scale(1.1);
}

.forgot-password {
  color: #1e90ff;
  text-decoration: none;
  transition: all 0.3s ease;
  font-weight: 500;
}

.forgot-password:hover {
  color: #64b5f6;
  text-shadow: 0 0 8px rgba(30, 144, 255, 0.5);
}

.error-message {
  color: #ff6b6b;
  margin-bottom: 20px;
  font-size: 0.9rem;
  padding: 12px 16px;
  background: rgba(255, 107, 107, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(255, 107, 107, 0.3);
  animation: errorShake 0.5s ease-in-out;
}

.tech-button {
  width: 100%;
  height: 56px;
  background: transparent;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.button-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1e90ff, #64b5f6);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.button-content {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: white;
}

.button-text {
  position: relative;
  z-index: 3;
}

.button-glow {
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(135deg, #1e90ff, #64b5f6);
  border-radius: 14px;
  opacity: 0;
  filter: blur(8px);
  transition: opacity 0.3s ease;
  z-index: 0;
}

.tech-button:hover .button-bg {
  transform: scale(1.02);
  box-shadow: 0 8px 25px rgba(30, 144, 255, 0.4);
}

.tech-button:hover .button-glow {
  opacity: 0.7;
}

.tech-button:active {
  transform: translateY(1px);
}

.tech-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.tech-button:disabled .button-bg {
  background: linear-gradient(135deg, #666, #888);
}

.button-particles {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s linear infinite;
  display: inline-block;
}

.login-footer {
  padding: 25px 30px;
  text-align: center;
  border-top: 1px solid rgba(30, 144, 255, 0.2);
  background: linear-gradient(135deg, rgba(15, 25, 45, 0.8), rgba(30, 144, 255, 0.05));
  border-radius: 0 0 20px 20px;
}

.system-version {
  margin: 0 0 8px;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.system-info {
  margin: 0;
  font-size: 0.8rem;
  letter-spacing: 2px;
  color: rgba(30, 144, 255, 0.6);
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
}

/* 动画效果 */
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(180deg); }
}

@keyframes panelSlideIn {
  0% {
    opacity: 0;
    transform: translateY(50px) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

@keyframes logoFloat {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-5px) rotate(5deg); }
}

@keyframes titleGlow {
  0% { text-shadow: 0 0 10px rgba(30, 144, 255, 0.5); }
  100% { text-shadow: 0 0 20px rgba(30, 144, 255, 0.8), 0 0 30px rgba(100, 181, 246, 0.5); }
}

@keyframes underlineExpand {
  0% {
    width: 0;
    opacity: 0;
  }
  100% {
    width: 60px;
    opacity: 1;
  }
}

@keyframes errorShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-container {
    padding: 15px;
  }
  
  .login-panel {
    max-width: 100%;
  }
  
  .login-header {
    padding: 30px 20px 25px;
  }
  
  .login-form {
    padding: 30px 20px 25px;
  }
  
  .title-text {
    font-size: 1.5rem;
  }
  
  .floating-circle {
    display: none;
  }
}
</style>