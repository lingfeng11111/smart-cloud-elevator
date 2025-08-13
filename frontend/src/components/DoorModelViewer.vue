<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const props = defineProps({
  autoRotate: {
    type: Boolean,
    default: false
  },
  doorStatus: {
    type: String,
    default: 'closed' // 'opening', 'open', 'closing', 'closed'
  },
  openingTime: {
    type: Number,
    default: 3.0 // 开门时间（秒）
  },
  contactResistance: {
    type: Number,
    default: 0.3 // 触点电阻
  },
  motorCurrent: {
    type: Number,
    default: 2.4 // 门机电流
  }
});

const containerRef = ref(null);
let scene, camera, renderer, controls;
let doorSystem = {
  leftDoor: null,
  rightDoor: null,
  doorFrame: null,
  motorAssembly: null,
  safetyDevices: null,
  guides: null,
  sensors: null
};

// 门的状态和动画
let doorAnimation = {
  isAnimating: false,
  currentPosition: 0, // 0=关闭, 1=完全打开
  targetPosition: 0,
  speed: 0.02,
  maxOpenWidth: 1.2
};

// 碰撞检测
let collisionBoxes = [];

// 初始化Three.js场景
const initThreeJS = () => {
  // 创建场景
  scene = new THREE.Scene();
  scene.background = null; // 移除背景色，使其透明

  // 创建相机
  camera = new THREE.PerspectiveCamera(
    45, 
    containerRef.value.clientWidth / containerRef.value.clientHeight,
    0.1,
    1000
  );
  // 调整相机位置以更好地展示狭长门板 - 放大并向下移动
  camera.position.set(0, -0.2, 4); 
  camera.lookAt(0, -0.2, 0);

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true,
    shadowMap: {
      enabled: true,
      type: THREE.PCFSoftShadowMap
    }
  });
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  containerRef.value.appendChild(renderer.domElement);

  // 添加轨道控制器
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI * 0.8;
  controls.minDistance = 3;
  controls.maxDistance = 12;

  // 创建高级照明系统
  setupLighting();
  
  // 创建门系统模型
  createDoorSystem();
  
  // 设置碰撞检测
  setupCollisionDetection();
  
  // 启动动画循环
  startAnimation();
};

// 设置高级照明系统
const setupLighting = () => {
  // 增强环境光亮度
  const ambientLight = new THREE.AmbientLight(0x606060, 0.8);
  scene.add(ambientLight);

  // 主光源 - 模拟天花板照明，增强亮度
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
  mainLight.position.set(0, 10, 5);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.camera.near = 0.5;
  mainLight.shadow.camera.far = 50;
  mainLight.shadow.camera.left = -10;
  mainLight.shadow.camera.right = 10;
  mainLight.shadow.camera.top = 10;
  mainLight.shadow.camera.bottom = -10;
  scene.add(mainLight);

  // 侧光 - 增强立体感和亮度
  const sideLight = new THREE.DirectionalLight(0x4a90e2, 1.0);
  sideLight.position.set(-5, 5, 0);
  scene.add(sideLight);

  // 背光 - 轮廓光，增强亮度
  const backLight = new THREE.DirectionalLight(0x7b68ee, 0.8);
  backLight.position.set(0, 5, -5);
  scene.add(backLight);

  // 前方补光 - 确保门板正面充分照明
  const frontLight = new THREE.DirectionalLight(0xffffff, 1.2);
  frontLight.position.set(0, 3, 8);
  scene.add(frontLight);

  // 点光源 - 模拟门机指示灯
  const indicatorLight = new THREE.PointLight(0x00ff00, 1.2, 10);
  indicatorLight.position.set(0, 2.5, 0.5);
  scene.add(indicatorLight);
};

// 创建门系统模型
const createDoorSystem = () => {
  console.log('Initializing door model with props:', props);
  
  // 创建门框
  createDoorFrame();
  
  // 创建左右门板
  createDoorPanels();
  
  // 创建门机组件
  createMotorAssembly();
  
  // 创建导轨系统
  createGuideSystem();
  
  // 创建安全装置
  createSafetyDevices();
  
  // 创建传感器
  createSensors();
  
  // 设置初始状态
  doorAnimation.currentPosition = 0;
  
  // 根据初始状态设置门的位置
  if (props.doorStatus === 'open') {
    doorAnimation.targetPosition = 1.0;
    doorAnimation.currentPosition = 1.0;
  } else if (props.doorStatus === 'closed') {
    doorAnimation.targetPosition = 0.0;
    doorAnimation.currentPosition = 0.0;
  }
  
  updateDoorAnimation();
  
  console.log('Door model initialized successfully');
};

