<script setup>
import { ref, onMounted, onBeforeUnmount, watch, defineProps } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// 接收模拟数据参数
const props = defineProps({
  autoRotate: {
    type: Boolean,
    default: true
  },
  elevatorPosition: {
    type: Number,
    default: 0 // 电梯位置 (0-14层)
  },
  elevatorSpeed: {
    type: Number,
    default: 0 // 电梯速度 m/s
  },
  vibration: {
    type: Number,
    default: 0 // 振动强度 (0-1)
  },
  temperature: {
    type: Number,
    default: 25 // 温度 °C
  },
  guideShoeWear: {
    type: Number,
    default: 0 // 导靴磨损程度 (0-1)
  },
  railAlignment: {
    type: Number,
    default: 1 // 导轨对齐度 (0-1)
  }
});

const containerRef = ref(null);
let scene, camera, renderer, controls;
let guidanceSystem = {
  rails: [],
  guideShoes: [],
  railBrackets: [],
  cabin: null,
  counterweight: null,
  safetyDevices: [],
  sensors: []
};
let animationState = {
  isAnimating: false,
  currentPosition: 0,
  targetPosition: 0,
  speed: 0,
  vibrationOffset: { x: 0, y: 0, z: 0 }
};
let glowEffects = [];
let glowTime = 0;

// 导向系统常量
const SHAFT_HEIGHT = 45; // 井道高度
const FLOOR_HEIGHT = 3; // 楼层高度
const FLOOR_COUNT = 15; // 楼层数
const CABIN_WIDTH = 3; // 轿厢宽度
const CABIN_HEIGHT = 2.8; // 轿厢高度
const CABIN_DEPTH = 3; // 轿厢深度
const RAIL_HEIGHT = SHAFT_HEIGHT; // 导轨高度
const RAIL_WIDTH = 0.15; // 导轨宽度
const RAIL_DEPTH = 0.1; // 导轨厚度

// 初始化Three.js场景
const initThreeJS = () => {
  // 创建场景
  scene = new THREE.Scene();
  scene.background = null; // 透明背景
  scene.fog = new THREE.Fog(0x000000, 20, 100); // 添加雾效增强科技感

  // 创建相机
  camera = new THREE.PerspectiveCamera(
    45,
    containerRef.value.clientWidth / containerRef.value.clientHeight,
    0.1,
    1000
  );
  camera.position.set(8, 15, 12); // 更好的观察角度
  camera.lookAt(0, 10, 0);

  // 创建高质量渲染器
  renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMappingExposure = 1.2;
  containerRef.value.appendChild(renderer.domElement);

  // 添加轨道控制器
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = props.autoRotate;
  controls.autoRotateSpeed = 0.5;
  controls.minDistance = 5;
  controls.maxDistance = 30;
  controls.maxPolarAngle = Math.PI * 0.9;

  // 设置高级照明系统
  setupAdvancedLighting();
  
  // 创建导向系统组件
  createGuidanceSystem();
  
  // 创建科技感光效
  createTechGlowEffects();
  
  // 启动动画循环
  animate();
};

// 设置高级照明系统
const setupAdvancedLighting = () => {
  // 环境光 - 提供基础照明
  const ambientLight = new THREE.AmbientLight(0x404080, 0.4);
  scene.add(ambientLight);

  // 主方向光 - 模拟天花板照明
  const mainLight = new THREE.DirectionalLight(0x3498db, 1.2);
  mainLight.position.set(10, 20, 10);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.camera.near = 0.1;
  mainLight.shadow.camera.far = 50;
  mainLight.shadow.camera.left = -20;
  mainLight.shadow.camera.right = 20;
  mainLight.shadow.camera.top = 20;
  mainLight.shadow.camera.bottom = -20;
  scene.add(mainLight);

  // 侧光 - 增强立体感
  const sideLight = new THREE.DirectionalLight(0x7fb2ff, 0.8);
  sideLight.position.set(-15, 10, 5);
  scene.add(sideLight);

  // 背光 - 轮廓光
  const backLight = new THREE.DirectionalLight(0x5c92d2, 0.6);
  backLight.position.set(0, 5, -15);
  scene.add(backLight);

  // 顶部点光源 - 科技感
  const topLight = new THREE.PointLight(0x00ffff, 50, 30);
  topLight.position.set(0, SHAFT_HEIGHT, 0);
  scene.add(topLight);

  // 底部点光源
  const bottomLight = new THREE.PointLight(0x3498db, 30, 20);
  bottomLight.position.set(0, 0, 0);
  scene.add(bottomLight);
};

