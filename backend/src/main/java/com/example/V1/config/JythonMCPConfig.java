package com.example.V1.config;

import com.example.V1.service.IDataETableService;
import com.example.V1.service.IMaintainTableService;
import com.example.V1.service.IAiTableService;
import lombok.extern.slf4j.Slf4j;
import org.python.core.PyObject;
import org.python.util.PythonInterpreter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.HashMap;

/**
 * Jython MCP 配置类
 * 集成Python MCP工具，提供AI function calling数据库查询能力
 */
@Slf4j
@Configuration
public class JythonMCPConfig {

    @Autowired
    private IDataETableService dataETableService;

    @Autowired
    private IMaintainTableService maintainTableService;

    @Autowired
    private IAiTableService aiTableService;

    private PythonInterpreter pythonInterpreter;
    private boolean mcpInitialized = false;

    @PostConstruct
    public void initJythonMCP() {
        try {
            log.info("🚀 开始初始化Jython MCP环境...");
            
            // 创建Python解释器
            pythonInterpreter = new PythonInterpreter();
            
            // 注入Java服务供Python使用
            pythonInterpreter.set("data_service", dataETableService);
            pythonInterpreter.set("maintain_service", maintainTableService);
            pythonInterpreter.set("ai_service", aiTableService);
            
            // 加载Python MCP工具模块
            loadPythonMCPModule();
            
            // 初始化MCP环境
            PyObject initResult = pythonInterpreter.eval("initialize_mcp_environment()");
            
            mcpInitialized = true;
            log.info("✅ Jython MCP环境初始化成功");
            
        } catch (Exception e) {
            log.error("❌ Jython MCP环境初始化失败", e);
            mcpInitialized = false;
        }
    }

    /**
     * 加载Python MCP工具模块
     */
    private void loadPythonMCPModule() throws IOException {
        log.info("📦 加载Python MCP工具模块...");
        
        try {
            // 加载主要的MCP工具模块
            ClassPathResource mcpToolsResource = new ClassPathResource("python/mcp_tools.py");
            if (mcpToolsResource.exists()) {
                try (InputStream inputStream = mcpToolsResource.getInputStream()) {
                    pythonInterpreter.execfile(inputStream, "mcp_tools.py");
                    log.info("✅ MCP工具模块加载成功");
                }
            } else {
                log.warn("⚠️ MCP工具模块文件不存在: python/mcp_tools.py");
            }
            
        } catch (Exception e) {
            log.error("❌ 加载Python MCP模块失败", e);
            throw new IOException("Failed to load Python MCP modules", e);
        }
    }

    /**
     * 调用Python MCP工具
     */
    public String callMCPTool(String toolName, Map<String, Object> parameters) {
        if (!mcpInitialized) {
            log.warn("⚠️ MCP环境未初始化，无法调用工具: {}", toolName);
            return createErrorResponse("MCP环境未初始化", toolName, parameters);
        }

        try {
            log.info("🔧 调用MCP工具: {} with parameters: {}", toolName, parameters);
            
            // 设置参数
            for (Map.Entry<String, Object> entry : parameters.entrySet()) {
                pythonInterpreter.set(entry.getKey(), entry.getValue());
            }
            
            // 构建函数调用
            StringBuilder functionCall = new StringBuilder(toolName + "(");
            boolean first = true;
            for (String key : parameters.keySet()) {
                if (!first) functionCall.append(", ");
                functionCall.append(key).append("=").append(key);
                first = false;
            }
            functionCall.append(")");
            
            // 执行Python函数
            PyObject result = pythonInterpreter.eval(functionCall.toString());
            String jsonResult = result.toString();
            
            log.info("✅ MCP工具调用成功: {}", toolName);
            return jsonResult;
            
        } catch (Exception e) {
            log.error("❌ MCP工具调用失败: {} - {}", toolName, e.getMessage(), e);
            return createErrorResponse(e.getMessage(), toolName, parameters);
        }
    }

