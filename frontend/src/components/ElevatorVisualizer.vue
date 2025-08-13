<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, defineEmits } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls';

const props = defineProps({
  animationData: {
    type: Object,
    default: null,
  },
  is360ModeActive: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['toggle-360-mode']);

const cameraMode = ref('follow');

// 系统快捷方式数据
const systemShortcuts = ref([
  { name: '曳引系统', icon: '/traction-system-icon.png', route: '/system/sys-001', error: false },
  { name: '轿门系统', icon: '/door-system-icon.png', route: '/system/sys-004', error: false },
  { name: '导向系统', icon: '/gui-system-icon.png', route: '/system/sys-002', error: false },
  { name: '电气系统', icon: '/electri-system-icon.png', route: '/system/sys-003', error: false }
]);

watch(() => props.is360ModeActive, (isActive) => {
  cameraMode.value = isActive ? 'orbit' : 'follow';
});

watch(cameraMode, (newMode) => {
  if (!camera || !controls) return;

  if (newMode === 'follow') {
    // 切换到跟随视角
    const targetY = elevatorCabin.position.y;
    camera.position.set(0, targetY, 10);
    controls.target.set(0, targetY, 0);
  } else {
    // 切换到360°自由视角
    camera.position.set(12, 20, 18);
    controls.target.set(0, 15, 0);
  }
});

const toggleCameraMode = () => {
  // 仅触发事件，让父组件来改变状态
  emit('toggle-360-mode');
};

// 智云梯仓井DOM引用
const elevatorContainer = ref(null);

// Three.js 相关变量
let scene, camera, renderer, controls;
let elevatorShaft, elevatorCabin, elevatorDoorLeft, elevatorDoorRight;
let floorLights = [];
let frameId = null;
// 蓝色光效相关变量
let blueGlow = [];
let glowTime = 0;
let cabinStatusLight;

// 电梯尺寸常量
const SHAFT_WIDTH = 5;
const SHAFT_DEPTH = 5;
const SHAFT_HEIGHT = 45; // 高一些以容纳15层楼
const CABIN_WIDTH = 3;
const CABIN_DEPTH = 3;
const CABIN_HEIGHT = 2.8;
const FLOOR_HEIGHT = 3;
const FLOOR_COUNT = 15; // 改为15层

// 电梯位置计算 - 从0楼开始
const elevatorPosition = computed(() => {
  if (!props.animationData) return CABIN_HEIGHT / 2; // 默认停在1楼
  const { currentFloor } = props.animationData;
  return (currentFloor - 1) * FLOOR_HEIGHT + CABIN_HEIGHT/2;
});

// 电梯门状态
const doorOpen = computed(() => props.animationData?.doorStatus === '打开');

// 电梯运行状态
const isMoving = computed(() => {
  return props.animationData.currentFloor !== props.animationData.targetFloor;
});

// 电梯运动方向
const elevatorDirection = computed(() => {
  if (!isMoving.value) return 0; // 静止
  return props.animationData.targetFloor > props.animationData.currentFloor ? 1 : -1; // 1表示向上，-1表示向下
});

// 电梯运行状态
const elevatorStatus = computed(() => {
  if (!props.animationData) return '未连接';
  return props.animationData.status || '停止';
});

// 初始化Three.js场景
const initThreeJS = () => {
  try {
    const container = elevatorContainer.value;
    if (!container) {
      console.error('电梯容器DOM元素未找到');
      return;
    }
    
    console.log('开始初始化Three.js场景', container);
    
    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;
    console.log('容器尺寸:', width, height);

    // 创建场景
    scene = new THREE.Scene();
    scene.background = null; // 透明背景
    
    // 相机设置 - 调整位置更好地观察电梯
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    
    // 默认使用平视视角 - 调整为面向楼层数字的视角（后墙面）
    if (cameraMode.value === 'follow') {
      camera.position.set(0, 5, 10); // 正面平视 (z轴正方向看向楼层数字)
      camera.lookAt(0, 5, -2); // 看向电梯内部偏后墙方向
    } else {
      camera.position.set(12, 20, 18); // 俯视角度
      camera.lookAt(0, 15, 0); // 看向电梯中部
    }
    
    console.log('相机初始化模式:', cameraMode.value, '位置:', camera.position);
    
    // 创建高质量渲染器
    renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      transparent: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMappingExposure = 1;
    
    // 清除容器中可能存在的旧canvas元素
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    
    container.appendChild(renderer.domElement);
    
    // 添加增强光照
    // 环境光 - 增强亮度
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);
    
    // 主方向光 - 增强亮度
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(5, 30, 15);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);
    
    // 第二方向光 - 从另一侧照射
    const secondaryLight = new THREE.DirectionalLight(0xffffff, 1.5);
    secondaryLight.position.set(-5, 20, -10);
    scene.add(secondaryLight);
    
    // 顶部点光源 - 增强亮度
    const topLight = new THREE.PointLight(0x7fb2ff, 100, 50);
    topLight.position.set(0, SHAFT_HEIGHT, 0);
    scene.add(topLight);
    
    // 中部点光源 - 新增
    const midLight = new THREE.PointLight(0xffffff, 80, 30);
    midLight.position.set(0, SHAFT_HEIGHT/2, 0);
    scene.add(midLight);
    
    // 底部点光源 - 增强亮度
    const bottomLight = new THREE.PointLight(0xffffff, 50, 30);
    bottomLight.position.set(0, 3, 0);
    scene.add(bottomLight);
    
    // 电梯前方点光源 - 新增
    const frontLight = new THREE.PointLight(0xffffff, 40, 20);
    frontLight.position.set(0, 15, SHAFT_DEPTH);
    scene.add(frontLight);
    
    // 创建逼真的智云梯系统
    createElevatorShaft();
    createElevatorCabin();
    createFloorLights();
    // 创建蓝色光效
    createBlueGlowEffects();

    // 添加轨道控制器
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI * 0.9; // 限制相机角度，避免穿过底面
    controls.target.set(0, 15, 0); // 设置控制中心点在电梯中部
    controls.autoRotate = true; // 启用自动旋转
    controls.autoRotateSpeed = 0.5; // 设置自动旋转速度
    controls.update();
    
    // 启动动画循环
    animate();
    
    // 添加窗口大小变化监听
    window.addEventListener('resize', handleResize);
    
    console.log('Three.js初始化完成');
  } catch (error) {
    console.error('Three.js初始化错误:', error);
  }
};