// 创建导向系统
const createGuidanceSystem = () => {
  // 创建导轨系统
  createRailSystem();
  
  // 创建轿厢和导靴
  createCabinAndGuideShoes();
  
  // 创建对重和导靴
  createCounterweightAndGuideShoes();
  
  // 创建导轨支架
  createRailBrackets();
  
  // 创建安全装置
  createSafetyDevices();
  
  // 创建传感器系统
  createSensorSystem();
};

// 创建导轨系统
const createRailSystem = () => {
  // T型导轨几何体 - 更精细的T型截面
  const createTRailGeometry = () => {
    const shape = new THREE.Shape();
    
    // T型导轨截面 (更真实的尺寸)
    const headWidth = 0.16; // T型头部宽度
    const headHeight = 0.03; // T型头部厚度
    const stemWidth = 0.08; // T型杆部宽度
    const stemHeight = 0.12; // T型杆部高度
    
    // 绘制T型截面
    shape.moveTo(-headWidth/2, 0);
    shape.lineTo(headWidth/2, 0);
    shape.lineTo(headWidth/2, headHeight);
    shape.lineTo(stemWidth/2, headHeight);
    shape.lineTo(stemWidth/2, headHeight + stemHeight);
    shape.lineTo(-stemWidth/2, headHeight + stemHeight);
    shape.lineTo(-stemWidth/2, headHeight);
    shape.lineTo(-headWidth/2, headHeight);
    shape.lineTo(-headWidth/2, 0);
    
    const extrudeSettings = {
      depth: RAIL_HEIGHT,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelSegments: 3
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  };
  
  // 导轨材质 - 金属质感
  const railMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a5568,
    metalness: 0.9,
    roughness: 0.1,
    emissive: 0x1a202c,
    emissiveIntensity: 0.1
  });
  
  // 创建四根导轨 (轿厢两根，对重两根)
  const railPositions = [
    // 轿厢导轨
    { x: -2, z: 1.5, name: 'cabin_left' },
    { x: 2, z: 1.5, name: 'cabin_right' },
    // 对重导轨
    { x: -2, z: -1.5, name: 'counterweight_left' },
    { x: 2, z: -1.5, name: 'counterweight_right' }
  ];
  
  railPositions.forEach((pos, index) => {
    const railGeometry = createTRailGeometry();
    const rail = new THREE.Mesh(railGeometry, railMaterial.clone());
    
    // 旋转导轨使其垂直
    rail.rotation.x = Math.PI / 2;
    rail.position.set(pos.x, RAIL_HEIGHT / 2, pos.z);
    
    // 添加导轨对齐度影响
    if (props.railAlignment < 1) {
      const misalignment = (1 - props.railAlignment) * 0.05;
      rail.position.x += (Math.random() - 0.5) * misalignment;
      rail.rotation.z += (Math.random() - 0.5) * misalignment * 0.1;
    }
    
    rail.castShadow = true;
    rail.receiveShadow = true;
    rail.userData = { type: 'rail', name: pos.name, index };
    
    scene.add(rail);
     guidanceSystem.rails.push(rail);
   });
 };