// 模拟数据处理
const processSimulationData = () => {
  // 模拟门状态变化
  if (props.systemParams) {
    const { temperature, vibration } = props.systemParams;
    
    // 根据温度调整材质颜色
    if (temperature > 30 && doorSystem.leftDoor) {
      const heatColor = 0x3a75c1; // 稍微偏暖的蓝色
      doorSystem.leftDoor.children[0].material.color.setHex(heatColor);
      doorSystem.rightDoor.children[0].material.color.setHex(heatColor);
    }
    
    // 根据振动调整传感器效果
    if (vibration > 0.5 && doorSystem.sensors) {
      doorSystem.sensors.forEach(sensor => {
        sensor.material.emissiveIntensity = 0.6 + vibration * 0.3;
      });
    }
  }
};

// 创建门框 - 适配狭长门板
const createDoorFrame = () => {
  const frameGroup = new THREE.Group();
  
  // 门框材质 - 蓝色主题
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a4d7a,  // 深蓝色框架
    metalness: 0.9,
    roughness: 0.1,
    emissive: 0x0a1f33,
    emissiveIntensity: 0.2
  });
  
  // 适配新门板尺寸的框架
  const frameWidth = 1.8;
  const frameHeight = 2.8;
  
  // 顶部横梁
  const topBeamGeometry = new THREE.BoxGeometry(frameWidth, 0.1, 0.15);
  const topBeam = new THREE.Mesh(topBeamGeometry, frameMaterial);
  topBeam.position.set(0, frameHeight - 0.05, 0);
  topBeam.castShadow = true;
  topBeam.receiveShadow = true;
  frameGroup.add(topBeam);
  
  // 左侧立柱
  const leftPillarGeometry = new THREE.BoxGeometry(0.08, frameHeight, 0.15);
  const leftPillar = new THREE.Mesh(leftPillarGeometry, frameMaterial);
  leftPillar.position.set(-frameWidth/2 + 0.04, frameHeight/2, 0);
  leftPillar.castShadow = true;
  leftPillar.receiveShadow = true;
  frameGroup.add(leftPillar);
  
  // 右侧立柱
  const rightPillar = new THREE.Mesh(leftPillarGeometry, frameMaterial);
  rightPillar.position.set(frameWidth/2 - 0.04, frameHeight/2, 0);
  rightPillar.castShadow = true;
  rightPillar.receiveShadow = true;
  frameGroup.add(rightPillar);
  
  // 底部导轨
  const bottomRailGeometry = new THREE.BoxGeometry(frameWidth, 0.08, 0.15);
  const bottomRail = new THREE.Mesh(bottomRailGeometry, frameMaterial);
  bottomRail.position.set(0, 0.04, 0);
  bottomRail.castShadow = true;
  bottomRail.receiveShadow = true;
  frameGroup.add(bottomRail);
  
  // 蓝色装饰条纹
  const stripeMaterial = new THREE.MeshStandardMaterial({
    color: 0x4080bf,
    metalness: 0.8,
    roughness: 0.2,
    emissive: 0x2060a0,
    emissiveIntensity: 0.3
  });
  
  const stripeGeometry = new THREE.BoxGeometry(frameWidth - 0.2, 0.02, 0.01);
  for (let i = 0; i < 3; i++) {
    const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
    stripe.position.set(0, frameHeight - 0.1 - i * 0.05, 0.08);
    frameGroup.add(stripe);
  }
  
  // 将整个门框向下移动
  frameGroup.position.y = -1.2;
  
  doorSystem.doorFrame = frameGroup;
  scene.add(frameGroup);
};