// 创建电梯井
const createElevatorShaft = () => {
  // 创建电梯井墙壁（四面墙，底部开放）
  const createWall = (width, height, depth, x, y, z, rotationY = 0) => {
    const wallGeometry = new THREE.BoxGeometry(width, height, depth);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a5b7c,  // 更亮的蓝色
      metalness: 0.3,
      roughness: 0.4,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(x, y, z);
    if (rotationY !== 0) {
      wall.rotation.y = rotationY;
    }
    scene.add(wall);
    return wall;
  };

  // 创建四面墙
  const wallThickness = 0.15;
  
  // 左墙
  createWall(wallThickness, SHAFT_HEIGHT, SHAFT_DEPTH, -SHAFT_WIDTH/2, SHAFT_HEIGHT/2, 0);
  
  // 右墙
  createWall(wallThickness, SHAFT_HEIGHT, SHAFT_DEPTH, SHAFT_WIDTH/2, SHAFT_HEIGHT/2, 0);
  
  // 后墙
  createWall(SHAFT_WIDTH, SHAFT_HEIGHT, wallThickness, 0, SHAFT_HEIGHT/2, -SHAFT_DEPTH/2);
  
  // 前墙 (透明度更高，可以看到电梯)
  const frontWall = createWall(SHAFT_WIDTH, SHAFT_HEIGHT, wallThickness, 0, SHAFT_HEIGHT/2, SHAFT_DEPTH/2);
  frontWall.material.opacity = 0.1;
  const baseGeometry = new THREE.BoxGeometry(SHAFT_WIDTH + 0.5, 0.5, SHAFT_DEPTH + 0.5);
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x555555, 
    metalness: 0.7,
    roughness: 0.3,
    emissive: 0x222222,
    emissiveIntensity: 0.2
  });
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.y = 0;
  scene.add(base);
  const railGeometry = new THREE.BoxGeometry(0.1, SHAFT_HEIGHT, 0.1);
  const railMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888, 
    roughness: 0.1,
    emissive: 0x222222,
    emissiveIntensity: 0.1
  });
  const railPositions = [
    [SHAFT_WIDTH/2 - 0.3, 0, SHAFT_DEPTH/2 - 0.3],
    [SHAFT_WIDTH/2 - 0.3, 0, -SHAFT_DEPTH/2 + 0.3],
    [-SHAFT_WIDTH/2 + 0.3, 0, SHAFT_DEPTH/2 - 0.3],
    [-SHAFT_WIDTH/2 + 0.3, 0, -SHAFT_DEPTH/2 + 0.3]
  ];
  
  railPositions.forEach(pos => {
    const rail = new THREE.Mesh(railGeometry, railMaterial);
    rail.position.set(pos[0], SHAFT_HEIGHT/2, pos[2]);
    scene.add(rail);
  });
  
  // 添加楼层标记（只在后墙上）
  for(let i = 1; i <= FLOOR_COUNT; i++) {
    const y = i * FLOOR_HEIGHT;
    
    // 楼层数字标记
    const floorMarkerGeometry = new THREE.PlaneGeometry(0.6, 0.6);
    
    // 创建带有数字的纹理
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 64, 64);
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#00ffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i.toString(), 32, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    const markerMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true
    });
    
    const floorMarker = new THREE.Mesh(floorMarkerGeometry, markerMaterial);
    floorMarker.position.set(0, y - 0.5, -SHAFT_DEPTH/2 + 0.1);
    scene.add(floorMarker);
  }
};

