<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const props = defineProps({
  motorSpeed: { type: Number, default: 0 },
  motorTemperature: { type: Number, default: 65 },
  brakeStatus: { type: Boolean, default: false },
  vibration: { type: Number, default: 1.8 }
});

const containerRef = ref(null);
let scene, camera, renderer, controls;
let tractionMachine = {}; // 存储各个组件的引用
let animationId = null;

// 创建曳引机组件
const createTractionMachine = () => {
  const machineGroup = new THREE.Group();
  
  // 1. 创建电机外壳 - 增加面数提高细节
  const motorHousingGeometry = new THREE.CylinderGeometry(1.2, 1.2, 2.5, 64);
  const motorHousingMaterial = new THREE.MeshPhongMaterial({
    color: 0x2c3e50,
    shininess: 100,
    transparent: true,
    opacity: 0.9,
    bumpScale: 0.1
  });
  const motorHousing = new THREE.Mesh(motorHousingGeometry, motorHousingMaterial);
  motorHousing.position.set(0, 0, 0);
  machineGroup.add(motorHousing);
  tractionMachine.motorHousing = motorHousing;
  
  // 2. 创建电机转子（内部旋转部分） - 增加面数和细节
  const rotorGeometry = new THREE.CylinderGeometry(0.8, 0.8, 2.2, 48);
  const rotorMaterial = new THREE.MeshPhongMaterial({
    color: 0x34495e,
    shininess: 150,
    metalness: 0.7,
    roughness: 0.3
  });
  
  // 添加转子上的标记线，使旋转更明显
  const rotorMarkGeometry = new THREE.BoxGeometry(0.1, 2.2, 0.05);
  const rotorMarkMaterial = new THREE.MeshPhongMaterial({ color: 0xff6b35 });
  const rotor = new THREE.Mesh(rotorGeometry, rotorMaterial);
  rotor.position.set(0, 0, 0);
  machineGroup.add(rotor);
  
  // 添加转子标记线，使旋转更明显
  for (let i = 0; i < 4; i++) {
    const rotorMark = new THREE.Mesh(rotorMarkGeometry, rotorMarkMaterial);
    const angle = (i * Math.PI) / 2;
    rotorMark.position.set(
      Math.cos(angle) * 0.85,
      0,
      Math.sin(angle) * 0.85
    );
    rotor.add(rotorMark);
  }
  
  tractionMachine.rotor = rotor;
  
  // 3. 创建曳引轮（主要的绳槽轮） - 大幅增加面数
  const sheaveGeometry = new THREE.CylinderGeometry(1.8, 1.8, 0.4, 128);
  const sheaveMaterial = new THREE.MeshPhongMaterial({
    color: 0x3498db,
    shininess: 200,
    metalness: 0.8,
    roughness: 0.2
  });
  
  // 添加曳引轮上的标记，使旋转更明显
  const sheaveMarkGeometry = new THREE.BoxGeometry(0.15, 0.4, 0.08);
  const sheaveMarkMaterial = new THREE.MeshPhongMaterial({ color: 0xf39c12 });
  const sheave = new THREE.Mesh(sheaveGeometry, sheaveMaterial);
  sheave.position.set(0, 1.8, 0);
  
  // 添加曳引轮标记，使旋转更明显
  for (let i = 0; i < 8; i++) {
    const sheaveMark = new THREE.Mesh(sheaveMarkGeometry, sheaveMarkMaterial);
    const angle = (i * Math.PI) / 4;
    sheaveMark.position.set(
      Math.cos(angle) * 1.85,
      0,
      Math.sin(angle) * 1.85
    );
    sheave.add(sheaveMark);
  }
  
  machineGroup.add(sheave);
  tractionMachine.sheave = sheave;
  
  // 4. 创建绳槽（曳引轮上的槽） - 增加面数
  for (let i = 0; i < 6; i++) {
    const grooveGeometry = new THREE.TorusGeometry(1.7, 0.05, 16, 64);
    const grooveMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x2c3e50,
      metalness: 0.6,
      roughness: 0.4
    });
    const groove = new THREE.Mesh(grooveGeometry, grooveMaterial);
    groove.position.set(0, 1.8, -0.15 + i * 0.06);
    groove.rotation.x = Math.PI / 2;
    sheave.add(groove); // 添加到曳引轮上，一起旋转
  }
  
  // 5. 创建制动器组件 - 增加面数和细节
  const brakeDiscGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 64);
  const brakeDiscMaterial = new THREE.MeshPhongMaterial({
    color: 0xe74c3c,
    shininess: 100,
    metalness: 0.5,
    roughness: 0.3
  });
  
  // 添加制动盘上的散热槽
  const ventSlotGeometry = new THREE.BoxGeometry(0.05, 0.1, 0.3);
  const ventSlotMaterial = new THREE.MeshPhongMaterial({ color: 0x2c3e50 });
  const brakeDisc = new THREE.Mesh(brakeDiscGeometry, brakeDiscMaterial);
  brakeDisc.position.set(0, -1.5, 0);
  
  // 添加制动盘散热槽，使旋转更明显
  for (let i = 0; i < 16; i++) {
    const ventSlot = new THREE.Mesh(ventSlotGeometry, ventSlotMaterial);
    const angle = (i * Math.PI) / 8;
    ventSlot.position.set(
      Math.cos(angle) * 1.2,
      0,
      Math.sin(angle) * 1.2
    );
    ventSlot.rotation.y = angle;
    brakeDisc.add(ventSlot);
  }
  
  machineGroup.add(brakeDisc);
  tractionMachine.brakeDisc = brakeDisc;
  
  // 6. 制动钳 - 增加细节
  const brakeCaliperGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.3);
  const brakeCaliperMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x95a5a6,
    metalness: 0.6,
    roughness: 0.4
  });
  
  for (let i = 0; i < 4; i++) {
    const caliper = new THREE.Mesh(brakeCaliperGeometry, brakeCaliperMaterial);
    const angle = (i * Math.PI) / 2;
    caliper.position.set(
      Math.cos(angle) * 1.8,
      -1.5,
      Math.sin(angle) * 1.8
    );
    machineGroup.add(caliper);
  }
  
  // 7. 创建减速器外壳 - 增加细节和纹理
  const gearboxGeometry = new THREE.BoxGeometry(2.5, 1.5, 1.8);
  const gearboxMaterial = new THREE.MeshPhongMaterial({
    color: 0x7f8c8d,
    shininess: 80,
    metalness: 0.5,
    roughness: 0.5
  });
  const gearbox = new THREE.Mesh(gearboxGeometry, gearboxMaterial);
  gearbox.position.set(0, -0.5, 2.2);
  machineGroup.add(gearbox);
  
  // 8. 创建钢丝绳 - 增加面数和细节
  const ropeGeometry = new THREE.CylinderGeometry(0.02, 0.02, 8, 16);
  const ropeMaterial = new THREE.MeshPhongMaterial({
    color: 0x34495e,
    shininess: 200,
    metalness: 0.8,
    roughness: 0.2
  });
  
  for (let i = 0; i < 6; i++) {
    const rope = new THREE.Mesh(ropeGeometry, ropeMaterial);
    const angle = (i * Math.PI) / 3;
    rope.position.set(
      Math.cos(angle) * 1.7,
      1.8,
      Math.sin(angle) * 1.7
    );
    rope.rotation.z = Math.PI / 2;
    machineGroup.add(rope);
    
    if (!tractionMachine.ropes) tractionMachine.ropes = [];
    tractionMachine.ropes.push(rope);
  }
  
  // 9. 创建传感器和监控设备
  const sensorGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.1);
  const sensorMaterial = new THREE.MeshPhongMaterial({
    color: 0x27ae60,
    emissive: 0x0f3f1f
  });
  
  // 温度传感器
  const tempSensor = new THREE.Mesh(sensorGeometry, sensorMaterial);
  tempSensor.position.set(1.3, 0.5, 0);
  machineGroup.add(tempSensor);
  tractionMachine.tempSensor = tempSensor;
  
  // 振动传感器
  const vibSensor = new THREE.Mesh(sensorGeometry, sensorMaterial);
  vibSensor.position.set(-1.3, 0.5, 0);
  machineGroup.add(vibSensor);
  tractionMachine.vibSensor = vibSensor;
  
  // 10. 添加科技感的发光效果 - 增加面数
  const glowGeometry = new THREE.RingGeometry(1.9, 2.1, 64);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.set(0, 1.8, 0);
  glow.rotation.x = Math.PI / 2;
  machineGroup.add(glow);
  tractionMachine.glow = glow;
  
  // 11. 添加机械细节 - 螺栓和连接件
  const boltGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8);
  const boltMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x2c3e50,
    metalness: 0.9,
    roughness: 0.1
  });
  
  // 在电机外壳上添加螺栓
  for (let i = 0; i < 12; i++) {
    const bolt = new THREE.Mesh(boltGeometry, boltMaterial);
    const angle = (i * Math.PI) / 6;
    bolt.position.set(
      Math.cos(angle) * 1.25,
      1.2,
      Math.sin(angle) * 1.25
    );
    bolt.rotation.x = Math.PI / 2;
    machineGroup.add(bolt);
  }
  
  // 12. 添加冷却风扇
  const fanHubGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
  const fanHubMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x34495e,
    metalness: 0.8,
    roughness: 0.2
  });
  const fanHub = new THREE.Mesh(fanHubGeometry, fanHubMaterial);
  fanHub.position.set(0, -2.8, 0);
  machineGroup.add(fanHub);
  
  // 风扇叶片
  const fanBladeGeometry = new THREE.BoxGeometry(0.05, 0.8, 0.15);
  const fanBladeMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x7f8c8d,
    metalness: 0.6,
    roughness: 0.3
  });
  
  const fanGroup = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const blade = new THREE.Mesh(fanBladeGeometry, fanBladeMaterial);
    const angle = (i * Math.PI) / 3;
    blade.position.set(
      Math.cos(angle) * 0.5,
      0,
      Math.sin(angle) * 0.5
    );
    blade.rotation.y = angle + Math.PI / 2;
    fanGroup.add(blade);
  }
  fanGroup.position.set(0, -2.8, 0);
  machineGroup.add(fanGroup);
  tractionMachine.fan = fanGroup;
  
  // 13. 添加电缆和管道
  const cableGeometry = new THREE.CylinderGeometry(0.08, 0.08, 3, 8);
  const cableMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x2c3e50,
    roughness: 0.8
  });
  
  // 电源电缆
  const powerCable = new THREE.Mesh(cableGeometry, cableMaterial);
  powerCable.position.set(1.5, 0, -2.5);
  powerCable.rotation.x = Math.PI / 4;
  machineGroup.add(powerCable);
  
  // 控制电缆
  const controlCable = new THREE.Mesh(cableGeometry, cableMaterial);
  controlCable.position.set(-1.5, 0, -2.5);
  controlCable.rotation.x = Math.PI / 4;
  machineGroup.add(controlCable);
  
  return machineGroup;
};

