<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// 接收电气系统数据作为props
const props = defineProps({
  systemData: {
    type: Object,
    default: () => null
  }
});

const containerRef = ref(null);
let scene, camera, renderer, controls;
let electricalSystem = {
  controlCabinet: null,
  motor: null,
  inverter: null,
  contactors: [],
  indicators: [],
  cables: [],
  coolingFan: null
};
let animationMixer = null;
let clock = new THREE.Clock();

// 初始化Three.js场景
const initThreeJS = () => {
  // 创建场景
  scene = new THREE.Scene();
  scene.background = null; // 透明背景

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

  // 添加灯光系统
  setupLighting();
  
  // 创建电气系统模型
  createElectricalSystem();
  
  // 设置相机位置（在所有模型创建完成后）
  setupCamera();

  // 动画循环
  const animate = () => {
    requestAnimationFrame(animate);
    
    // 更新基于数据的动画
    updateAnimations();
    
    controls.update();
    renderer.render(scene, camera);
  };

  // 开始动画循环
  animate();
};

// 设置灯光系统
const setupLighting = () => {
  // 环境光
  const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
  scene.add(ambientLight);

  // 主光源
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
  mainLight.position.set(10, 10, 5);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  scene.add(mainLight);

  // 补光
  const fillLight = new THREE.DirectionalLight(0x3498db, 0.3);
  fillLight.position.set(-5, 5, -5);
  scene.add(fillLight);

  // 点光源模拟指示灯
  const indicatorLight = new THREE.PointLight(0x00ff00, 0.5, 10);
  indicatorLight.position.set(0, 3, 0);
  scene.add(indicatorLight);
};

// 创建电气系统模型 <mcreference link="https://zhidao.baidu.com/question/1994202544100466987.html?mzl=qb_xg_6" index="1">1</mcreference>
const createElectricalSystem = () => {
  // 创建控制柜
  createControlCabinet();
  
  // 创建电机
  createMotor();
  
  // 创建变频器
  createInverter();
  
  // 创建接触器组
  createContactors();
  
  // 创建指示灯
  createIndicators();
  
  // 创建电缆
  createCables();
  
  // 创建冷却风扇
  createCoolingFan();
};

// 创建控制柜 <mcreference link="https://zhidao.baidu.com/question/1994202544100466987.html?mzl=qb_xg_6" index="1">1</mcreference>
const createControlCabinet = () => {
  const cabinetGroup = new THREE.Group();
  
  // 控制柜主体
  const cabinetGeometry = new THREE.BoxGeometry(3, 4, 1.5);
  const cabinetMaterial = new THREE.MeshLambertMaterial({ 
    color: 0x2c3e50,
    transparent: true,
    opacity: 0.8
  });
  const cabinet = new THREE.Mesh(cabinetGeometry, cabinetMaterial);
  cabinet.position.set(-2, 0, 0);
  cabinet.castShadow = true;
  cabinet.receiveShadow = true;
  cabinetGroup.add(cabinet);
  
  // 控制柜门
  const doorGeometry = new THREE.BoxGeometry(2.8, 3.8, 0.1);
  const doorMaterial = new THREE.MeshLambertMaterial({ color: 0x34495e });
  const door = new THREE.Mesh(doorGeometry, doorMaterial);
  door.position.set(-2, 0, 0.8);
  cabinetGroup.add(door);
  
  // 控制柜内部组件框架
  const frameGeometry = new THREE.BoxGeometry(2.6, 3.6, 1.2);
  const frameMaterial = new THREE.MeshLambertMaterial({ 
    color: 0x7f8c8d,
    wireframe: true
  });
  const frame = new THREE.Mesh(frameGeometry, frameMaterial);
  frame.position.set(-2, 0, 0);
  cabinetGroup.add(frame);
  
  electricalSystem.controlCabinet = cabinetGroup;
  scene.add(cabinetGroup);
};

