#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
智云梯异常检测数据集生成器
基于真实物理规则和电梯安全标准
作者: AI助手
版本: 1.0
"""

import pandas as pd
import numpy as np
import random
import math
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import json

class ElevatorDatasetGenerator:
    """电梯异常检测数据集生成器"""
    
    def __init__(self):
        """初始化生成器，定义所有参数规范和物理关联"""
        
        # 基于前端代码提取的精确参数规范
        self.parameter_specs = {
            # 曳引系统参数
            'traction': {
                'motorTemperature': {
                    'normal_range': [25, 80],      # 正常范围
                    'warning_range': [80, 95],     # 警告范围
                    'critical_range': [95, 120],   # 严重范围
                    'baseline': 45.0,              # 基准值
                    'unit': '°C',
                    'component': '曳引机',
                    'physical_properties': {
                        'thermal_mass': 50.0,
                        'thermal_resistance': 0.1,
                        'load_sensitivity': 0.8,
                        'speed_sensitivity': 0.6,
                        'ambient_sensitivity': 0.3
                    }
                },
                'bearingTemperature': {
                    'normal_range': [30, 95],
                    'warning_range': [95, 105],
                    'critical_range': [105, 120],
                    'baseline': 50.0,
                    'unit': '°C',
                    'component': '曳引机',
                    'physical_properties': {
                        'thermal_mass': 20.0,
                        'thermal_resistance': 0.15,
                        'load_sensitivity': 0.6,
                        'speed_sensitivity': 0.4,
                        'motor_temp_coupling': 0.7  # 与电机温度耦合
                    }
                },
                'vibrationSpeed': {
                    'normal_range': [0.5, 2.8],
                    'warning_range': [2.8, 4.5],
                    'critical_range': [4.5, 6.0],
                    'baseline': 1.2,
                    'unit': 'mm/s',
                    'component': '曳引机',
                    'physical_properties': {
                        'resonant_freq': 15.0,
                        'damping_ratio': 0.05,
                        'speed_sensitivity': 1.2,
                        'load_sensitivity': 0.4,
                        'frequencies': [5, 15, 30],
                        'amplitudes': [0.3, 1.0, 0.2]
                    }
                },
                'current': {
                    'normal_range': [16.65, 20.35],  # 18.5±10%
                    'warning_range': [20.35, 21.28], # 10-15%波动
                    'critical_range': [21.28, 30],   # >15%波动
                    'baseline': 18.5,
                    'unit': 'A',
                    'component': '曳引机',
                    'physical_properties': {
                        'resistance': 0.5,
                        'inductance': 0.1,
                        'back_emf': 220,
                        'load_sensitivity': 1.5,
                        'voltage_sensitivity': 0.8
                    }
                },
                'steelRopeWear': {
                    'normal_range': [0, 10],
                    'warning_range': [10, 12],
                    'critical_range': [12, 15],
                    'baseline': 2.0,
                    'unit': '%',
                    'component': '钢丝绳',
                    'physical_properties': {
                        'wear_rate': 0.0001,
                        'load_acceleration': 1.2,
                        'speed_factor': 0.8
                    }
                },
                'brokenWires': {
                    'normal_range': [0, 5],
                    'warning_range': [5, 8],
                    'critical_range': [8, 10],
                    'baseline': 0,
                    'unit': '根/股',
                    'component': '钢丝绳',
                    'physical_properties': {
                        'failure_rate': 0.00001,
                        'wear_dependency': 2.0,
                        'poisson_lambda': 0.001
                    }
                },
                'brakeClearance': {
                    'normal_range': [0.5, 1.0],
                    'warning_range': [1.0, 1.5],
                    'critical_range': [1.5, 2.0],
                    'baseline': 0.8,
                    'unit': 'mm',
                    'component': '制动机',
                    'physical_properties': {
                        'wear_sensitivity': 0.3
                    }
                },
                'brakingTorque': {
                    'normal_range': [300, 350],
                    'warning_range': [250, 300],   # 低于正常
                    'critical_range': [200, 250],  # 严重不足
                    'baseline': 320,
                    'unit': 'N·m',
                    'component': '制动机',
                    'physical_properties': {
                        'wear_sensitivity': 0.4,
                        'min_safety_factor': 1.5
                    }
                }
            },
            
            # 导向系统参数
            'guidance': {
                'railDeviation': {
                    'normal_range': [0, 0.5],
                    'warning_range': [0.5, 1.0],
                    'critical_range': [1.0, 1.2],
                    'baseline': 0.2,
                    'unit': 'mm',
                    'component': '导轨',
                    'physical_properties': {
                        'wear_sensitivity': 0.5,
                        'installation_tolerance': 0.1
                    }
                },
                'guideShoeWear': {
                    'normal_range': [0, 2],
                    'warning_range': [2, 3],
                    'critical_range': [3, 4],
                    'baseline': 0.5,
                    'unit': 'mm',
                    'component': '导靴',
                    'physical_properties': {
                        'wear_rate': 0.00005,
                        'speed_sensitivity': 0.8,
                        'load_factor': 0.6
                    }
                },
                'railJointGap': {
                    'normal_range': [0, 0.5],
                    'warning_range': [0.5, 1.0],
                    'critical_range': [1.0, 2.0],
                    'baseline': 0.2,
                    'unit': 'mm',
                    'component': '导轨',
                    'physical_properties': {
                        'thermal_expansion': 0.012,  # mm/°C/m
                        'installation_gap': 0.2
                    }
                }
            },
            
            # 电气控制系统参数
            'electrical': {
                'voltageFluctuation': {
                    'normal_range': [-10, 10],
                    'warning_range': [10, 15],      # 绝对值
                    'critical_range': [15, 25],
                    'baseline': 0,
                    'unit': '%',
                    'component': '电源',
                    'physical_properties': {
                        'grid_freq': 50,
                        'harmonics': [3, 5, 7],
                        'harmonic_amps': [0.5, 0.3, 0.2],
                        'time_pattern': True
                    }
                },
                'contactVoltageDrops': {
                    'normal_range': [10, 50],
                    'warning_range': [50, 100],
                    'critical_range': [100, 150],
                    'baseline': 25,
                    'unit': 'mV',
                    'component': '电源',
                    'physical_properties': {
                        'contact_resistance': 0.1,
                        'current_sensitivity': 0.8,
                        'aging_sensitivity': 0.6,
                        'humidity_factor': 0.3
                    }
                },
                'controlResponseTime': {
                    'normal_range': [0.1, 0.5],
                    'warning_range': [0.5, 1.0],
                    'critical_range': [1.0, 2.0],
                    'baseline': 0.3,
                    'unit': '秒',
                    'component': '控制器',
                    'physical_properties': {
                        'processor_load': 0.3,
                        'temperature_sensitivity': 0.2
                    }
                },
                'currentLoad': {
                    'normal_range': [16.65, 20.35],  # 基于18.5A ±10%
                    'warning_range': [20.35, 21.28],
                    'critical_range': [21.28, 30],
                    'baseline': 18.5,
                    'unit': 'A',
                    'component': '负载',
                    'physical_properties': {
                        'power_factor': 0.85,
                        'efficiency': 0.9,
                        'load_dependency': 1.0
                    }
                }
            },
            
            # 门系统参数
            'door': {
                'openCloseTime': {
                    'normal_range': [2.0, 3.0],
                    'warning_range': [3.0, 5.0],
                    'critical_range': [5.0, 8.0],
                    'baseline': 2.5,
                    'unit': '秒',
                    'component': '门机',
                    'physical_properties': {
                        'mechanical_inertia': 2.0,
                        'friction_coeff': 0.1,
                        'wear_sensitivity': 0.4,
                        'load_factor': 0.2
                    }
                },
                'contactResistance': {
                    'normal_range': [0.05, 0.5],
                    'warning_range': [0.5, 1.0],
                    'critical_range': [1.0, 1.5],
                    'baseline': 0.1,
                    'unit': 'Ω',
                    'component': '门锁装置',
                    'physical_properties': {
                        'oxidation_rate': 0.00001,
                        'humidity_sensitivity': 0.3,
                        'contact_cycles': 0
                    }
                },
                'doorCurrent': {
                    'normal_range': [4.5, 5.5],     # 基于5A ±10%
                    'warning_range': [5.5, 6.0],
                    'critical_range': [6.0, 8.0],
                    'baseline': 5.0,
                    'unit': 'A',
                    'component': '门机',
                    'physical_properties': {
                        'rated_power': 1.5,  # kW
                        'efficiency': 0.85,
                        'friction_dependency': 0.6
                    }
                },
                'mechanicalDepth': {
                    'normal_range': [7, 12],        # ≥7mm为正常
                    'warning_range': [5, 7],        # 接近临界
                    'critical_range': [0, 5],       # <7mm为危险
                    'baseline': 9.0,
                    'unit': 'mm',
                    'component': '门锁装置',
                    'physical_properties': {
                        'wear_rate': 0.001,
                        'adjustment_tolerance': 0.5
                    }
                }
            }
        }
        
        # 复杂物理关联模型
        self.physical_correlations = {
            'thermal_dynamics': {
                # 热力学关联
                'load_to_motor_temp': lambda load, baseline: baseline + (load/1000) * 25,
                'motor_to_bearing_temp': lambda motor_temp, coupling=0.7: motor_temp * coupling,
                'ambient_influence': lambda temp, ambient, sensitivity=0.3: temp + (ambient-25) * sensitivity,
                'speed_heating': lambda temp, speed, factor=0.6: temp + (speed**2) * factor * 5
            },
            'mechanical_dynamics': {
                # 机械关联
                'load_to_vibration': lambda baseline, load, factor=0.4: baseline * (1 + load/1000 * factor),
                'speed_to_vibration': lambda baseline, speed, factor=1.2: baseline * (1 + speed/2 * factor),
                'wear_to_clearance': lambda baseline, wear, factor=0.3: baseline + wear * factor,
                'frequency_resonance': lambda base_vib, freq_match=1.0: base_vib * (1 + freq_match * 0.5)
            },
            'electrical_dynamics': {
                # 电气关联
                'load_to_current': lambda baseline, load, efficiency=0.9: baseline + (load/1000) * 2 / efficiency,
                'voltage_to_current': lambda current, voltage_var, sensitivity=0.8: current * (1 - voltage_var/100 * sensitivity),
                'temperature_to_resistance': lambda resistance, temp_diff, factor=0.004: resistance * (1 + temp_diff * factor),
                'power_factor_effect': lambda current, pf=0.85: current / pf
            },
            'wear_dynamics': {
                # 磨损关联
                'operating_hours_to_wear': lambda base_wear, hours, rate=0.001: base_wear + hours * rate,
                'load_accelerated_wear': lambda wear, load, acceleration=1.2: wear * ((load/500) ** acceleration),
                'speed_wear_factor': lambda wear, speed, factor=0.8: wear * (1 + speed/2 * factor),
                'broken_wires_from_wear': lambda wear, dependency=2.0: max(0, (wear - 10) ** dependency / 10)
            },
            'environmental_effects': {
                # 环境影响
                'humidity_to_resistance': lambda resistance, humidity, factor=0.3: resistance * (1 + (humidity-60)/100 * factor),
                'temperature_expansion': lambda gap, temp_diff, expansion=0.012: gap + abs(temp_diff) * expansion,
                'time_pattern_voltage': lambda base_voltage, hour: base_voltage * (1 + 0.1 * math.sin(2*math.pi*hour/24))
            }
        }
        
        # 运行模式定义
        self.operating_modes = {
            'peak_morning': {'hours': [7, 9], 'load_range': [600, 1000], 'frequency': 'high'},
            'peak_evening': {'hours': [17, 19], 'load_range': [500, 900], 'frequency': 'high'},
            'normal_day': {'hours': [9, 17], 'load_range': [200, 600], 'frequency': 'medium'},
            'night_time': {'hours': [22, 6], 'load_range': [0, 200], 'frequency': 'low'},
            'maintenance': {'hours': [2, 4], 'load_range': [0, 100], 'frequency': 'minimal'}
        }
        
        # 故障模式定义
        self.failure_patterns = {
            'thermal_overload': {
                'affected_params': ['motorTemperature', 'bearingTemperature', 'current'],
                'correlation': 'positive',
                'trigger_conditions': {'load_weight': '>800', 'ambient_temp': '>28'},
                'progression': 'gradual'
            },
            'mechanical_wear': {
                'affected_params': ['steelRopeWear', 'brokenWires', 'guideShoeWear'],
                'correlation': 'positive',
                'trigger_conditions': {'operating_hours': '>8000', 'maintenance_days_since': '>60'},
                'progression': 'accelerating'
            },
            'electrical_instability': {
                'affected_params': ['voltageFluctuation', 'contactVoltageDrops', 'controlResponseTime'],
                'correlation': 'positive',
                'trigger_conditions': {'time_of_day': 'peak', 'humidity': '>75'},
                'progression': 'sudden'
            },
            'door_malfunction': {
                'affected_params': ['openCloseTime', 'contactResistance', 'mechanicalDepth'],
                'correlation': 'mixed',
                'trigger_conditions': {'contact_cycles': '>50000', 'humidity': '>70'},
                'progression': 'gradual'
            }
        }

    def generate_realistic_sample(self, 
                                severity_level: str = 'normal',
                                system_focus: Optional[str] = None,
                                failure_pattern: Optional[str] = None,
                                timestamp: Optional[datetime] = None) -> Dict:
        """生成单个真实样本"""
        
        if timestamp is None:
            timestamp = datetime.now() - timedelta(
                days=random.randint(0, 365),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59)
            )
        
        # 基础环境和运行参数
        sample = {
            'timestamp': timestamp,
            'load_weight': self._generate_realistic_load(timestamp),
            'speed': self._generate_realistic_speed(timestamp),
            'operating_hours': random.uniform(0, 15000),
            'ambient_temp': self._generate_ambient_temperature(timestamp),
            'humidity': self._generate_humidity(timestamp),
            'time_of_day': self._get_time_period(timestamp.hour),
            'maintenance_days_since': random.randint(0, 120),
            'contact_cycles': random.randint(0, 100000),
            'season': self._get_season(timestamp.month),
            'building_floors': random.choice([10, 15, 20, 25, 30]),
            'usage_intensity': self._get_usage_intensity(timestamp)
        }
        
        # 选择系统和参数
        if system_focus:
            systems = [system_focus]
        else:
            systems = list(self.parameter_specs.keys())
        
        system = random.choice(systems)
        parameter = random.choice(list(self.parameter_specs[system].keys()))
        spec = self.parameter_specs[system][parameter]
        
        sample.update({
            'system_name': system,
            'component_name': spec['component'],
            'parameter_name': parameter,
            'unit': spec['unit']
        })
        
        # 生成参数值（考虑物理关联）
        base_value = self._generate_parameter_value(spec, severity_level, sample)
        
        # 应用物理关联和故障模式
        final_value = self._apply_physical_correlations(base_value, parameter, sample, spec)
        
        if failure_pattern:
            final_value = self._apply_failure_pattern(final_value, parameter, failure_pattern, sample)
        
        sample['parameter_value'] = round(final_value, 3)
        
        # 计算异常评分
        sample['anomaly_score'] = self._calculate_anomaly_score(final_value, spec, severity_level)
        sample['severity_level'] = self._determine_final_severity(final_value, spec)
        
        # 添加衍生特征
        sample = self._add_contextual_features(sample, spec)
        
        return sample

    def _generate_realistic_load(self, timestamp: datetime) -> float:
        """生成真实的负载模式"""
        hour = timestamp.hour
        day_of_week = timestamp.weekday()  # 0=Monday, 6=Sunday
        
        # 工作日vs周末模式
        if day_of_week < 5:  # 工作日
            if 7 <= hour <= 9:  # 早高峰
                return random.uniform(600, 1000)
            elif 17 <= hour <= 19:  # 晚高峰
                return random.uniform(500, 900)
            elif 9 <= hour <= 17:  # 工作时间
                return random.uniform(300, 700)
            elif 22 <= hour or hour <= 6:  # 夜间
                return random.uniform(0, 200)
            else:  # 其他时间
                return random.uniform(100, 400)
        else:  # 周末
            if 10 <= hour <= 14:  # 周末活跃时间
                return random.uniform(400, 600)
            elif 22 <= hour or hour <= 8:  # 夜间
                return random.uniform(0, 150)
            else:
                return random.uniform(150, 400)

    def _generate_realistic_speed(self, timestamp: datetime) -> float:
        """生成真实的速度模式"""
        hour = timestamp.hour
        # 高峰期速度更高，夜间较低
        if 7 <= hour <= 9 or 17 <= hour <= 19:
            return random.uniform(1.2, 2.0)
        elif 22 <= hour or hour <= 6:
            return random.uniform(0.5, 1.0)
        else:
            return random.uniform(0.8, 1.6)

    def _generate_ambient_temperature(self, timestamp: datetime) -> float:
        """生成真实的环境温度"""
        month = timestamp.month
        hour = timestamp.hour
        
        # 季节基础温度
        seasonal_temps = {
            12: 5, 1: 3, 2: 8,     # 冬季
            3: 15, 4: 20, 5: 25,   # 春季
            6: 28, 7: 32, 8: 30,   # 夏季
            9: 25, 10: 18, 11: 10  # 秋季
        }
        base_temp = seasonal_temps[month]
        
        # 日温差变化
        daily_variation = 3 * math.sin(2 * math.pi * (hour - 6) / 24)
        
        # 随机波动
        random_variation = random.gauss(0, 1.5)
        
        return max(0, base_temp + daily_variation + random_variation)

    def _generate_humidity(self, timestamp: datetime) -> float:
        """生成真实的湿度"""
        month = timestamp.month
        hour = timestamp.hour
        
        # 季节湿度基线
        seasonal_humidity = {
            12: 45, 1: 40, 2: 45,   # 冬季较干
            3: 55, 4: 60, 5: 65,    # 春季
            6: 75, 7: 80, 8: 78,    # 夏季较湿
            9: 70, 10: 60, 11: 50   # 秋季
        }
        base_humidity = seasonal_humidity[month]
        
        # 日变化（清晨较高）
        daily_variation = 5 * math.cos(2 * math.pi * (hour - 6) / 24)
        
        # 随机变化
        random_variation = random.gauss(0, 3)
        
        return max(20, min(95, base_humidity + daily_variation + random_variation))

    def _get_time_period(self, hour: int) -> str:
        """获取时段"""
        if 6 <= hour < 12:
            return 'morning'
        elif 12 <= hour < 18:
            return 'afternoon'
        elif 18 <= hour < 22:
            return 'evening'
        else:
            return 'night'

    def _get_season(self, month: int) -> str:
        """获取季节"""
        if month in [12, 1, 2]:
            return 'winter'
        elif month in [3, 4, 5]:
            return 'spring'
        elif month in [6, 7, 8]:
            return 'summer'
        else:
            return 'autumn'

    def _get_usage_intensity(self, timestamp: datetime) -> str:
        """获取使用强度"""
        hour = timestamp.hour
        day_of_week = timestamp.weekday()
        
        if day_of_week < 5:  # 工作日
            if 7 <= hour <= 9 or 17 <= hour <= 19:
                return 'high'
            elif 9 <= hour <= 17:
                return 'medium'
            else:
                return 'low'
        else:  # 周末
            if 10 <= hour <= 16:
                return 'medium'
            else:
                return 'low'

    def _generate_parameter_value(self, spec: Dict, severity_level: str, sample: Dict) -> float:
        """基于严重程度生成参数基础值"""
        if severity_level == 'normal':
            return random.uniform(*spec['normal_range'])
        elif severity_level == 'warning':
            return random.uniform(*spec['warning_range'])
        else:  # critical
            return random.uniform(*spec['critical_range'])

    def _apply_physical_correlations(self, base_value: float, parameter: str, sample: Dict, spec: Dict) -> float:
        """应用复杂物理关联"""
        value = base_value
        correlations = self.physical_correlations
        
        # 温度相关参数
        if 'Temperature' in parameter:
            # 负载影响
            if 'motor' in parameter.lower():
                value = correlations['thermal_dynamics']['load_to_motor_temp'](sample['load_weight'], spec['baseline'])
            elif 'bearing' in parameter.lower():
                # 轴承温度受电机温度和负载双重影响
                motor_effect = correlations['thermal_dynamics']['load_to_motor_temp'](sample['load_weight'], spec['baseline'])
                value = correlations['thermal_dynamics']['motor_to_bearing_temp'](motor_effect, 0.7)
            
            # 环境温度影响
            value = correlations['thermal_dynamics']['ambient_influence'](value, sample['ambient_temp'])
            
            # 速度影响
            value = correlations['thermal_dynamics']['speed_heating'](value, sample['speed'])
        
        # 振动相关参数
        elif 'vibration' in parameter.lower():
            value = correlations['mechanical_dynamics']['load_to_vibration'](spec['baseline'], sample['load_weight'])
            value = correlations['mechanical_dynamics']['speed_to_vibration'](value, sample['speed'])
            
            # 共振效应
            if random.random() < 0.1:  # 10%概率出现共振
                value = correlations['mechanical_dynamics']['frequency_resonance'](value)
        
        # 电流相关参数
        elif 'current' in parameter.lower() or 'Current' in parameter:
            value = correlations['electrical_dynamics']['load_to_current'](spec['baseline'], sample['load_weight'])
            
            # 电压波动影响
            voltage_var = random.gauss(0, 5)  # 电压波动
            value = correlations['electrical_dynamics']['voltage_to_current'](value, voltage_var)
        
        # 磨损相关参数
        elif 'wear' in parameter.lower() or 'Wear' in parameter:
            value = correlations['wear_dynamics']['operating_hours_to_wear'](spec['baseline'], sample['operating_hours'])
            value = correlations['wear_dynamics']['load_accelerated_wear'](value, sample['load_weight'])
            value = correlations['wear_dynamics']['speed_wear_factor'](value, sample['speed'])
        
        # 断丝数
        elif 'broken' in parameter.lower():
            # 基于磨损程度计算断丝概率
            wear_level = sample.get('steel_rope_wear', 5)  # 假设磨损值
            value = correlations['wear_dynamics']['broken_wires_from_wear'](wear_level)
        
        # 电阻相关参数
        elif 'resistance' in parameter.lower() or 'Resistance' in parameter:
            # 湿度影响
            value = correlations['environmental_effects']['humidity_to_resistance'](value, sample['humidity'])
            
            # 温度影响
            temp_diff = sample['ambient_temp'] - 25
            value = correlations['electrical_dynamics']['temperature_to_resistance'](value, temp_diff)
        
        # 间隙相关参数
        elif 'gap' in parameter.lower() or 'clearance' in parameter.lower():
            # 热膨胀影响
            temp_diff = sample['ambient_temp'] - 20
            value = correlations['environmental_effects']['temperature_expansion'](value, temp_diff)
            
            # 磨损影响
            hours_factor = sample['operating_hours'] / 10000
            value += hours_factor * 0.3
        
        # 时间相关参数
        elif 'time' in parameter.lower() or 'Time' in parameter:
            # 磨损导致时间延长
            wear_factor = sample['operating_hours'] / 15000
            value += wear_factor * 1.0
            
            # 环境湿度影响机械部件
            humidity_factor = (sample['humidity'] - 60) / 100
            value += humidity_factor * 0.5
        
        return max(0, value)

    def _apply_failure_pattern(self, value: float, parameter: str, pattern: str, sample: Dict) -> float:
        """应用故障模式"""
        if pattern not in self.failure_patterns:
            return value
        
        pattern_info = self.failure_patterns[pattern]
        
        if parameter in pattern_info['affected_params']:
            if pattern_info['progression'] == 'gradual':
                # 渐进式故障
                progression_factor = sample['operating_hours'] / 15000
                value *= (1 + progression_factor * 0.5)
            elif pattern_info['progression'] == 'sudden':
                # 突发性故障
                if random.random() < 0.05:  # 5%概率突发
                    value *= random.uniform(1.5, 3.0)
            elif pattern_info['progression'] == 'accelerating':
                # 加速恶化
                time_factor = sample['maintenance_days_since'] / 90
                value *= (1 + time_factor ** 2)
        
        return value

    def _calculate_anomaly_score(self, value: float, spec: Dict, severity_level: str) -> float:
        """计算异常评分（0-1）"""
        normal_min, normal_max = spec['normal_range']
        warning_min, warning_max = spec['warning_range']
        critical_min, critical_max = spec['critical_range']
        
        if normal_min <= value <= normal_max:
            # 正常范围内的异常评分
            center = (normal_min + normal_max) / 2
            distance = abs(value - center) / (normal_max - center)
            return min(0.3, distance * 0.3)
        elif warning_min <= value <= warning_max:
            # 警告范围
            range_position = (value - warning_min) / (warning_max - warning_min)
            return 0.3 + range_position * 0.4
        else:
            # 严重范围
            if value > critical_max:
                return 1.0
            elif value < critical_min:
                return 1.0
            else:
                range_position = (value - critical_min) / (critical_max - critical_min)
                return 0.7 + range_position * 0.3

    def _determine_final_severity(self, value: float, spec: Dict) -> str:
        """根据最终值确定严重程度"""
        normal_min, normal_max = spec['normal_range']
        warning_min, warning_max = spec['warning_range']
        critical_min, critical_max = spec['critical_range']
        
        if normal_min <= value <= normal_max:
            return 'normal'
        elif warning_min <= value <= warning_max:
            return 'warning'
        else:
            return 'critical'

    def _add_contextual_features(self, sample: Dict, spec: Dict) -> Dict:
        """添加上下文特征"""
        # 负载等级
        if sample['load_weight'] <= 300:
            sample['load_level'] = 'light'
        elif sample['load_weight'] <= 600:
            sample['load_level'] = 'medium'
        else:
            sample['load_level'] = 'heavy'
        
        # 运行状态等级
        if sample['operating_hours'] <= 3000:
            sample['operating_level'] = 'new'
        elif sample['operating_hours'] <= 8000:
            sample['operating_level'] = 'medium'
        else:
            sample['operating_level'] = 'old'
        
        # 维护状态
        if sample['maintenance_days_since'] <= 30:
            sample['maintenance_status'] = 'recent'
        elif sample['maintenance_days_since'] <= 60:
            sample['maintenance_status'] = 'due_soon'
        else:
            sample['maintenance_status'] = 'overdue'
        
        # 偏离基准值程度
        baseline = spec['baseline']
        sample['deviation_from_baseline'] = abs(sample['parameter_value'] - baseline)
        sample['deviation_percentage'] = (sample['deviation_from_baseline'] / baseline) * 100 if baseline != 0 else 0
        
        # 环境压力因子
        temp_stress = (sample['ambient_temp'] - 25) / 10
        humidity_stress = (sample['humidity'] - 60) / 40
        sample['environmental_stress'] = temp_stress + humidity_stress
        
        # 使用强度评分
        usage_scores = {'low': 0.3, 'medium': 0.6, 'high': 1.0}
        sample['usage_intensity_score'] = usage_scores[sample['usage_intensity']]
        
        # 复合风险评分
        maintenance_risk = min(1.0, sample['maintenance_days_since'] / 90)
        operating_risk = min(1.0, sample['operating_hours'] / 15000)
        environmental_risk = min(1.0, abs(sample['environmental_stress']))
        sample['composite_risk_score'] = (maintenance_risk + operating_risk + environmental_risk) / 3
        
        return sample

    def generate_comprehensive_dataset(self, 
                                     total_samples: int = 50000,
                                     normal_ratio: float = 0.65,
                                     warning_ratio: float = 0.25,
                                     critical_ratio: float = 0.10,
                                     include_failure_patterns: bool = True,
                                     filename: str = 'elevator_comprehensive_dataset.csv') -> pd.DataFrame:
        """生成大规模综合数据集"""
        
        print(f"🚀 开始生成智云梯异常检测数据集...")
        print(f"📊 配置信息:")
        print(f"   总样本数: {total_samples:,}")
        print(f"   正常样本: {int(total_samples * normal_ratio):,} ({normal_ratio*100:.1f}%)")
        print(f"   警告样本: {int(total_samples * warning_ratio):,} ({warning_ratio*100:.1f}%)")
        print(f"   严重样本: {int(total_samples * critical_ratio):,} ({critical_ratio*100:.1f}%)")
        print(f"   包含故障模式: {include_failure_patterns}")
        
        dataset = []
        
        # 时间范围：过去2年
        start_date = datetime.now() - timedelta(days=730)
        end_date = datetime.now()
        
        # 生成正常样本
        print("📈 生成正常样本...")
        normal_count = int(total_samples * normal_ratio)
        for i in range(normal_count):
            if i % 1000 == 0:
                print(f"   进度: {i:,}/{normal_count:,}")
            
            timestamp = start_date + timedelta(
                seconds=random.randint(0, int((end_date - start_date).total_seconds()))
            )
            
            sample = self.generate_realistic_sample(
                severity_level='normal',
                timestamp=timestamp
            )
            dataset.append(sample)
        
        # 生成警告样本
        print("⚠️  生成警告样本...")
        warning_count = int(total_samples * warning_ratio)
        for i in range(warning_count):
            if i % 500 == 0:
                print(f"   进度: {i:,}/{warning_count:,}")
            
            timestamp = start_date + timedelta(
                seconds=random.randint(0, int((end_date - start_date).total_seconds()))
            )
            
            failure_pattern = None
            if include_failure_patterns and random.random() < 0.3:
                failure_pattern = random.choice(list(self.failure_patterns.keys()))
            
            sample = self.generate_realistic_sample(
                severity_level='warning',
                timestamp=timestamp,
                failure_pattern=failure_pattern
            )
            dataset.append(sample)
        
        # 生成严重样本
        print("🚨 生成严重样本...")
        critical_count = int(total_samples * critical_ratio)
        for i in range(critical_count):
            if i % 250 == 0:
                print(f"   进度: {i:,}/{critical_count:,}")
            
            timestamp = start_date + timedelta(
                seconds=random.randint(0, int((end_date - start_date).total_seconds()))
            )
            
            failure_pattern = None
            if include_failure_patterns and random.random() < 0.6:
                failure_pattern = random.choice(list(self.failure_patterns.keys()))
            
            sample = self.generate_realistic_sample(
                severity_level='critical',
                timestamp=timestamp,
                failure_pattern=failure_pattern
            )
            dataset.append(sample)
        
        # 转换为DataFrame
        print("📋 转换为DataFrame...")
        df = pd.DataFrame(dataset)
        
        # 数据后处理
        print("🔧 数据后处理...")
        df = self._post_process_dataset(df)
        
        # 保存数据集
        print(f"💾 保存数据集: {filename}")
        df.to_csv(filename, index=False, encoding='utf-8-sig')
        
        # 显示统计信息
        self._show_comprehensive_stats(df)
        
        print(f"✅ 数据集生成完成！")
        return df

    def _post_process_dataset(self, df: pd.DataFrame) -> pd.DataFrame:
        """数据后处理"""
        # 排序
        df = df.sort_values('timestamp').reset_index(drop=True)
        
        # 添加时间特征
        df['hour'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        df['month'] = df['timestamp'].dt.month
        df['is_weekend'] = df['day_of_week'].isin([5, 6])
        df['is_peak_hour'] = df['hour'].isin([7, 8, 9, 17, 18, 19])
        
        # 添加滞后特征（模拟历史影响）
        for col in ['parameter_value', 'anomaly_score']:
            if col in df.columns:
                df[f'{col}_lag1'] = df[col].shift(1)
                df[f'{col}_lag7'] = df[col].shift(7)  # 一周前
        
        # 添加滚动统计特征
        window_sizes = [7, 30]  # 7天和30天窗口
        for window in window_sizes:
            df[f'anomaly_score_rolling_mean_{window}d'] = df['anomaly_score'].rolling(window, min_periods=1).mean()
            df[f'anomaly_score_rolling_std_{window}d'] = df['anomaly_score'].rolling(window, min_periods=1).std()
        
        # 填充NaN值
        df = df.fillna(method='bfill').fillna(0)
        
        return df

    def _show_comprehensive_stats(self, df: pd.DataFrame):
        """显示comprehensive统计信息"""
        print("\n" + "="*60)
        print("📊 数据集统计信息")
        print("="*60)
        
        print(f"📈 基础信息:")
        print(f"   总样本数: {len(df):,}")
        print(f"   时间跨度: {df['timestamp'].min()} 至 {df['timestamp'].max()}")
        print(f"   特征数量: {len(df.columns)}")
        
        print(f"\n🎯 严重程度分布:")
        severity_counts = df['severity_level'].value_counts()
        for severity, count in severity_counts.items():
            percentage = count / len(df) * 100
            print(f"   {severity:>8}: {count:>6,} ({percentage:>5.1f}%)")
        
        print(f"\n🏗️  系统分布:")
        system_counts = df['system_name'].value_counts()
        for system, count in system_counts.items():
            percentage = count / len(df) * 100
            print(f"   {system:>12}: {count:>6,} ({percentage:>5.1f}%)")
        
        print(f"\n⚙️  参数分布 (前10):")
        param_counts = df['parameter_name'].value_counts().head(10)
        for param, count in param_counts.items():
            percentage = count / len(df) * 100
            print(f"   {param:>20}: {count:>5,} ({percentage:>4.1f}%)")
        
        print(f"\n📊 数值统计:")
        numeric_cols = ['parameter_value', 'anomaly_score', 'load_weight', 'operating_hours']
        for col in numeric_cols:
            if col in df.columns:
                print(f"   {col:>15}: min={df[col].min():>8.2f}, max={df[col].max():>8.2f}, mean={df[col].mean():>8.2f}")
        
        print(f"\n🎨 特征工程:")
        feature_cols = [col for col in df.columns if any(x in col for x in ['level', 'status', 'score', 'stress', 'lag', 'rolling'])]
        print(f"   衍生特征数: {len(feature_cols)}")
        
        print(f"\n✅ 数据质量:")
        print(f"   缺失值数量: {df.isnull().sum().sum()}")
        print(f"   重复行数量: {df.duplicated().sum()}")
        
        # 异常评分分布
        print(f"\n📈 异常评分分布:")
        score_bins = [0, 0.3, 0.7, 1.0]
        score_labels = ['低', '中', '高']
        df['anomaly_level'] = pd.cut(df['anomaly_score'], bins=score_bins, labels=score_labels, include_lowest=True)
        for level, count in df['anomaly_level'].value_counts().items():
            percentage = count / len(df) * 100
            print(f"   {level}异常: {count:>6,} ({percentage:>5.1f}%)")

    def generate_system_specific_datasets(self, base_samples_per_system: int = 10000):
        """生成系统专用数据集"""
        systems = list(self.parameter_specs.keys())
        
        for system in systems:
            print(f"\n🔧 生成 {system} 系统专用数据集...")
            
            dataset = self.generate_comprehensive_dataset(
                total_samples=base_samples_per_system,
                normal_ratio=0.6,
                warning_ratio=0.25,
                critical_ratio=0.15,
                filename=f'elevator_{system}_specialized_dataset.csv'
            )
            
            # 过滤只包含该系统的数据
            system_df = dataset[dataset['system_name'] == system].copy()
            system_df.to_csv(f'elevator_{system}_filtered.csv', index=False, encoding='utf-8-sig')
            
            print(f"✅ {system} 系统数据集完成: {len(system_df):,} 样本")

def main():
    """主函数"""
    print("🏗️  智云梯异常检测数据集生成器 v1.0")
    print("基于真实物理规则和电梯安全标准\n")
    
    generator = ElevatorDatasetGenerator()
    
    # 生成主数据集
    main_dataset = generator.generate_comprehensive_dataset(
        total_samples=50000,
        normal_ratio=0.65,
        warning_ratio=0.25,
        critical_ratio=0.10,
        include_failure_patterns=True,
        filename='elevator_anomaly_master_dataset.csv'
    )
    
    # 生成系统专用数据集
    print("\n" + "="*60)
    print("🔧 生成系统专用数据集...")
    generator.generate_system_specific_datasets(base_samples_per_system=12000)
    
    print("\n" + "="*60)
    print("🎉 所有数据集生成完成！")
    print("📁 生成的文件:")
    print("   - elevator_anomaly_master_dataset.csv (主数据集)")
    print("   - elevator_traction_specialized_dataset.csv (曳引系统)")
    print("   - elevator_guidance_specialized_dataset.csv (导向系统)")
    print("   - elevator_electrical_specialized_dataset.csv (电气系统)")
    print("   - elevator_door_specialized_dataset.csv (门系统)")
    print("   - elevator_*_filtered.csv (各系统过滤数据)")

if __name__ == "__main__":
    main() 