// 创建门板 - 与电梯可视化风格一致
const createDoorPanels = () => {
  // 门板材质 - 采用电梯可视化的蓝色主题
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a65b1,  // 与电梯可视化一致的蓝色
    metalness: 0.9,
    roughness: 0.1,
    emissive: 0x0a2551,
    emissiveIntensity: 0.3
  });
  
  // 更狭长的门板尺寸
  const doorWidth = 0.8;  // 减小宽度使其更狭长
  const doorHeight = 2.6; // 增加高度
  const doorThickness = 0.1;
  
  // 左门板 - 调整初始位置，确保完全闭合
  const leftDoorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, doorThickness);
  const leftDoor = new THREE.Mesh(leftDoorGeometry, doorMaterial);
  leftDoor.position.set(-doorWidth/4, doorHeight/2, 0);  // 左门板中心在-0.2
  leftDoor.castShadow = true;
  leftDoor.receiveShadow = true;
  
  // 右门板 - 调整初始位置，确保完全闭合
  const rightDoor = new THREE.Mesh(leftDoorGeometry, doorMaterial);
  rightDoor.position.set(doorWidth/4, doorHeight/2, 0);   // 右门板中心在0.2
  rightDoor.castShadow = true;
  rightDoor.receiveShadow = true;
  
  // 简化的装饰条 - 与电梯风格一致
  const stripMaterial = new THREE.MeshStandardMaterial({
    color: 0x4080bf,  // 更亮的蓝色装饰
    metalness: 0.8,
    roughness: 0.2,
    emissive: 0x112244,
    emissiveIntensity: 0.2
  });
  
  // 左门装饰条 - 调整位置与门板一致
  const stripGeometry = new THREE.BoxGeometry(doorWidth - 0.1, 0.05, 0.02);
  const leftStrip1 = new THREE.Mesh(stripGeometry, stripMaterial);
  leftStrip1.position.set(-doorWidth/4, doorHeight/2 + 0.3, doorThickness/2 + 0.01);
  
  const leftStrip2 = new THREE.Mesh(stripGeometry, stripMaterial);
  leftStrip2.position.set(-doorWidth/4, doorHeight/2 - 0.3, doorThickness/2 + 0.01);
  
  // 右门装饰条 - 调整位置与门板一致
  const rightStrip1 = new THREE.Mesh(stripGeometry, stripMaterial);
  rightStrip1.position.set(doorWidth/4, doorHeight/2 + 0.3, doorThickness/2 + 0.01);
  
  const rightStrip2 = new THREE.Mesh(stripGeometry, stripMaterial);
  rightStrip2.position.set(doorWidth/4, doorHeight/2 - 0.3, doorThickness/2 + 0.01);
  
  // 状态指示灯 - 简化版
  const indicatorMaterial = new THREE.MeshStandardMaterial({
    color: 0x5c92d2,
    emissive: 0x5c92d2,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.8
  });
  
  const indicatorGeometry = new THREE.SphereGeometry(0.03, 16, 16);
  const leftIndicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
  leftIndicator.position.set(-doorWidth/4, doorHeight - 0.2, doorThickness/2 + 0.02);
  
  const rightIndicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
  rightIndicator.position.set(doorWidth/4, doorHeight - 0.2, doorThickness/2 + 0.02);
  
  // 组装门板
  const leftDoorGroup = new THREE.Group();
  leftDoorGroup.add(leftDoor);
  leftDoorGroup.add(leftStrip1);
  leftDoorGroup.add(leftStrip2);
  leftDoorGroup.add(leftIndicator);
  
  const rightDoorGroup = new THREE.Group();
  rightDoorGroup.add(rightDoor);
  rightDoorGroup.add(rightStrip1);
  rightDoorGroup.add(rightStrip2);
  rightDoorGroup.add(rightIndicator);
  
  // 将门板组向下移动与门框一致
  leftDoorGroup.position.y = -1.2;
  rightDoorGroup.position.y = -1.2;
  
  doorSystem.leftDoor = leftDoorGroup;
  doorSystem.rightDoor = rightDoorGroup;
  doorSystem.leftIndicator = leftIndicator;
  doorSystem.rightIndicator = rightIndicator;
  
  scene.add(leftDoorGroup);
  scene.add(rightDoorGroup);
};