// 创建电机 <mcreference link="https://zhidao.baidu.com/question/1994202544100466987.html?mzl=qb_xg_6" index="1">1</mcreference>
const createMotor = () => {
  const motorGroup = new THREE.Group();
  
  // 电机外壳（静止部分）
  const motorGeometry = new THREE.CylinderGeometry(0.8, 0.8, 2, 32, 1);
  const motorMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x2980b9,
    shininess: 100,
    side: THREE.DoubleSide
  });
  const motorHousing = new THREE.Mesh(motorGeometry, motorMaterial);
  motorHousing.rotation.z = Math.PI / 2;
  motorHousing.position.set(2, 0, 0);
  motorHousing.castShadow = true;
  motorGroup.add(motorHousing);
  
  // 电机转子（旋转部分）
  const rotorGroup = new THREE.Group();
  
  // 转子轴
  const shaftGeometry = new THREE.CylinderGeometry(0.09, 0.09, 2.8, 16, 1);
  const shaftMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x95a5a6,
    side: THREE.DoubleSide
  });
  const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.set(2, 0, 0.01);
  rotorGroup.add(shaft);
  
  // 转子标记线（使旋转可见）
  for (let i = 0; i < 6; i++) {
    const markGeometry = new THREE.BoxGeometry(0.08, 0.8, 0.08);
    const markMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xff3030,
      emissive: 0x330000,
      emissiveIntensity: 0.3
    });
    const mark = new THREE.Mesh(markGeometry, markMaterial);
    const angle = (i / 6) * Math.PI * 2;
    mark.position.set(
      2 + Math.cos(angle) * 0.35,
      Math.sin(angle) * 0.35,
      0.02
    );
    rotorGroup.add(mark);
  }
  
  // 添加转子端面标记
  const endMarkGeometry = new THREE.RingGeometry(0.2, 0.25, 8);
  const endMarkMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xffff00,
    emissive: 0x333300,
    emissiveIntensity: 0.2
  });
  const endMark = new THREE.Mesh(endMarkGeometry, endMarkMaterial);
  endMark.position.set(3.5, 0, 0.03);
  endMark.rotation.y = Math.PI / 2;
  rotorGroup.add(endMark);
  
  motorGroup.add(rotorGroup);
  
  // 电机散热片（静止部分）
  for (let i = 0; i < 8; i++) {
    const finGeometry = new THREE.BoxGeometry(0.05, 1.8, 0.1);
    const finMaterial = new THREE.MeshLambertMaterial({ color: 0x34495e });
    const fin = new THREE.Mesh(finGeometry, finMaterial);
    const angle = (i / 8) * Math.PI * 2;
    fin.position.set(
      2 + Math.cos(angle) * 0.9,
      Math.sin(angle) * 0.9,
      0.05
    );
    motorGroup.add(fin);
  }
  
  electricalSystem.motor = motorGroup;
  electricalSystem.motorRotor = rotorGroup; // 保存转子引用用于动画
  scene.add(motorGroup);
};

// 创建变频器 <mcreference link="https://zhidao.baidu.com/question/1994202544100466987.html?mzl=qb_xg_6" index="1">1</mcreference>
const createInverter = () => {
  const inverterGroup = new THREE.Group();
  
  // 变频器主体
  const inverterGeometry = new THREE.BoxGeometry(1.5, 2, 0.8);
  const inverterMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x27ae60,
    shininess: 80
  });
  const inverter = new THREE.Mesh(inverterGeometry, inverterMaterial);
  inverter.position.set(-1.5, 1, 0.5);
  inverter.castShadow = true;
  inverterGroup.add(inverter);
  
  // 变频器散热栅格
  for (let i = 0; i < 6; i++) {
    const grillGeometry = new THREE.BoxGeometry(1.3, 0.05, 0.6);
    const grillMaterial = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    const grill = new THREE.Mesh(grillGeometry, grillMaterial);
    grill.position.set(-1.5, 1.5 - i * 0.2, 0.9);
    inverterGroup.add(grill);
  }
  
  // 变频器显示屏
  const screenGeometry = new THREE.BoxGeometry(0.6, 0.3, 0.05);
  const screenMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x000000,
    emissive: 0x001100
  });
  const screen = new THREE.Mesh(screenGeometry, screenMaterial);
  screen.position.set(-1.5, 1.8, 0.9);
  inverterGroup.add(screen);
  
  electricalSystem.inverter = inverterGroup;
  scene.add(inverterGroup);
};