// 初始化Three.js场景
const initThreeJS = () => {
  // 创建场景
  scene = new THREE.Scene();
  scene.background = null;

  // 创建相机
  camera = new THREE.PerspectiveCamera(
    45,
    containerRef.value.clientWidth / containerRef.value.clientHeight,
    0.1,
    1000
  );
  camera.position.set(8, 6, 8);
  camera.lookAt(0, 0, 0);

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true 
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
  controls.minDistance = 5;
  controls.maxDistance = 20;

  // 添加更丰富的光照系统
  const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
  directionalLight.position.set(10, 10, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 4096;
  directionalLight.shadow.mapSize.height = 4096;
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -10;
  directionalLight.shadow.camera.right = 10;
  directionalLight.shadow.camera.top = 10;
  directionalLight.shadow.camera.bottom = -10;
  scene.add(directionalLight);
  
  // 添加多个点光源增强科技感
  const pointLight1 = new THREE.PointLight(0x00ffff, 0.8, 15);
  pointLight1.position.set(0, 4, 0);
  scene.add(pointLight1);
  
  const pointLight2 = new THREE.PointLight(0xff6b35, 0.6, 12);
  pointLight2.position.set(3, 2, 3);
  scene.add(pointLight2);
  
  const pointLight3 = new THREE.PointLight(0xf39c12, 0.4, 10);
  pointLight3.position.set(-3, 2, -3);
  scene.add(pointLight3);

  // 创建曳引机模型
  const machineModel = createTractionMachine();
  scene.add(machineModel);
  
  // 开始动画循环
  animate();
};

// 动画循环
const animate = () => {
  animationId = requestAnimationFrame(animate);
  controls.update();
  
  // 根据props更新模型动画
  updateModelAnimation();
  
  renderer.render(scene, camera);
};

// 更新模型动画
const updateModelAnimation = () => {
  if (!tractionMachine.sheave || !tractionMachine.rotor) return;
  
  // 根据电机速度旋转曳引轮和转子 - 增加旋转速度使其更明显
  const rotationSpeed = props.motorSpeed * 0.05; // 增加5倍速度
  tractionMachine.sheave.rotation.y += rotationSpeed;
  tractionMachine.rotor.rotation.y += rotationSpeed * 1.2; // 转子稍快一些
  
  // 制动盘也跟着旋转
  if (tractionMachine.brakeDisc && !props.brakeStatus) {
    tractionMachine.brakeDisc.rotation.y += rotationSpeed * 0.8;
  }
  
  // 冷却风扇旋转
  if (tractionMachine.fan) {
    tractionMachine.fan.rotation.y += rotationSpeed * 3; // 风扇转得更快
  }
  
  // 根据温度改变传感器颜色
  if (tractionMachine.tempSensor) {
    const tempRatio = Math.min(props.motorTemperature / 100, 1);
    tractionMachine.tempSensor.material.color.setHSL(0.3 - tempRatio * 0.3, 1, 0.5);
    tractionMachine.tempSensor.material.emissive.setHSL(0.3 - tempRatio * 0.3, 1, 0.1);
  }
  
  // 根据振动添加微小的随机位移 - 增强振动效果
  if (tractionMachine.motorHousing) {
    const vibIntensity = props.vibration * 0.003; // 增加振动强度
    const time = Date.now() * 0.01;
    tractionMachine.motorHousing.position.x = Math.sin(time * 2.1) * vibIntensity;
    tractionMachine.motorHousing.position.z = Math.cos(time * 1.7) * vibIntensity;
    tractionMachine.motorHousing.position.y = Math.sin(time * 3.3) * vibIntensity * 0.5;
  }
  
  // 制动器状态
  if (tractionMachine.brakeDisc) {
    if (props.brakeStatus) {
      tractionMachine.brakeDisc.material.color.setHex(0xff0000);
      tractionMachine.brakeDisc.material.emissive.setHex(0x330000);
    } else {
      tractionMachine.brakeDisc.material.color.setHex(0xe74c3c);
      tractionMachine.brakeDisc.material.emissive.setHex(0x000000);
    }
  }
  
  // 发光效果动画 - 增强视觉效果
  if (tractionMachine.glow) {
    tractionMachine.glow.rotation.z += 0.02;
    const glowIntensity = 0.4 + Math.sin(Date.now() * 0.005) * 0.2;
    tractionMachine.glow.material.opacity = glowIntensity;
    
    // 根据转速改变发光颜色
    const speedRatio = Math.min(props.motorSpeed / 100, 1);
    const hue = 0.5 + speedRatio * 0.3; // 从青色到紫色
    tractionMachine.glow.material.color.setHSL(hue, 1, 0.5);
  }
};

// 监听props变化
watch(() => props.motorSpeed, (newSpeed) => {
  // 可以在这里添加特殊的速度变化效果
});

watch(() => props.motorTemperature, (newTemp) => {
  // 温度变化时的特殊效果
  if (newTemp > 80 && tractionMachine.tempSensor) {
    // 高温警告闪烁
    const flash = Math.sin(Date.now() * 0.01) > 0;
    tractionMachine.tempSensor.material.emissive.setHex(flash ? 0xff0000 : 0x330000);
  }
});

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