// 创建门机组件
const createMotorAssembly = () => {
  const motorGroup = new THREE.Group();
  
  // 门机外壳
  const motorHousingGeometry = new THREE.BoxGeometry(0.6, 0.3, 0.4);
  const motorMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x2c3e50,
    metalness: 0.8,
    roughness: 0.2
  });
  
  const motorHousing = new THREE.Mesh(motorHousingGeometry, motorMaterial);
  motorHousing.position.set(0, 2.6, -0.3);
  motorHousing.castShadow = true;
  motorGroup.add(motorHousing);
  
  // 传动轮
  const pulleyGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16);
  const pulleyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x34495e,
    metalness: 0.9,
    roughness: 0.1
  });
  
  const leftPulley = new THREE.Mesh(pulleyGeometry, pulleyMaterial);
  leftPulley.position.set(-0.2, 2.6, -0.1);
  leftPulley.rotation.x = Math.PI / 2;
  
  const rightPulley = new THREE.Mesh(pulleyGeometry, pulleyMaterial);
  rightPulley.position.set(0.2, 2.6, -0.1);
  rightPulley.rotation.x = Math.PI / 2;
  
  motorGroup.add(leftPulley);
  motorGroup.add(rightPulley);
  
  // 传动带
  const beltGeometry = new THREE.BoxGeometry(0.4, 0.01, 0.02);
  const beltMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
  const belt = new THREE.Mesh(beltGeometry, beltMaterial);
  belt.position.set(0, 2.6, -0.1);
  motorGroup.add(belt);
  
  // 将门机组件向下移动与门框一致
  motorGroup.position.y = -1.2;
  
  doorSystem.motorAssembly = motorGroup;
  scene.add(motorGroup);
};

// 创建导轨系统 - 适配狭长门板
const createGuideSystem = () => {
  const guideGroup = new THREE.Group();
  
  const guideMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a65b1,  // 与门板一致的蓝色
    metalness: 0.9,
    roughness: 0.1,
    emissive: 0x0a2551,
    emissiveIntensity: 0.2
  });
  
  // 适配新门板尺寸的导轨
  const guideWidth = 1.7;
  
  // 上导轨
  const topGuideGeometry = new THREE.BoxGeometry(guideWidth, 0.04, 0.04);
  const topGuide = new THREE.Mesh(topGuideGeometry, guideMaterial);
  topGuide.position.set(0, 2.65, 0);
  topGuide.castShadow = true;
  topGuide.receiveShadow = true;
  guideGroup.add(topGuide);
  
  // 下导轨
  const bottomGuide = new THREE.Mesh(topGuideGeometry, guideMaterial);
  bottomGuide.position.set(0, 0.08, 0);
  bottomGuide.castShadow = true;
  bottomGuide.receiveShadow = true;
  guideGroup.add(bottomGuide);
  
  // 导轨滑块
  const sliderMaterial = new THREE.MeshStandardMaterial({
    color: 0x4080bf,
    metalness: 0.8,
    roughness: 0.2
  });
  
  const sliderGeometry = new THREE.BoxGeometry(0.06, 0.03, 0.03);
  
  // 左门滑块
  const leftSlider = new THREE.Mesh(sliderGeometry, sliderMaterial);
  leftSlider.position.set(-0.4, 2.65, 0);
  guideGroup.add(leftSlider);
  
  // 右门滑块
  const rightSlider = new THREE.Mesh(sliderGeometry, sliderMaterial);
  rightSlider.position.set(0.4, 2.65, 0);
  guideGroup.add(rightSlider);
  
  // 将导轨系统向下移动与门框一致
  guideGroup.position.y = -1.2;
  
  doorSystem.guides = guideGroup;
  scene.add(guideGroup);
};