// 创建接触器组 <mcreference link="https://zhidao.baidu.com/question/1994202544100466987.html?mzl=qb_xg_6" index="1">1</mcreference>
const createContactors = () => {
  const contactorsGroup = new THREE.Group();
  
  for (let i = 0; i < 3; i++) {
    const contactorGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.3);
    const contactorMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xe74c3c,
      shininess: 60
    });
    const contactor = new THREE.Mesh(contactorGeometry, contactorMaterial);
    contactor.position.set(-2.5 + i * 0.5, -1, 0.3);
    contactor.castShadow = true;
    contactorsGroup.add(contactor);
    
    // 接触器触点
    const contactGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8);
    const contactMaterial = new THREE.MeshPhongMaterial({ color: 0xf39c12 });
    for (let j = 0; j < 3; j++) {
      const contact = new THREE.Mesh(contactGeometry, contactMaterial);
      contact.position.set(-2.5 + i * 0.5 + (j - 1) * 0.1, -0.7, 0.3);
      contactorsGroup.add(contact);
    }
  }
  
  electricalSystem.contactors = contactorsGroup;
  scene.add(contactorsGroup);
};

// 创建指示灯 <mcreference link="https://zhidao.baidu.com/question/1994202544100466987.html?mzl=qb_xg_6" index="1">1</mcreference>
const createIndicators = () => {
  const indicatorsGroup = new THREE.Group();
  
  const colors = [0xff0000, 0x00ff00, 0xffff00, 0x0000ff];
  const labels = ['运行', '故障', '警告', '待机'];
  
  for (let i = 0; i < 4; i++) {
    // 指示灯外壳
    const housingGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 16);
    const housingMaterial = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    const housing = new THREE.Mesh(housingGeometry, housingMaterial);
    housing.position.set(-2.8 + i * 0.2, 1.8, 0.9);
    indicatorsGroup.add(housing);
    
    // 指示灯
    const lightGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16);
    const lightMaterial = new THREE.MeshPhongMaterial({ 
      color: colors[i],
      transparent: true,
      opacity: 0.8,
      emissive: 0x000000,
      emissiveIntensity: 0
    });
    const light = new THREE.Mesh(lightGeometry, lightMaterial);
    light.position.set(-2.8 + i * 0.2, 1.85, 0.9);
    light.userData = { type: 'indicator', index: i, color: colors[i] };
    indicatorsGroup.add(light);
  }
  
  electricalSystem.indicators = indicatorsGroup;
  scene.add(indicatorsGroup);
};

// 创建电缆 <mcreference link="https://zhidao.baidu.com/question/1994202544100466987.html?mzl=qb_xg_6" index="1">1</mcreference>
const createCables = () => {
  const cablesGroup = new THREE.Group();
  
  // 主电缆
  const cableGeometry = new THREE.CylinderGeometry(0.05, 0.05, 4, 8);
  const cableMaterial = new THREE.MeshLambertMaterial({ color: 0x34495e });
  
  // 从控制柜到电机的电缆
  const mainCable = new THREE.Mesh(cableGeometry, cableMaterial);
  mainCable.rotation.z = Math.PI / 2;
  mainCable.position.set(0, 0.5, 0);
  cablesGroup.add(mainCable);
  
  // 控制电缆
  for (let i = 0; i < 3; i++) {
    const controlCableGeometry = new THREE.CylinderGeometry(0.02, 0.02, 2, 6);
    const controlCableMaterial = new THREE.MeshLambertMaterial({ 
      color: [0xff0000, 0x00ff00, 0x0000ff][i]
    });
    const controlCable = new THREE.Mesh(controlCableGeometry, controlCableMaterial);
    controlCable.rotation.z = Math.PI / 2;
    controlCable.position.set(0, -0.5 + i * 0.1, 0.2 + i * 0.1);
    cablesGroup.add(controlCable);
  }
  
  electricalSystem.cables = cablesGroup;
  scene.add(cablesGroup);
};

// 创建冷却风扇 <mcreference link="https://zhidao.baidu.com/question/1994202544100466987.html?mzl=qb_xg_6" index="1">1</mcreference>
const createCoolingFan = () => {
  const fanGroup = new THREE.Group();
  
  // 风扇外壳
  const housingGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
  const housingMaterial = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  const housing = new THREE.Mesh(housingGeometry, housingMaterial);
  housing.position.set(-1.5, -1.5, 0.5);
  fanGroup.add(housing);
  
  // 风扇叶片
  const bladeGroup = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const bladeGeometry = new THREE.BoxGeometry(0.25, 0.05, 0.02);
    const bladeMaterial = new THREE.MeshPhongMaterial({ color: 0x95a5a6 });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0.1, 0, 0);
    const bladeContainer = new THREE.Group();
    bladeContainer.add(blade);
    bladeContainer.rotation.z = (i / 6) * Math.PI * 2;
    bladeGroup.add(bladeContainer);
  }
  bladeGroup.position.set(-1.5, -1.5, 0.55);
  fanGroup.add(bladeGroup);
  
  electricalSystem.coolingFan = { group: fanGroup, blades: bladeGroup };
  scene.add(fanGroup);
};