// 创建轿厢和导靴
const createCabinAndGuideShoes = () => {
  // 创建轿厢组
  const cabinGroup = new THREE.Group();
  
  // 轿厢主体
  const cabinGeometry = new THREE.BoxGeometry(CABIN_WIDTH, CABIN_HEIGHT, CABIN_DEPTH);
  const cabinMaterial = new THREE.MeshStandardMaterial({
    color: 0x3498db,
    metalness: 0.7,
    roughness: 0.3,
    transparent: true,
    opacity: 0.8,
    emissive: 0x1a3c6c,
    emissiveIntensity: 0.2
  });
  
  const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  cabinGroup.add(cabin);
  
  // 创建导靴 - 滑动导靴和滚轮导靴
  const createGuideShoe = (type, position, rotation = 0) => {
    const shoeGroup = new THREE.Group();
    
    if (type === 'sliding') {
      // 滑动导靴 - 刚性导靴
      const shoeBodyGeometry = new THREE.BoxGeometry(0.12, 0.3, 0.08);
      const shoeMaterial = new THREE.MeshStandardMaterial({
        color: 0x2c3e50,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x1a252f,
        emissiveIntensity: 0.1
      });
      
      const shoeBody = new THREE.Mesh(shoeBodyGeometry, shoeMaterial);
      shoeGroup.add(shoeBody);
      
      // 导靴衬垫 - 根据磨损程度调整
      const padGeometry = new THREE.BoxGeometry(0.02, 0.25, 0.06);
      const padMaterial = new THREE.MeshStandardMaterial({
        color: props.guideShoeWear > 0.7 ? 0x8b4513 : 0x654321, // 磨损严重时变色
        metalness: 0.1,
        roughness: 0.9
      });
      
      const pad = new THREE.Mesh(padGeometry, padMaterial);
      pad.position.x = 0.07;
      shoeGroup.add(pad);
      
      // 弹簧系统 (弹性导靴)
      const springGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.1, 8);
      const springMaterial = new THREE.MeshStandardMaterial({
        color: 0x708090,
        metalness: 0.9,
        roughness: 0.1
      });
      
      for (let i = 0; i < 2; i++) {
        const spring = new THREE.Mesh(springGeometry, springMaterial);
        spring.position.set(-0.04, 0, (i - 0.5) * 0.04);
        spring.rotation.z = Math.PI / 2;
        shoeGroup.add(spring);
      }
      
    } else if (type === 'roller') {
      // 滚轮导靴 - 用于高速电梯
      const shoeBodyGeometry = new THREE.BoxGeometry(0.15, 0.35, 0.1);
      const shoeMaterial = new THREE.MeshStandardMaterial({
        color: 0x34495e,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x1a252f,
        emissiveIntensity: 0.1
      });
      
      const shoeBody = new THREE.Mesh(shoeBodyGeometry, shoeMaterial);
      shoeGroup.add(shoeBody);
      
      // 滚轮
      const rollerGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.08, 16);
      const rollerMaterial = new THREE.MeshStandardMaterial({
        color: 0x2c3e50,
        metalness: 0.9,
        roughness: 0.1
      });
      
      for (let i = 0; i < 3; i++) {
        const roller = new THREE.Mesh(rollerGeometry, rollerMaterial);
        roller.position.set(0.08, (i - 1) * 0.1, 0);
        roller.rotation.z = Math.PI / 2;
        shoeGroup.add(roller);
      }
    }
    
    shoeGroup.position.copy(position);
    shoeGroup.rotation.y = rotation;
    shoeGroup.userData = { type: 'guideShoe', shoeType: type };
    
    return shoeGroup;
  };
  
  // 在轿厢四角添加导靴
  const shoePositions = [
    { pos: new THREE.Vector3(-CABIN_WIDTH/2 - 0.1, CABIN_HEIGHT/2 - 0.15, CABIN_DEPTH/2 - 0.1), type: 'sliding', rot: 0 },
    { pos: new THREE.Vector3(CABIN_WIDTH/2 + 0.1, CABIN_HEIGHT/2 - 0.15, CABIN_DEPTH/2 - 0.1), type: 'sliding', rot: Math.PI },
    { pos: new THREE.Vector3(-CABIN_WIDTH/2 - 0.1, -CABIN_HEIGHT/2 + 0.15, CABIN_DEPTH/2 - 0.1), type: 'roller', rot: 0 },
    { pos: new THREE.Vector3(CABIN_WIDTH/2 + 0.1, -CABIN_HEIGHT/2 + 0.15, CABIN_DEPTH/2 - 0.1), type: 'roller', rot: Math.PI }
  ];
  
  shoePositions.forEach(({ pos, type, rot }) => {
    const shoe = createGuideShoe(type, pos, rot);
    cabinGroup.add(shoe);
    guidanceSystem.guideShoes.push(shoe);
  });
  
  // 设置轿厢初始位置
  cabinGroup.position.y = props.elevatorPosition * FLOOR_HEIGHT + CABIN_HEIGHT / 2;
  cabinGroup.userData = { type: 'cabin' };
  
  scene.add(cabinGroup);
  guidanceSystem.cabin = cabinGroup;
};