// 创建安全装置 - 简化版
const createSafetyDevices = () => {
  const safetyGroup = new THREE.Group();
  
  // 简化的安全传感器材质
  const sensorMaterial = new THREE.MeshStandardMaterial({
    color: 0x5c92d2,
    emissive: 0x5c92d2,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.8
  });
  
  const sensorGeometry = new THREE.SphereGeometry(0.015, 12, 12);
  
  // 适配新门板尺寸的传感器位置
  const sensorCount = 6;
  const startY = 0.4;
  const endY = 2.2;
  const stepY = (endY - startY) / (sensorCount - 1);
  
  // 左侧传感器
  for (let i = 0; i < sensorCount; i++) {
    const sensor = new THREE.Mesh(sensorGeometry, sensorMaterial);
    const y = startY + (i * stepY);
    sensor.position.set(-0.85, y, 0.08);
    safetyGroup.add(sensor);
  }
  
  // 右侧传感器
  for (let i = 0; i < sensorCount; i++) {
    const sensor = new THREE.Mesh(sensorGeometry, sensorMaterial);
    const y = startY + (i * stepY);
    sensor.position.set(0.85, y, 0.08);
    safetyGroup.add(sensor);
  }
  
  // 顶部传感器条
  const topSensorMaterial = new THREE.MeshStandardMaterial({
    color: 0x4080bf,
    emissive: 0x2060a0,
    emissiveIntensity: 0.3
  });
  
  const topSensorGeometry = new THREE.BoxGeometry(1.6, 0.02, 0.01);
  const topSensor = new THREE.Mesh(topSensorGeometry, topSensorMaterial);
  topSensor.position.set(0, 2.5, 0.08);
  safetyGroup.add(topSensor);
  
  // 将安全装置向下移动与门框一致
  safetyGroup.position.y = -1.2;
  
  doorSystem.safetyDevices = safetyGroup;
  scene.add(safetyGroup);
};

// 创建传感器 - 简化版
const createSensors = () => {
  // 传感器已在安全装置中创建，这里只需要设置引用
  if (doorSystem.safetyDevices) {
    doorSystem.sensors = doorSystem.safetyDevices.children.filter(child => 
      child.geometry instanceof THREE.SphereGeometry
    );
  }
};

// 设置碰撞检测
const setupCollisionDetection = () => {
  // 为门板创建碰撞盒
  const leftDoorBox = new THREE.Box3();
  const rightDoorBox = new THREE.Box3();
  
  collisionBoxes = [leftDoorBox, rightDoorBox];
};

// 更新碰撞检测
const updateCollisionDetection = () => {
  if (doorSystem.leftDoor && doorSystem.rightDoor) {
    collisionBoxes[0].setFromObject(doorSystem.leftDoor);
    collisionBoxes[1].setFromObject(doorSystem.rightDoor);
    
    // 检查门板是否相撞
    if (collisionBoxes[0].intersectsBox(collisionBoxes[1])) {
      // 防止穿模，停止动画
      doorAnimation.isAnimating = false;
      console.warn('门板碰撞检测：防止穿模');
    }
  }
};

// 门动画控制 - 适配狭长门板，修复关闭间隙问题
const updateDoorAnimation = () => {
  if (!doorSystem.leftDoor || !doorSystem.rightDoor) return;
  
  // 根据门状态设置目标位置
  switch (props.doorStatus) {
    case 'opening':
    case 'open':
      doorAnimation.targetPosition = 1;
      doorAnimation.isAnimating = true;
      break;
    case 'closing':
    case 'closed':
      doorAnimation.targetPosition = 0;
      doorAnimation.isAnimating = true;
      break;
  }
  
  // 动画插值
  if (doorAnimation.isAnimating) {
    const diff = doorAnimation.targetPosition - doorAnimation.currentPosition;
    if (Math.abs(diff) > 0.01) {
      doorAnimation.currentPosition += diff * doorAnimation.speed;
      
      // 更新门板位置 - 确保完全闭合无间隙
      const openOffset = doorAnimation.currentPosition * doorAnimation.maxOpenWidth;
      
      // 门板宽度0.8，关闭时两个门板的内侧边缘应该接触
      const doorWidth = 0.8;
      // 关闭时：左门板中心在-0.2，右门板中心在0.2，这样两个门板的内侧边缘正好在中心线接触
      const closedLeftX = -doorWidth/5;   // 左门板中心位置：-0.2
      const closedRightX = doorWidth/5;   // 右门板中心位置：0.2
      
      // 开门时向外移动
      doorSystem.leftDoor.position.x = closedLeftX - openOffset;
      doorSystem.rightDoor.position.x = closedRightX + openOffset;
      
      // 更新碰撞检测
      updateCollisionDetection();
    } else {
      doorAnimation.currentPosition = doorAnimation.targetPosition;
      doorAnimation.isAnimating = false;
    }
  }
};