// 创建电梯箱
const createElevatorCabin = () => {
  // 创建电梯箱体
  const cabinGeometry = new THREE.BoxGeometry(CABIN_WIDTH, CABIN_HEIGHT, CABIN_DEPTH);
  const cabinMaterial = new THREE.MeshStandardMaterial({
    color: 0x4080bf,  // 更亮的蓝色
    metalness: 0.8,
    roughness: 0.2,
    transparent: true,
    opacity: 0.9,
    emissive: 0x112244,
    emissiveIntensity: 0.2
  });
  
  // 创建电梯箱网格物体
  elevatorCabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
  
  // 定位电梯箱（初始位置在1楼，完全贴合地面）
  elevatorCabin.position.y = 0;
  
  // 轿厢内部的状态指示灯 (使用更安全的方式)
  const lightGeometry = new THREE.SphereGeometry(0.1, 16, 16);
  // 使用StandardMaterial并设置emissive属性，使其自发光但又不影响其他物体
  const lightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff, // 材质本身颜色
      emissive: 0xffffff, // 自发光颜色
      emissiveIntensity: 1 // 初始自发光强度
  });
  cabinStatusLight = new THREE.Mesh(lightGeometry, lightMaterial);
  cabinStatusLight.position.set(0, CABIN_HEIGHT - 0.3, 0);
  
  elevatorCabin.add(cabinStatusLight);
  scene.add(elevatorCabin);
  
  // 添加电梯轿厢顶部
  const topGeometry = new THREE.BoxGeometry(CABIN_WIDTH + 0.1, 0.1, CABIN_DEPTH + 0.1);
  const topMaterial = new THREE.MeshStandardMaterial({
    color: 0x5c92d2,  // 更亮的蓝色
    metalness: 0.9,
    roughness: 0.1,
    emissive: 0x1a3c6c,
    emissiveIntensity: 0.3
  });
  
  const cabinTop = new THREE.Mesh(topGeometry, topMaterial);
  cabinTop.position.y = CABIN_HEIGHT / 2;
  elevatorCabin.add(cabinTop);
  
  // 添加电梯轿厢底部
  const bottomGeometry = new THREE.BoxGeometry(CABIN_WIDTH + 0.1, 0.1, CABIN_DEPTH + 0.1);
  const bottomMaterial = new THREE.MeshStandardMaterial({
    color: 0x5c7e90,  // 更亮的蓝灰色
    metalness: 0.8,
    roughness: 0.3,
    emissive: 0x1a2c3c,
    emissiveIntensity: 0.2
  });
  
  const cabinBottom = new THREE.Mesh(bottomGeometry, bottomMaterial);
  cabinBottom.position.y = -CABIN_HEIGHT / 2;
  elevatorCabin.add(cabinBottom);
  
  // 添加电梯门
  const doorGeometry = new THREE.BoxGeometry(CABIN_WIDTH / 2 - 0.05, CABIN_HEIGHT - 0.2, 0.1);
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a65b1,  // 更亮的蓝色
    metalness: 0.9,
    roughness: 0.1,
    emissive: 0x0a2551,
    emissiveIntensity: 0.3
  });
  
  // 左门
  elevatorDoorLeft = new THREE.Mesh(doorGeometry, doorMaterial);
  elevatorDoorLeft.position.set(-(CABIN_WIDTH / 4) + 0.05, 0, CABIN_DEPTH / 2);
  elevatorCabin.add(elevatorDoorLeft);
  
  // 右门
  elevatorDoorRight = new THREE.Mesh(doorGeometry, doorMaterial);
  elevatorDoorRight.position.set((CABIN_WIDTH / 4) - 0.05, 0, CABIN_DEPTH / 2);
  elevatorCabin.add(elevatorDoorRight);
};