    /**
     * 获取可用的MCP工具列表
     */
    public Map<String, Object> getAvailableMCPTools() {
        Map<String, Object> tools = new HashMap<>();
        
        // 维护历史查询工具
        Map<String, Object> maintenanceHistoryTool = new HashMap<>();
        maintenanceHistoryTool.put("name", "query_maintenance_history");
        maintenanceHistoryTool.put("description", "查询电梯维护历史记录，支持按电梯ID、时间范围、维护类型筛选");
        maintenanceHistoryTool.put("parameters", Map.of(
            "elevator_id", Map.of("type", "string", "description", "电梯ID，可选"),
            "months_back", Map.of("type", "integer", "description", "查询几个月内的记录，默认12"),
            "maintenance_type", Map.of("type", "string", "description", "维护类型筛选，可选"),
            "limit", Map.of("type", "integer", "description", "返回记录数限制，默认50")
        ));
        tools.put("query_maintenance_history", maintenanceHistoryTool);
        
        // 异常模式分析工具
        Map<String, Object> anomalyPatternsTool = new HashMap<>();
        anomalyPatternsTool.put("name", "analyze_anomaly_patterns");
        anomalyPatternsTool.put("description", "分析电梯异常模式和趋势，提供预测和建议");
        anomalyPatternsTool.put("parameters", Map.of(
            "system_name", Map.of("type", "string", "description", "系统名称筛选，可选"),
            "severity_level", Map.of("type", "string", "description", "严重等级筛选，可选"),
            "days_back", Map.of("type", "integer", "description", "分析天数，默认30"),
            "include_ai_analysis", Map.of("type", "boolean", "description", "是否包含AI分析结果，默认true")
        ));
        tools.put("analyze_anomaly_patterns", anomalyPatternsTool);
        
        // 设备健康评分工具
        Map<String, Object> healthScoreTool = new HashMap<>();
        healthScoreTool.put("name", "calculate_equipment_health_score");
        healthScoreTool.put("description", "计算电梯设备健康评分，提供风险评估和维护建议");
        healthScoreTool.put("parameters", Map.of(
            "elevator_id", Map.of("type", "string", "description", "电梯ID，默认EL-001"),
            "detailed_analysis", Map.of("type", "boolean", "description", "是否进行详细分析，默认true")
        ));
        tools.put("calculate_equipment_health_score", healthScoreTool);
        
        // 综合系统状态工具
        Map<String, Object> systemStatusTool = new HashMap<>();
        systemStatusTool.put("name", "get_comprehensive_system_status");
        systemStatusTool.put("description", "获取综合系统状态报告，包含所有电梯的整体状况");
        systemStatusTool.put("parameters", Map.of(
            "include_predictions", Map.of("type", "boolean", "description", "是否包含预测信息，默认true"),
            "include_recommendations", Map.of("type", "boolean", "description", "是否包含建议，默认true")
        ));
        tools.put("get_comprehensive_system_status", systemStatusTool);
        
        return tools;
    }

    /**
     * 创建错误响应
     */
    private String createErrorResponse(String errorMessage, String toolName, Map<String, Object> parameters) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("error", true);
        errorResponse.put("message", errorMessage);
        errorResponse.put("tool_name", toolName);
        errorResponse.put("parameters", parameters);
        errorResponse.put("timestamp", java.time.LocalDateTime.now().toString());
        
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper()
                    .writeValueAsString(errorResponse);
        } catch (Exception e) {
            return "{\"error\":true,\"message\":\"" + errorMessage + "\"}";
        }
    }

    /**
     * 检查MCP环境是否已初始化
     */
    public boolean isMCPInitialized() {
        return mcpInitialized;
    }

    /**
     * 获取MCP环境状态
     */
    public Map<String, Object> getMCPStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("initialized", mcpInitialized);
        status.put("available_tools", mcpInitialized ? getAvailableMCPTools().keySet() : null);
        status.put("python_version", mcpInitialized ? getPythonVersion() : null);
        return status;
    }

    /**
     * 获取Python版本信息
     */
    private String getPythonVersion() {
        try {
            if (pythonInterpreter != null) {
                PyObject version = pythonInterpreter.eval("'Jython 2.7.3 (MCP Integration)'");
                return version.toString();
            }
        } catch (Exception e) {
            log.warn("无法获取Python版本信息", e);
        }
        return "Unknown";
    }

    @PreDestroy
    public void cleanup() {
        if (pythonInterpreter != null) {
            try {
                pythonInterpreter.close();
                log.info("🧹 Jython MCP环境已清理");
            } catch (Exception e) {
                log.warn("清理Jython环境时出现警告", e);
            }
        }
    }

    /**
     * 创建Jython MCP服务Bean
     */
    @Bean
    public JythonMCPService jythonMCPService() {
        return new JythonMCPService(this);
    }

    /**
     * Jython MCP服务类
     */
    public static class JythonMCPService {
        private final JythonMCPConfig config;

        public JythonMCPService(JythonMCPConfig config) {
            this.config = config;
        }

        public String callTool(String toolName, Map<String, Object> parameters) {
            return config.callMCPTool(toolName, parameters);
        }

        public Map<String, Object> getAvailableTools() {
            return config.getAvailableMCPTools();
        }

        public Map<String, Object> getStatus() {
            return config.getMCPStatus();
        }

        public boolean isReady() {
            return config.isMCPInitialized();
        }
    }
} 