// 创建对重和导靴
const createCounterweightAndGuideShoes = () => {
  const counterweightGroup = new THREE.Group();
  
  // 对重主体
  const counterweightGeometry = new THREE.BoxGeometry(1.5, 3.5, 0.8);
  const counterweightMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a6c7d,
    metalness: 0.8,
    roughness: 0.3,
    emissive: 0x2c3e50,
    emissiveIntensity: 0.1
  });
  
  const counterweight = new THREE.Mesh(counterweightGeometry, counterweightMaterial);
  counterweight.castShadow = true;
  counterweight.receiveShadow = true;
  counterweightGroup.add(counterweight);
  
  // 对重导靴 (通常使用滚轮导靴)
  const createCounterweightGuideShoe = (position, rotation = 0) => {
    const shoeGroup = new THREE.Group();
    
    const shoeBodyGeometry = new THREE.BoxGeometry(0.12, 0.25, 0.08);
    const shoeMaterial = new THREE.MeshStandardMaterial({
      color: 0x34495e,
      metalness: 0.8,
      roughness: 0.2
    });
    
    const shoeBody = new THREE.Mesh(shoeBodyGeometry, shoeMaterial);
    shoeGroup.add(shoeBody);
    
    // 滚轮
    const rollerGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.06, 12);
    const rollerMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      metalness: 0.9,
      roughness: 0.1
    });
    
    const roller = new THREE.Mesh(rollerGeometry, rollerMaterial);
    roller.position.x = 0.06;
    roller.rotation.z = Math.PI / 2;
    shoeGroup.add(roller);
    
    shoeGroup.position.copy(position);
    shoeGroup.rotation.y = rotation;
    
    return shoeGroup;
  };
  
  // 对重导靴位置
  const counterweightShoePositions = [
    { pos: new THREE.Vector3(-0.8, 1.5, 0), rot: 0 },
    { pos: new THREE.Vector3(0.8, 1.5, 0), rot: Math.PI },
    { pos: new THREE.Vector3(-0.8, -1.5, 0), rot: 0 },
    { pos: new THREE.Vector3(0.8, -1.5, 0), rot: Math.PI }
  ];
  
  counterweightShoePositions.forEach(({ pos, rot }) => {
    const shoe = createCounterweightGuideShoe(pos, rot);
    counterweightGroup.add(shoe);
    guidanceSystem.guideShoes.push(shoe);
  });
  
  // 对重位置 (与轿厢相反运动)
  const counterweightY = (FLOOR_COUNT - props.elevatorPosition - 1) * FLOOR_HEIGHT + 2;
  counterweightGroup.position.set(0, counterweightY, -1.5);
  counterweightGroup.userData = { type: 'counterweight' };
  
  scene.add(counterweightGroup);
  guidanceSystem.counterweight = counterweightGroup;
};

// 创建导轨支架
const createRailBrackets = () => {
  const bracketSpacing = 2; // 支架间距
  const bracketCount = Math.floor(RAIL_HEIGHT / bracketSpacing);
  
  for (let i = 0; i < bracketCount; i++) {
    const y = i * bracketSpacing + 1;
    
    // 为每根导轨创建支架
    guidanceSystem.rails.forEach((rail, railIndex) => {
      const bracketGroup = new THREE.Group();
      
      // 支架主体
      const bracketGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.2);
      const bracketMaterial = new THREE.MeshStandardMaterial({
        color: 0x708090,
        metalness: 0.7,
        roughness: 0.4
      });
      
      const bracket = new THREE.Mesh(bracketGeometry, bracketMaterial);
      bracketGroup.add(bracket);
      
      // 固定螺栓
      const boltGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.05, 8);
      const boltMaterial = new THREE.MeshStandardMaterial({
        color: 0x2c3e50,
        metalness: 0.9,
        roughness: 0.1
      });
      
      for (let j = 0; j < 4; j++) {
        const bolt = new THREE.Mesh(boltGeometry, boltMaterial);
        bolt.position.set(
          (j % 2 - 0.5) * 0.2,
          0,
          (Math.floor(j / 2) - 0.5) * 0.15
        );
        bracketGroup.add(bolt);
      }
      
      bracketGroup.position.set(rail.position.x, y, rail.position.z);
      bracketGroup.userData = { type: 'railBracket', railIndex };
      
      scene.add(bracketGroup);
      guidanceSystem.railBrackets.push(bracketGroup);
    });
  }
};

