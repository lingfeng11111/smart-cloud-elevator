<template>
  <div class="tech-grid-background">
    <div class="grid-container">
      <div class="perspective-grid">
        <div class="grid-floor"></div>
        <div class="grid-left-wall"></div>
        <div class="grid-right-wall"></div>
      </div>
      <div class="grid-overlay"></div>
      <div class="grid-glow"></div>
      <div class="moving-particles"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TechGridBackground',
  mounted() {
    this.createParticles();
  },
  methods: {
    createParticles() {
      const particlesContainer = document.querySelector('.moving-particles');
      if (!particlesContainer) return;
      
      // 创建30个移动粒子
      for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // 随机位置
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        const posZ = Math.random() * 500 - 250; // Z轴随机位置
        
        // 随机大小
        const size = Math.random() * 5 + 2;
        
        // 随机速度和方向
        const speedX = (Math.random() - 0.5) * 0.2;
        const speedY = (Math.random() - 0.5) * 0.2;
        const speedZ = Math.random() * 0.5; // Z轴移动速度
        
        particle.style.left = `${posX}%`;
        particle.style.top = `${posY}%`;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.transform = `translateZ(${posZ}px)`;
        
        // 存储速度信息
        particle.dataset.speedX = speedX;
        particle.dataset.speedY = speedY;
        particle.dataset.speedZ = speedZ;
        particle.dataset.posZ = posZ;
        
        particlesContainer.appendChild(particle);
      }
      
      // 动画循环
      this.animateParticles();
    },
    animateParticles() {
      const particles = document.querySelectorAll('.particle');
      
      particles.forEach(particle => {
        let posX = parseFloat(particle.style.left);
        let posY = parseFloat(particle.style.top);
        let posZ = parseFloat(particle.dataset.posZ);
        const speedX = parseFloat(particle.dataset.speedX);
        const speedY = parseFloat(particle.dataset.speedY);
        const speedZ = parseFloat(particle.dataset.speedZ);
        
        // 更新位置
        posX += speedX;
        posY += speedY;
        posZ += speedZ;
        
        // Z轴边界检查
        if (posZ > 200) posZ = -200;
        
        // X和Y轴边界检查
        if (posX > 100) posX = 0;
        if (posX < 0) posX = 100;
        if (posY > 100) posY = 0;
        if (posY < 0) posY = 100;
        
        // 应用新位置
        particle.style.left = `${posX}%`;
        particle.style.top = `${posY}%`;
        particle.style.transform = `translateZ(${posZ}px)`;
        particle.dataset.posZ = posZ;
        
        // 根据Z轴位置调整不透明度，创造深度感
        const opacity = (posZ + 250) / 500;
        particle.style.opacity = Math.max(0.2, Math.min(0.8, opacity));
      });
      
      requestAnimationFrame(this.animateParticles);
    }
  }
};
</script>

<style scoped>
.tech-grid-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  overflow: hidden;
  background-color: rgba(0, 10, 30, 0.97);
  pointer-events: none;
}

.grid-container {
  position: absolute;
  width: 100%;
  height: 100%;
  perspective: 1200px; /* 增强透视效果 */
}

/* 3D透视网格 */
.perspective-grid {
  position: absolute;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transform: rotateX(60deg) rotateZ(0deg);
  animation: rotateGrid 120s infinite linear;
}

/* 网格地板 - 恢复完整网格 */
.grid-floor {
  position: absolute;
  width: 200%;
  height: 200%;
  left: -50%;
  top: -50%;
  background-image: 
    linear-gradient(90deg, rgba(30, 144, 255, 0.3) 1px, transparent 1px),
    linear-gradient(rgba(30, 144, 255, 0.3) 1px, transparent 1px);
  background-size: 50px 50px;
  transform: translateZ(-100px);
  animation: moveFloor 20s infinite linear;
}

/* 左侧墙 - 添加完整网格 */
.grid-left-wall {
  position: absolute;
  width: 100%;
  height: 100%;
  left: -90%;
  top: 0;
  /* 使用完整网格(水平和竖直线)，避免与地面重叠 */
  background-image: 
    linear-gradient(90deg, rgba(30, 144, 255, 0.15) 1px, transparent 1px),
    linear-gradient(rgba(30, 144, 255, 0.15) 1px, transparent 1px);
  background-size: 75px 75px;
  background-position: 25px 25px; /* 偏移网格起始位置 */
  transform: rotateY(90deg) translateZ(-250px); /* 调整距离 */
  opacity: 0.4;
}

/* 右侧墙 - 添加完整网格 */
.grid-right-wall {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: -90%;
  /* 使用完整网格(水平和竖直线)，避免与地面重叠 */
  background-image: 
    linear-gradient(90deg, rgba(30, 144, 255, 0.15) 1px, transparent 1px),
    linear-gradient(rgba(30, 144, 255, 0.15) 1px, transparent 1px);
  background-size: 75px 75px;
  background-position: 25px 25px; /* 偏移网格起始位置 */
  transform: rotateX(90deg) translateZ(-250px); /* 调整距离 */
  opacity: 0.4;
}

/* 网格叠加层 - 点状网格 */
.grid-overlay {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: radial-gradient(circle, rgba(30, 144, 255, 0.3) 1px, transparent 1px);
  background-size: 30px 30px;
  animation: pulse 8s infinite alternate;
}

/* 发光效果 */
.grid-glow {
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 50% 50%, rgba(0, 80, 180, 0.3), transparent 70%);
  animation: glow 10s infinite alternate;
}

/* 移动粒子 */
.moving-particles {
  position: absolute;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
}

.particle {
  position: absolute;
  background-color: rgba(100, 181, 246, 0.9);
  border-radius: 50%;
  box-shadow: 0 0 8px 3px rgba(30, 144, 255, 0.8);
  pointer-events: none;
  transition: opacity 0.5s ease;
}

/* 动画 */
@keyframes moveFloor {
  from { transform: translateZ(-100px) translateY(0); }
  to { transform: translateZ(-100px) translateY(50px); }
}

@keyframes pulse {
  0% { opacity: 0.5; }
  50% { opacity: 0.8; }
  100% { opacity: 0.5; }
}

@keyframes glow {
  0% { opacity: 0.5; transform: scale(0.9); }
  50% { opacity: 0.8; transform: scale(1.1); }
  100% { opacity: 0.5; transform: scale(0.9); }
}

@keyframes rotateGrid {
  0% { transform: rotateX(60deg) rotateZ(0deg); }
  100% { transform: rotateX(60deg) rotateZ(360deg); }
}
</style>