// 创建楼层指示灯
const createFloorLights = () => {
  floorLights = [];
  
  // 为每层楼创建指示灯
  for(let i = 0; i < FLOOR_COUNT; i++) {
    // 调整楼层灯位置，确保第一层是在底部
    const y = i * FLOOR_HEIGHT + FLOOR_HEIGHT / 2;
    const lightGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    // 使用标准材质
    const lightMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,  // 更亮的灰色
      emissive: 0x444444,
      emissiveIntensity: 0.8
    });
    
    const light = new THREE.Mesh(lightGeometry, lightMaterial);
    light.position.set(SHAFT_WIDTH/2 + 0.3, y, 0);
    scene.add(light);
    floorLights.push(light);
  }
};

// 创建蓝色光晕效果
const createBlueGlowEffects = () => {
  // 创建光效组
  // 光环效果 - 多创建几个使效果更丰富
  for (let i = 0; i < 5; i++) { // 增加到5个光环
    // 创建圆环几何体 - 增加细分数量以减少马赛克
    const ringGeometry = new THREE.RingGeometry(0.2, 5.0, 64, 4);
    
    // 创建发光材质 - 更适合主题色的蓝色，亮度适中
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x3a5b7c, // 调整为主题色的蓝色
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false, // 禁用深度写入以改善透明效果
      blending: THREE.AdditiveBlending // 使用加法混合以增强发光效果
    });
    
    // 创建网格
    const ring = new THREE.Mesh(ringGeometry, glowMaterial);
    
    // 水平放置
    ring.rotation.x = -Math.PI / 2;
    
    // 初始位置在电梯底部
    ring.position.y = 0.1;
    
    // 添加到场景
    scene.add(ring);
    
    // 存储到数组中以便动画更新
    blueGlow.push({
      mesh: ring,
      delay: i * 0.7, // 缩短延迟，使效果更密集
      active: false,
      type: 'ring',
      scale: 1 + i * 0.4 // 不同大小的光环
    });
  }
  
  // 添加向上流动的光线效果
  const createFlowingLines = (count, direction) => {
    for (let i = 0; i < count; i++) {
      // 线条几何体
      const lineGeometry = new THREE.BufferGeometry();
      const vertices = new Float32Array(6); // 每条线有2个点，每个点3个坐标值
      
      // 设置随机位置
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const height = Math.random() * 5;
      
      vertices[0] = x; // x1
      vertices[1] = 0; // y1
      vertices[2] = z; // z1
      vertices[3] = x; // x2
      vertices[4] = height; // y2
      vertices[5] = z; // z2
      
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      
      // 线条材质
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x5c92d2,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
      });
      
      // 创建线条
      const line = new THREE.Line(lineGeometry, lineMaterial);
      scene.add(line);
      
      // 保存
      blueGlow.push({
        mesh: line,
        type: 'flowline',
        direction: direction, // 线条流动方向
        speed: 0.05 + Math.random() * 0.1, // 随机速度
        height: height,
        startY: Math.random() * -10, // 随机起始位置
        angle: angle,
        radius: radius
      });
    }
  };
  
  // 创建向上和向下的光线
  createFlowingLines(30, 1); // 向上的光线
  createFlowingLines(30, -1); // 向下的光线
  
  // 光盘效果
  const diskGeometry = new THREE.CircleGeometry(4.0, 64);
  const diskMaterial = new THREE.MeshBasicMaterial({
    color: 0x3a5b7c, // 主题色的蓝色
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  const disk = new THREE.Mesh(diskGeometry, diskMaterial);
  disk.rotation.x = -Math.PI / 2;
  disk.position.y = 0.05;
  scene.add(disk);
  
  blueGlow.push({
    mesh: disk,
    active: true,
    type: 'disk'
  });
  
  // 添加脉冲波效果
  const pulseGeometry = new THREE.SphereGeometry(0.1, 32, 16);
  const pulseMaterial = new THREE.MeshBasicMaterial({
    color: 0x7fb2ff,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });
  
  const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
  pulse.position.y = 0.1;
  scene.add(pulse);
  
  blueGlow.push({
    mesh: pulse,
    active: true,
    type: 'pulse',
    scale: 0.1,
    pulseTime: 0
  });
};

// 更新蓝色光环效果
const updateBlueGlowEffects = () => {
  // 更新动画时间
  glowTime += 0.01;
  
  // 获取电梯运动方向
  const direction = elevatorDirection.value;
  const isActive = isMoving.value;
  
  // 更新每个光效
  blueGlow.forEach(glow => {
    // 确保所有光效跟随电梯
    if (elevatorCabin && glow.mesh) {
      const elevatorBottomY = elevatorCabin.position.y - CABIN_HEIGHT / 2;
      
      // 根据光效类型更新位置
      if (glow.type !== 'flowline') {
        glow.mesh.position.y = elevatorBottomY + 0.05;
      }
    }
    
    // 根据光效类型更新
    if (glow.type === 'ring') {
      // 圆环光效
      // 检查是否应该开始动画（基于延迟）
      if ((glowTime % 3) >= glow.delay && (glowTime % 3) < glow.delay + 1.2) {
        glow.active = true;
        
        // 计算动画进度 (0-1)
        let progress = (glowTime % 3 - glow.delay) / 1.2;
        
        // 使用平滑的缓动函数
        progress = smoothstep(0, 1, progress);
        
        // 根据电梯方向调整光环效果
        let scaleMultiplier = glow.scale || 1;
        
        if (isActive) {
          // 电梯移动时，根据方向调整光环扩散方式
          if (direction > 0) { // 向上运动
            // 更快更大的扩散
            scaleMultiplier *= 1.2;
          } else { // 向下运动
            // 更慢更小的扩散
            scaleMultiplier *= 0.8;
          }
        }
        
        // 更新大小
        glow.mesh.scale.set(
          0.5 + progress * 4 * scaleMultiplier, 
          0.5 + progress * 4 * scaleMultiplier, 
          1
        );
        
        // 更新透明度
        let opacityMax = isActive ? 0.6 : 0.4; // 运动时更亮
        
        if (progress < 0.2) { 
          glow.mesh.material.opacity = smoothstep(0, 1, progress / 0.2) * opacityMax;
        } else {
          glow.mesh.material.opacity = opacityMax * smoothstep(1, 0, (progress - 0.2) / 0.8);
        }
        
        // 颜色变化 - 根据电梯方向变化
        let hue = 0.58; // 默认主题色蓝色
        let saturation = 0.5;
        let lightness = 0.4 + progress * 0.2;
        
        if (isActive) {
          if (direction > 0) { // 向上时偏青色
            hue = 0.53;
            saturation = 0.7;
            lightness = 0.45 + progress * 0.25;
          } else { // 向下时偏蓝紫色
            hue = 0.63;
            saturation = 0.6;
            lightness = 0.4 + progress * 0.2;
          }
        }
        
        glow.mesh.material.color.setHSL(hue, saturation, lightness);
      } else {
        glow.active = false;
        glow.mesh.material.opacity = 0;
      }
    } else if (glow.type === 'flowline') {
      // 流动线效果 - 根据电梯运动方向激活对应方向的线条
      const positions = glow.mesh.geometry.attributes.position.array;
      const elevatorBottomY = elevatorCabin ? elevatorCabin.position.y - CABIN_HEIGHT / 2 : 0;
      
      // 仅在电梯移动时显示，且只显示与电梯移动方向相同的线条
      let shouldShow = isActive && (glow.direction === direction);
      let opacity = shouldShow ? 0.7 : 0;
      
      // 更新线条位置，使其跟随电梯
      let y = glow.startY + glowTime * glow.speed * 10;
      
      // 循环移动线条
      y = y % 10;
      if (y < 0) y += 10;
      
      // 设置线条在电梯底部
      positions[1] = elevatorBottomY + y;
      positions[4] = elevatorBottomY + y + glow.height;
      
      // 更新线条位置
      glow.mesh.geometry.attributes.position.needsUpdate = true;
      
      // 设置线条可见性和颜色
      glow.mesh.material.opacity = opacity;
      
      if (shouldShow) {
        // 根据方向设置不同颜色
        if (direction > 0) { // 向上
          glow.mesh.material.color.setHSL(0.53, 0.7, 0.6); // 偏青色
        } else { // 向下
          glow.mesh.material.color.setHSL(0.63, 0.6, 0.5); // 偏蓝紫色
        }
      }
    } else if (glow.type === 'disk') {
      // 光盘效果
      // 脉冲不透明度 - 电梯移动时更明显
      const basePulse = isActive ? 0.15 : 0.08;
      const pulseAmplitude = isActive ? 0.07 : 0.03;
      const diskPulse = basePulse + pulseAmplitude * Math.sin(glowTime * 1.2);
      glow.mesh.material.opacity = diskPulse;
      
      // 根据电梯方向调整旋转
      if (isActive) {
        // 电梯运动时旋转更快，且方向与电梯一致
        glow.mesh.rotation.z += 0.01 * direction;
      } else {
        // 静止时缓慢旋转
        glow.mesh.rotation.z += 0.002;
      }
      
      // 根据电梯方向变化颜色
      if (isActive) {
        if (direction > 0) { // 向上
          glow.mesh.material.color.setHSL(0.53, 0.7, 0.45); // 偏青色
        } else { // 向下
          glow.mesh.material.color.setHSL(0.63, 0.6, 0.4); // 偏蓝紫色
        }
      } else {
        // 静止时使用主题色
        glow.mesh.material.color.set(0x3a5b7c);
      }
    } else if (glow.type === 'pulse') {
      // 脉冲波效果
      glow.pulseTime += 0.03;
      
      // 电梯移动时脉冲更快更强
      const pulseSpeed = isActive ? 0.06 : 0.03;
      const maxScale = isActive ? 8 : 5;
      
      glow.pulseTime += pulseSpeed;
      
      // 脉冲动画
      if (glow.pulseTime >= Math.PI) {
        glow.pulseTime = 0;
        
        // 重置脉冲大小
        glow.mesh.scale.set(0.1, 0.1, 0.1);
        glow.mesh.material.opacity = 0.8;
      } else {
        // 脉冲扩大并淡出
        const pulseProgress = glow.pulseTime / Math.PI;
        const pulseScale = pulseProgress * maxScale;
        glow.mesh.scale.set(pulseScale, pulseScale, pulseScale);
        glow.mesh.material.opacity = 0.8 * (1 - pulseProgress);
        
        // 根据电梯方向变化颜色
        if (isActive) {
          if (direction > 0) { // 向上
            glow.mesh.material.color.setHSL(0.53, 0.7, 0.6); // 偏青色
          } else { // 向下
            glow.mesh.material.color.setHSL(0.63, 0.6, 0.5); // 偏蓝紫色
          }
        } else {
          // 静止时使用主题色
          glow.mesh.material.color.set(0x7fb2ff);
        }
      }
    }
  });
};

// 平滑过渡函数 (缓动函数)
const smoothstep = (min, max, value) => {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
};

// 处理窗口大小变化
const handleResize = () => {
  if (!elevatorContainer.value) return;
  
  const width = elevatorContainer.value.clientWidth;
  const height = elevatorContainer.value.clientHeight;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

// 更新场景
const updateScene = () => {
  // 更新电梯箱位置
  if (elevatorCabin) {
    // 平滑过渡到新位置 (直接使用计算好的位置)
    const targetY = elevatorPosition.value;
    elevatorCabin.position.y += (targetY - elevatorCabin.position.y) * 0.05;
    
    // 根据相机模式更新相机位置
    if (cameraMode.value === 'follow') {
      // 更新相机位置，使其平视跟随电梯箱
      // 计算相机目标高度，与电梯保持同一高度
      const cameraTargetY = elevatorCabin.position.y; // 相机与电梯在同一高度
      
      // 平滑过渡相机位置
      camera.position.y += (cameraTargetY - camera.position.y) * 0.05;
      
      // 更新相机看向的目标点，始终看向电梯中心
      controls.target.set(0, elevatorCabin.position.y, 0);
      
      // 禁用自动旋转
      controls.autoRotate = false;
    } else {
      // 360展示模式
      // 启用自动旋转
      controls.autoRotate = true;
      
      // 固定看向电梯中部
      controls.target.set(0, 15, 0);
    }
  }

  // 更新电梯门状态
  if (elevatorDoorLeft && elevatorDoorRight) {
    const doorOpenAmount = doorOpen.value ? 1.4 : 0;
    
    // 平滑过渡到门的开/关状态
    const leftTargetX = -(CABIN_WIDTH / 4) - doorOpenAmount + 0.05;
    const rightTargetX = (CABIN_WIDTH / 4) + doorOpenAmount - 0.05;
    
    elevatorDoorLeft.position.x += (leftTargetX - elevatorDoorLeft.position.x) * 0.1;
    elevatorDoorRight.position.x += (rightTargetX - elevatorDoorRight.position.x) * 0.1;
  }

  // 更新楼层指示灯
  floorLights.forEach((light, index) => {
    const isCurrentFloor = index + 1 === props.animationData.currentFloor;
    const isTargetFloor = index + 1 === props.animationData.targetFloor;
    
    let color = 0x888888; // 默认更亮的灰色
    let emissiveColor = 0x444444;
    let emissiveIntensity = 0.5;
    
    if (isCurrentFloor) {
      color = 0x4caf50; // 绿色表示当前楼层
      emissiveColor = 0x2e7d32;
      emissiveIntensity = 1.0;
    } else if (isTargetFloor) {
      color = 0xff9800; // 橙色表示目标楼层
      emissiveColor = 0xe65100;
      emissiveIntensity = 0.8;
    }
    
    if (light && light.material) {
      light.material.color.set(color);
      light.material.emissive.set(emissiveColor);
      light.material.emissiveIntensity = emissiveIntensity;
    }
  });

  // 更新蓝色光晕效果
  updateBlueGlowEffects();
  
  // 控制器更新
  controls.update();
};

// 动画循环
const animate = () => {
  updateScene();

  if (cabinStatusLight) {
    let color = 0x6c7086; // 默认灰色 (未连接)
    let intensity = 1.0;
    if(props.animationData) {
        switch (elevatorStatus.value) {
            case '运行中': color = 0x00bfff; intensity = 2.0; break;
            case '故障': color = Math.floor(performance.now() / 500) % 2 === 0 ? 0xff0000 : 0x550000; intensity = 2.0; break;
            case '维修中': color = 0xffa500; intensity = 1.5; break;
            case '停止': color = 0xffffff; break;
        }
    }
    cabinStatusLight.material.color.setHex(color);
    cabinStatusLight.material.emissive.setHex(color);
    cabinStatusLight.material.emissiveIntensity = intensity;
  }
  
  renderer.render(scene, camera);
  frameId = requestAnimationFrame(animate);
};

// 生命周期挂载
onMounted(() => {
  // 延迟初始化以确保DOM已经完全渲染
  setTimeout(() => {
    console.log('开始初始化 Three.js');
    if (elevatorContainer.value) {
      console.log('电梯容器已找到', elevatorContainer.value.clientWidth, elevatorContainer.value.clientHeight);
      initThreeJS();
    } else {
      console.error('电梯容器元素未找到');
    }
  }, 500);
});

// 生命周期卸载
onBeforeUnmount(() => {
  if (frameId !== null) {
    cancelAnimationFrame(frameId);
  }
  
  if (renderer) {
    renderer.dispose();
  }
  
  if (controls) {
    controls.dispose();
  }
  
  window.removeEventListener('resize', handleResize);
  
  // 清除DOM中的Canvas
  if (elevatorContainer.value) {
    const canvas = elevatorContainer.value.querySelector('canvas');
    if (canvas) {
      elevatorContainer.value.removeChild(canvas);
    }
  }
});
</script>

<template>
  <div class="elevator-visualizer">
    <div class="elevator-3d-container" ref="elevatorContainer">
      <div v-if="!animationData" class="waiting-text-overlay">
        <p>等待后端数据...</p>
      </div>
    </div>
    <!-- 系统快捷方式 -->
    <div class="system-shortcuts">
      <router-link v-for="system in systemShortcuts" :key="system.name" :to="system.route" class="system-shortcut" :class="{ 'system-error': system.error }">
        <img :src="system.icon" :alt="system.name" class="system-icon">
        <span>{{ system.name }}</span>
      </router-link>
    </div>
    <button class="camera-toggle-btn" @click="toggleCameraMode">
      {{ cameraMode === 'follow' ? '跟随视角' : '360°自由视角' }}
    </button>
  </div>
</template>

<style scoped>
.elevator-visualizer {
  height: 100%;
  width: 100%;
  position: relative;
}

.elevator-3d-container {
  width: 100%;
  height: 100%;
  min-height: 500px;
  position: relative;
  background: transparent;
}

.system-shortcuts {
  position: absolute;
  top: 20px;
  left: 0;
  display: flex;
  flex-direction: column;
  gap: 15px;
  z-index: 10;
  width: 120px;
}

.system-shortcut {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: transparent;
  padding: 5px;
  cursor: pointer;
  transition: transform 0.2s ease;
  color: #a7d5ff; /* 字体颜色 */
  text-decoration: none; /* 去掉下划线 */
  font-size: 14px;
}

.system-shortcut .system-icon {
  width: 65px; /* 调整图标大小，从48px改为65px */
  height: 65px;
  margin-bottom: 5px;
  transition: all 0.2s ease-in-out;
}

.system-shortcut:hover .system-icon {
  filter: drop-shadow(0 0 10px #3399ff);
  transform: scale(1.1);
}

.system-shortcut:hover {
  transform: translateY(-3px);
  background: transparent;
  box-shadow: none;
}

.system-shortcut.system-error {
  border-color: transparent;
  background-color: transparent;
}

.shortcut-icon {
  position: relative;
  width: 80px;
  height: 80px;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.shortcut-icon::before {
  display: none;
}

.status-dot {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.7);
  z-index: 3;
  transition: all 0.3s ease;
}

.status-normal {
  background-color: #2ecc71;
}

.status-warning {
  background-color: #f39c12;
  animation: pulse-warning 1.5s infinite;
}

.status-error {
  background-color: #ff3333;
  animation: pulse-error 1s infinite;
}

@keyframes pulse-warning {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

@keyframes pulse-error {
  0% { transform: scale(1); }
  50% { transform: scale(1.4); box-shadow: 0 0 8px 3px rgba(255, 51, 51, 0.7); }
  100% { transform: scale(1); }
}

.shortcut-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.shortcut-name {
  font-size: 0.9rem;
  color: #4dabf5;
  font-weight: 600;
}

.camera-toggle-btn {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 150, 255, 0.3);
  color: #fff;
  border: 1px solid rgba(0, 200, 255, 0.5);
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);
  font-family: 'Orbitron', sans-serif;
}

.camera-toggle-btn:hover {
  background: rgba(0, 150, 255, 0.5);
}

.custom-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.system-error .custom-icon {
  filter: none;
}

.custom-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

@keyframes gentle-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.waiting-text-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #cdd6f4;
  background-color: rgba(10, 25, 47, 0.7);
  padding: 10px 20px;
  border-radius: 8px;
  z-index: 5;
  pointer-events: none; /* 允许点击穿透 */
}
</style>