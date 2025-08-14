# -*- coding: utf-8 -*-
"""
智云梯 MCP 工具集 - Python实现
基于Jython，提供AI function calling的数据库查询能力
"""

import json
from java.util import HashMap, ArrayList

# H2数据库配置 - 使用现有的数据库路径
H2_DB_CONFIG = {
    'url': 'jdbc:h2:tcp://localhost//Users/lingfeng/Desktop/zhiyunti/backend/SQL/H2elevator',
    'user': 'sa',
    'password': '',
    'driver': 'org.h2.Driver'
}

def initialize_mcp_environment():
    """初始化MCP环境"""
    print("🚀 智云梯 MCP 工具集已初始化")
    print("📊 数据库配置: " + H2_DB_CONFIG['url'])
    return True

def query_maintenance_history(elevator_id=None, months_back=12, maintenance_type=None, limit=50):
    """
    查询维护历史记录
    
    Args:
        elevator_id: 电梯ID (可选)
        months_back: 查询几个月内的记录 (默认12个月)
        maintenance_type: 维护类型筛选 (可选)
        limit: 返回记录数限制 (默认50)
    
    Returns:
        JSON格式的维护历史数据
    """
    try:
        print("🔍 查询维护历史记录...")
        print("   电梯ID: " + str(elevator_id))
        print("   时间范围: " + str(months_back) + "个月")
        print("   维护类型: " + str(maintenance_type))
        print("   记录限制: " + str(limit))
        
        # 调用Java服务进行数据查询 (通过全局变量获取服务实例)
        if 'maintainTableService' in globals():
            # 构建查询参数
            params = HashMap()
            if elevator_id:
                params.put("elevatorId", elevator_id)
            if maintenance_type:
                params.put("maintenanceType", maintenance_type)
            params.put("monthsBack", months_back)
            params.put("limit", limit)
            
            # 调用Java服务查询
            maintenance_data = maintainTableService.getMaintenanceHistoryForMCP(params)
            
            # 转换为Python可处理的数据结构
            result = []
            for item in maintenance_data:
                record = {
                    'id': str(item.getId()) if item.getId() else "",
                    'maintenance_type': str(item.getMaintenanceType()) if item.getMaintenanceType() else "",
                    'description': str(item.getDescription()) if item.getDescription() else "",
                    'create_time': str(item.getCreateTime()) if item.getCreateTime() else "",
                    'status': str(item.getStatus()) if item.getStatus() else ""
                }
                result.append(record)
            
            print("✅ 查询完成，返回" + str(len(result)) + "条记录")
            return json.dumps({
                'success': True,
                'data': result,
                'total': len(result),
                'query_params': {
                    'elevator_id': elevator_id,
                    'months_back': months_back,
                    'maintenance_type': maintenance_type,
                    'limit': limit
                }
            })
        else:
            print("❌ 维护服务未初始化")
            return json.dumps({
                'success': False,
                'error': '维护服务未初始化',
                'data': []
            })
            
    except Exception as e:
        print("❌ 查询维护历史失败: " + str(e))
        return json.dumps({
            'success': False,
            'error': str(e),
            'data': []
        })

def analyze_anomaly_patterns(system_name=None, days_back=30, severity_filter=None):
    """
    分析异常模式和趋势
    
    Args:
        system_name: 系统名称筛选 (可选)
        days_back: 分析几天内的数据 (默认30天)
        severity_filter: 严重程度筛选 (可选)
    
    Returns:
        JSON格式的异常分析结果
    """
    try:
        print("📊 分析异常模式...")
        print("   系统名称: " + str(system_name))
        print("   时间范围: " + str(days_back) + "天")
        print("   严重程度: " + str(severity_filter))
        
        # 调用Java服务获取异常数据
        if 'dataETableService' in globals():
            params = HashMap()
            if system_name:
                params.put("systemName", system_name)
            params.put("daysBack", days_back)
            if severity_filter:
                params.put("severityFilter", severity_filter)
            
            anomaly_data = dataETableService.getAnomalyPatternsForMCP(params)
            
            # 分析异常模式
            result = []
            pattern_stats = {
                'total_anomalies': len(anomaly_data),
                'by_system': {},
                'by_severity': {'critical': 0, 'warning': 0, 'normal': 0},
                'trend_analysis': '基于最近数据的趋势分析'
            }
            
            for item in anomaly_data:
                record = {
                    'id': str(item.getId()) if item.getId() else "",
                    'system_name': str(item.getSystemName()) if item.getSystemName() else "",
                    'ai_code': str(item.getAiCode()) if item.getAiCode() else "",
                    'create_time': str(item.getCreateTime()) if item.getCreateTime() else ""
                }
                result.append(record)
                
                # 统计系统分布
                sys_name = record['system_name']
                if sys_name in pattern_stats['by_system']:
                    pattern_stats['by_system'][sys_name] += 1
                else:
                    pattern_stats['by_system'][sys_name] = 1
                
                # 统计严重程度
                ai_code = record['ai_code']
                if ai_code == '1':
                    pattern_stats['by_severity']['critical'] += 1
                elif ai_code == '0':
                    pattern_stats['by_severity']['warning'] += 1
                else:
                    pattern_stats['by_severity']['normal'] += 1
            
            print("✅ 异常分析完成，处理" + str(len(result)) + "条记录")
            return json.dumps({
                'success': True,
                'data': result,
                'pattern_analysis': pattern_stats,
                'recommendations': ['建议加强系统监控', '关注高频异常系统']
            })
        else:
            print("❌ 数据服务未初始化")
            return json.dumps({
                'success': False,
                'error': '数据服务未初始化',
                'data': []
            })
            
    except Exception as e:
        print("❌ 异常分析失败: " + str(e))
        return json.dumps({
            'success': False,
            'error': str(e),
            'data': []
        })