// 设置相机位置
const setupCamera = () => {
  // 计算场景边界
  const box = new THREE.Box3();
  scene.traverse((object) => {
    if (object.isMesh) {
      box.expandByObject(object);
    }
  });
  
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  
  // 设置相机位置
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  const cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 0.8;
  
  camera.position.set(cameraDistance, cameraDistance * 0.8, cameraDistance * 0.6);
  camera.lookAt(center);
  controls.target.copy(center);
  
  // 设置控制器限制
  controls.minDistance = cameraDistance * 0.5;
  controls.maxDistance = cameraDistance * 2;
  controls.minPolarAngle = Math.PI / 6;
  controls.maxPolarAngle = Math.PI / 2;
};

// 更新动画基于系统数据
const updateAnimations = () => {
  if (!props.systemData) return;
  
  const delta = clock.getDelta();
  const params = props.systemData.parameters;
  
  // 电机旋转动画 - 基于电机电流（整个电机一起旋转）
  if (electricalSystem.motor && params.motorCurrent) {
    const motorSpeed = (params.motorCurrent.value / params.motorCurrent.max) * 0.3;
    electricalSystem.motor.rotation.x += motorSpeed;
  }
  
  // 冷却风扇旋转 - 基于控制柜温度
  if (electricalSystem.coolingFan && params.cabinetTemperature) {
    const fanSpeed = Math.max(0.05, (params.cabinetTemperature.value / params.cabinetTemperature.max) * 0.3);
    electricalSystem.coolingFan.blades.rotation.z += fanSpeed;
  }
  
  // 指示灯状态更新
  if (electricalSystem.indicators && params) {
    electricalSystem.indicators.children.forEach((child, index) => {
      if (child.userData.type === 'indicator') {
        const light = child;
        let shouldGlow = false;
        let glowIntensity = 0.8;
        
        switch (index) {
          case 0: // 运行指示灯 - 基于电机电流
            shouldGlow = params.motorCurrent && params.motorCurrent.value > 0;
            break;
          case 1: // 故障指示灯 - 基于温度过高
            shouldGlow = (params.cabinetTemperature && params.cabinetTemperature.value > params.cabinetTemperature.critical) ||
                        (params.motorVoltage && params.motorVoltage.value > params.motorVoltage.critical);
            glowIntensity = shouldGlow ? 1.0 : 0.3;
            break;
          case 2: // 警告指示灯 - 基于警告阈值
            shouldGlow = (params.cabinetTemperature && params.cabinetTemperature.value > params.cabinetTemperature.warning) ||
                        (params.motorVoltage && params.motorVoltage.value > params.motorVoltage.warning);
            break;
          case 3: // 待机指示灯 - 基于电机电流为0
            shouldGlow = !params.motorCurrent || params.motorCurrent.value === 0;
            break;
        }
        
        // 更新指示灯透明度和发光效果
        light.material.opacity = shouldGlow ? glowIntensity : 0.3;
        light.material.emissive.setHex(shouldGlow ? child.userData.color : 0x000000);
        light.material.emissiveIntensity = shouldGlow ? 0.5 : 0;
      }
    });
  }
  
  // 变频器显示屏效果 - 基于输入电压
  if (electricalSystem.inverter && params.inputVoltage) {
    const screen = electricalSystem.inverter.children.find(child => 
      child.material && child.material.emissive
    );
    if (screen) {
      const intensity = (params.inputVoltage.value / params.inputVoltage.max) * 0.3;
      screen.material.emissive.setHex(0x001100);
      screen.material.emissiveIntensity = intensity;
    }
  }
  
  // 控制柜门开关动画 - 基于控制器电压
  if (electricalSystem.controlCabinet && params.controllerVoltage) {
    const door = electricalSystem.controlCabinet.children.find(child => 
      child.geometry && child.geometry.parameters && child.geometry.parameters.width === 2.8
    );
    if (door) {
      const openAmount = params.controllerVoltage.value > params.controllerVoltage.normal ? 0.3 : 0;
      door.position.z = 0.8 + openAmount;
    }
  }
  
  // 更新动画混合器
  if (animationMixer) {
    animationMixer.update(delta);
  }
};

// 监听系统数据变化
watch(() => props.systemData, (newData) => {
  if (newData) {
    updateAnimations();
  }
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