// 创建安全装置
const createSafetyDevices = () => {
  // 限速器
  const speedGovernorGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
  const speedGovernorMaterial = new THREE.MeshStandardMaterial({
    color: 0xff6b35,
    metalness: 0.8,
    roughness: 0.2,
    emissive: 0x331100,
    emissiveIntensity: 0.2
  });
  
  const speedGovernor = new THREE.Mesh(speedGovernorGeometry, speedGovernorMaterial);
  speedGovernor.position.set(3, SHAFT_HEIGHT - 2, 0);
  speedGovernor.userData = { type: 'speedGovernor' };
  scene.add(speedGovernor);
  guidanceSystem.safetyDevices.push(speedGovernor);
  
  // 安全钳 (在轿厢底部)
  if (guidanceSystem.cabin) {
    const safetyClampGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.15);
    const safetyClampMaterial = new THREE.MeshStandardMaterial({
      color: 0xff4757,
      metalness: 0.8,
      roughness: 0.3,
      emissive: 0x330000,
      emissiveIntensity: 0.3
    });
    
    const clampPositions = [
      new THREE.Vector3(-CABIN_WIDTH/2, -CABIN_HEIGHT/2 - 0.1, CABIN_DEPTH/2),
      new THREE.Vector3(CABIN_WIDTH/2, -CABIN_HEIGHT/2 - 0.1, CABIN_DEPTH/2)
    ];
    
    clampPositions.forEach(pos => {
      const clamp = new THREE.Mesh(safetyClampGeometry, safetyClampMaterial);
      clamp.position.copy(pos);
      clamp.userData = { type: 'safetyClamp' };
      guidanceSystem.cabin.add(clamp);
      guidanceSystem.safetyDevices.push(clamp);
    });
  }
};

// 创建传感器系统
const createSensorSystem = () => {
  // 位置传感器 (每层一个)
  for (let i = 0; i < FLOOR_COUNT; i++) {
    const sensorGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.1);
    const sensorMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      metalness: 0.5,
      roughness: 0.3,
      emissive: 0x004422,
      emissiveIntensity: 0.5
    });
    
    const sensor = new THREE.Mesh(sensorGeometry, sensorMaterial);
    sensor.position.set(-2.3, i * FLOOR_HEIGHT + FLOOR_HEIGHT/2, 1.5);
    sensor.userData = { type: 'positionSensor', floor: i + 1 };
    
    scene.add(sensor);
    guidanceSystem.sensors.push(sensor);
  }
  
  // 速度传感器
  const speedSensorGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8);
  const speedSensorMaterial = new THREE.MeshStandardMaterial({
    color: 0x00aaff,
    metalness: 0.7,
    roughness: 0.2,
    emissive: 0x002244,
    emissiveIntensity: 0.4
  });
  
  const speedSensor = new THREE.Mesh(speedSensorGeometry, speedSensorMaterial);
  speedSensor.position.set(2.3, SHAFT_HEIGHT/2, 1.5);
  speedSensor.userData = { type: 'speedSensor' };
  
  scene.add(speedSensor);
  guidanceSystem.sensors.push(speedSensor);
};

// 创建科技感光效
const createTechGlowEffects = () => {
  // 导轨发光效果
  guidanceSystem.rails.forEach(rail => {
    const glowGeometry = rail.geometry.clone();
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x3498db,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(rail.position);
    glow.rotation.copy(rail.rotation);
    glow.scale.multiplyScalar(1.05);
    
    scene.add(glow);
    glowEffects.push({ mesh: glow, type: 'railGlow', target: rail });
  });
  
  // 粒子系统 - 科技感粒子
  const particleCount = 200;
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    
    // 随机位置
    positions[i3] = (Math.random() - 0.5) * 10;
    positions[i3 + 1] = Math.random() * SHAFT_HEIGHT;
    positions[i3 + 2] = (Math.random() - 0.5) * 6;
    
    // 蓝色系颜色
    const color = new THREE.Color();
    color.setHSL(0.6 + Math.random() * 0.1, 0.8, 0.5 + Math.random() * 0.3);
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
    
    sizes[i] = Math.random() * 2 + 1;
  }
  
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  const particleMaterial = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });
  
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);
  glowEffects.push({ mesh: particles, type: 'particles' });
  
  // 能量流效果
  const createEnergyFlow = (startPos, endPos, color) => {
    const curve = new THREE.QuadraticBezierCurve3(
      startPos,
      new THREE.Vector3(
        (startPos.x + endPos.x) / 2 + (Math.random() - 0.5) * 2,
        (startPos.y + endPos.y) / 2,
        (startPos.z + endPos.z) / 2 + (Math.random() - 0.5) * 2
      ),
      endPos
    );
    
    const points = curve.getPoints(50);
    const flowGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const flowMaterial = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    const flow = new THREE.Line(flowGeometry, flowMaterial);
    scene.add(flow);
    glowEffects.push({ mesh: flow, type: 'energyFlow', curve, points });
  };
  
  // 创建多条能量流
  for (let i = 0; i < 5; i++) {
    createEnergyFlow(
      new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 5,
        (Math.random() - 0.5) * 4
      ),
      new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        SHAFT_HEIGHT - Math.random() * 5,
        (Math.random() - 0.5) * 4
      ),
      new THREE.Color().setHSL(0.6 + Math.random() * 0.1, 0.8, 0.6)
    );
  }
};