// 监听属性变化 - 增强数据响应
watch(() => props.doorStatus, (newStatus) => {
  console.log('Door status changed:', newStatus);
  if (newStatus === 'opening') {
    doorAnimation.targetPosition = 1.0;
    doorAnimation.isAnimating = true;
  } else if (newStatus === 'closing') {
    doorAnimation.targetPosition = 0.0;
    doorAnimation.isAnimating = true;
  } else if (newStatus === 'open') {
    doorAnimation.targetPosition = 1.0;
    doorAnimation.currentPosition = 1.0;
    doorAnimation.isAnimating = false;
  } else if (newStatus === 'closed') {
    doorAnimation.targetPosition = 0.0;
    doorAnimation.currentPosition = 0.0;
    doorAnimation.isAnimating = false;
  }
  updateDoorAnimation();
});

watch(() => props.openingTime, (newTime) => {
  console.log('Opening time changed:', newTime);
  doorAnimation.speed = 0.02 * (3.0 / newTime); // 根据开门时间调整速度
});

// 监听系统参数变化
watch(() => props.contactResistance, (newValue) => {
  console.log('Contact resistance changed:', newValue);
  // 可以根据接触电阻调整门的运行效果
});

watch(() => props.motorCurrent, (newValue) => {
  console.log('Motor current changed:', newValue);
  // 可以根据电机电流调整门的运行速度或效果
});

// 动画循环
const animate = () => {
  requestAnimationFrame(animate);
  controls.update();
  
  // 更新门动画
  updateDoorAnimation();
  
  // 更新传感器闪烁效果
  updateSensorEffects();
  
  // 更新LED指示灯效果
  updateLEDEffects();
  
  // 处理模拟数据
  processSimulationData();
  
  renderer.render(scene, camera);
};

// 在initThreeJS函数中启动动画
const startAnimation = () => {
  animate();
};

// 更新传感器效果
const updateSensorEffects = () => {
  if (doorSystem.sensors && Array.isArray(doorSystem.sensors)) {
    const time = Date.now() * 0.005;
    doorSystem.sensors.forEach((sensor, index) => {
      const intensity = 0.4 + 0.3 * Math.sin(time + index * 0.5);
      sensor.material.emissiveIntensity = intensity;
    });
  }
};

// 更新LED效果 - 匹配电梯可视化蓝色主题
const updateLEDEffects = () => {
  if (doorSystem.leftIndicator && doorSystem.rightIndicator) {
    const time = Date.now() * 0.003;
    const intensity = 0.5 + 0.3 * Math.sin(time);
    
    // 根据门状态改变LED颜色 - 蓝色主题
    let color = 0x5c92d2; // 默认蓝色
    if (props.doorStatus === 'opening' || props.doorStatus === 'closing') {
      color = 0x4080bf; // 亮蓝色表示运动中
    } else if (props.doorStatus === 'open') {
      color = 0x2a65b1; // 深蓝色表示开启
    } else {
      color = 0x1a4d7a; // 更深蓝色表示关闭
    }
    
    // 更新指示灯颜色和强度
    doorSystem.leftIndicator.material.color.setHex(color);
    doorSystem.leftIndicator.material.emissive.setHex(color);
    doorSystem.leftIndicator.material.emissiveIntensity = intensity;
    
    doorSystem.rightIndicator.material.color.setHex(color);
    doorSystem.rightIndicator.material.emissive.setHex(color);
    doorSystem.rightIndicator.material.emissiveIntensity = intensity;
  }
};

// 处理窗口大小变化
const handleResize = () => {
  if (!containerRef.value || !camera || !renderer) return;
  
  camera.aspect = containerRef.value.clientWidth / containerRef.value.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight);
};

onMounted(() => {
  console.log('DoorModelViewer mounted with props:', props);
  initThreeJS();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  console.log('DoorModelViewer unmounted');
  window.removeEventListener('resize', handleResize);
  if (renderer) {
    renderer.dispose();
  }
  if (controls) {
    controls.dispose();
  }
  // 清理场景中的所有对象
  if (scene) {
    while(scene.children.length > 0) {
      scene.remove(scene.children[0]);
    }
  }
});
</script>

<template>
  <div class="model-viewer" ref="containerRef"></div>
</template>

<style scoped>
.model-viewer {
  width: 100%;
  height: 600px;
  background: transparent;
  box-shadow: none;
}
</style>