def calculate_equipment_health_score(elevator_id=None):
    """
    计算设备健康评分
    
    Args:
        elevator_id: 电梯ID (可选，不指定则计算所有电梯)
    
    Returns:
        JSON格式的健康评分结果
    """
    try:
        print("🏥 计算设备健康评分...")
        print("   电梯ID: " + str(elevator_id))
        
        # 模拟健康评分计算 (实际项目中会基于真实数据计算)
        health_scores = []
        
        if elevator_id:
            # 单个电梯评分
            score = {
                'elevator_id': elevator_id,
                'health_score': 85.5,
                'status': '良好',
                'risk_factors': ['曳引系统轻微磨损'],
                'last_maintenance': '2024-12-01',
                'next_maintenance_due': '2025-02-01'
            }
            health_scores.append(score)
        else:
            # 所有电梯评分
            elevators = ['EL-001', 'EL-002', 'EL-003']
            scores = [85.5, 78.2, 92.1]
            statuses = ['良好', '需关注', '优秀']
            
            for i, elev_id in enumerate(elevators):
                score = {
                    'elevator_id': elev_id,
                    'health_score': scores[i],
                    'status': statuses[i],
                    'risk_factors': ['正常运行'] if scores[i] > 90 else ['需要关注'],
                    'last_maintenance': '2024-12-01',
                    'next_maintenance_due': '2025-02-01'
                }
                health_scores.append(score)
        
        # 计算整体统计
        avg_score = sum([s['health_score'] for s in health_scores]) / len(health_scores)
        
        print("✅ 健康评分计算完成")
        return json.dumps({
            'success': True,
            'data': health_scores,
            'summary': {
                'total_elevators': len(health_scores),
                'average_health_score': avg_score,
                'overall_status': '良好' if avg_score > 80 else '需关注'
            }
        })
        
    except Exception as e:
        print("❌ 健康评分计算失败: " + str(e))
        return json.dumps({
            'success': False,
            'error': str(e),
            'data': []
        })

def get_comprehensive_system_status():
    """
    获取综合系统状态
    
    Returns:
        JSON格式的系统状态概览
    """
    try:
        print("📋 获取综合系统状态...")
        
        # 综合系统状态 (模拟数据)
        system_status = {
            'timestamp': '2025-01-14 10:46:00',
            'overall_status': '正常运行',
            'elevators': {
                'total': 3,
                'running': 2,
                'maintenance': 1,
                'fault': 0
            },
            'recent_alerts': [
                {'time': '10:30', 'message': 'EL-002进入维护模式', 'level': 'info'},
                {'time': '09:15', 'message': 'EL-001曳引系统参数正常', 'level': 'info'}
            ],
            'system_performance': {
                'uptime': '99.8%',
                'avg_response_time': '0.5s',
                'error_rate': '0.1%'
            },
            'maintenance_schedule': [
                {'elevator': 'EL-001', 'next_maintenance': '2025-02-01', 'type': '定期保养'},
                {'elevator': 'EL-003', 'next_maintenance': '2025-01-25', 'type': '安全检查'}
            ]
        }
        
        print("✅ 系统状态获取完成")
        return json.dumps({
            'success': True,
            'data': system_status
        })
        
    except Exception as e:
        print("❌ 获取系统状态失败: " + str(e))
        return json.dumps({
            'success': False,
            'error': str(e),
            'data': {}
        })

print("🐍 Python MCP工具集模块加载完成") 