// 更新动画
const updateAnimation = () => {
  glowTime += 0.016;
  
  // 更新轿厢位置
  if (guidanceSystem.cabin) {
    const targetY = props.elevatorPosition * FLOOR_HEIGHT + CABIN_HEIGHT / 2;
    
    // 平滑移动
    if (Math.abs(guidanceSystem.cabin.position.y - targetY) > 0.01) {
      guidanceSystem.cabin.position.y += (targetY - guidanceSystem.cabin.position.y) * 0.1;
      animationState.isAnimating = true;
    } else {
      animationState.isAnimating = false;
    }
    
    // 添加振动效果
    if (props.vibration > 0) {
      const vibrationIntensity = props.vibration * 0.02;
      animationState.vibrationOffset.x = (Math.random() - 0.5) * vibrationIntensity;
      animationState.vibrationOffset.z = (Math.random() - 0.5) * vibrationIntensity;
      
      guidanceSystem.cabin.position.x = animationState.vibrationOffset.x;
      guidanceSystem.cabin.position.z = 1.5 + animationState.vibrationOffset.z;
    }
  }
  
  // 更新对重位置
  if (guidanceSystem.counterweight) {
    const targetY = (FLOOR_COUNT - props.elevatorPosition - 1) * FLOOR_HEIGHT + 2;
    guidanceSystem.counterweight.position.y += (targetY - guidanceSystem.counterweight.position.y) * 0.1;
  }
  
  // 更新光效
  glowEffects.forEach(effect => {
    if (effect.type === 'railGlow') {
      effect.mesh.material.opacity = 0.1 + Math.sin(glowTime * 2) * 0.05;
    } else if (effect.type === 'particles') {
      effect.mesh.rotation.y += 0.001;
      const positions = effect.mesh.geometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += 0.01;
        if (positions[i] > SHAFT_HEIGHT) {
          positions[i] = 0;
        }
      }
      effect.mesh.geometry.attributes.position.needsUpdate = true;
    } else if (effect.type === 'energyFlow') {
      effect.mesh.material.opacity = 0.5 + Math.sin(glowTime * 3) * 0.3;
    }
  });
  
  // 更新传感器发光
  guidanceSystem.sensors.forEach(sensor => {
    if (sensor.userData.type === 'positionSensor') {
      const isActive = Math.abs(sensor.userData.floor - (props.elevatorPosition + 1)) < 0.5;
      sensor.material.emissiveIntensity = isActive ? 1.0 : 0.2 + Math.sin(glowTime * 4) * 0.1;
    } else if (sensor.userData.type === 'speedSensor') {
      sensor.material.emissiveIntensity = props.elevatorSpeed > 0 ? 0.8 : 0.2;
    }
  });
  
  // 根据温度调整材质颜色
  if (props.temperature > 30) {
    const heatFactor = Math.min((props.temperature - 30) / 20, 1);
    guidanceSystem.rails.forEach(rail => {
      rail.material.emissive.setRGB(heatFactor * 0.3, 0, 0);
    });
  }
};

// 动画循环
const animate = () => {
  requestAnimationFrame(animate);
  
  updateAnimation();
  controls.update();
  
  renderer.render(scene, camera);
};

// 监听属性变化
watch(() => props.autoRotate, (newValue) => {
  if (controls) {
    controls.autoRotate = newValue;
  }
});

watch(() => [props.elevatorPosition, props.elevatorSpeed, props.vibration, props.temperature, props.guideShoeWear, props.railAlignment], () => {
  // 属性变化时的响应逻辑已在updateAnimation中处理
}, { deep: true });

// 处理窗口大小变化
const handleResize = () => {
  if (!containerRef.value || !camera || !renderer) return;
  
  camera.aspect = containerRef.value.clientWidth / containerRef.value.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight);
};

onMounted(() => {
  initThreeJS();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  
  // 清理Three.js资源
  if (scene) {
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }
  
  if (renderer) {
    renderer.dispose();
  }
  if (controls) {
    controls.dispose();
  }
});
</script>

<template>
  <div class="model-viewer" ref="containerRef"></div>
</template>

<style scoped>
.model-viewer {
  width: 100%;
  height: 600px; /* 增加容器高度 */
  background: transparent; /* 移除容器背景 */
  box-shadow: none; /* 移除阴影 */
}
</style>