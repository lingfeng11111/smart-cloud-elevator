package com.example.V1.controller;

import com.example.V1.config.JythonMCPConfig;
import com.example.V1.commont.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;

/**
 * MCP控制器 - 提供AI function calling接口
 * 集成Jython Python MCP工具，支持DeepSeek等AI的function calling
 */
@Slf4j
@RestController
@RequestMapping("/mcp")
@CrossOrigin(origins = "*")
public class MCPController {

    @Autowired
    private JythonMCPConfig.JythonMCPService jythonMCPService;

    /**
     * 获取MCP工具列表 - 用于AI function calling发现
     */
    @GetMapping("/tools")
    public Result<Map<String, Object>> getMCPTools() {
        try {
            log.info("🔍 获取MCP工具列表");
            
            if (!jythonMCPService.isReady()) {
                return Result.error("MCP服务未就绪，请稍后重试");
            }
            
            Map<String, Object> tools = jythonMCPService.getAvailableTools();
            
            // 转换为OpenAI Function Calling格式
            Map<String, Object> response = new HashMap<>();
            response.put("tools", formatToolsForFunctionCalling(tools));
            response.put("total_tools", tools.size());
            response.put("mcp_status", jythonMCPService.getStatus());
            
            log.info("✅ 返回{}个MCP工具", tools.size());
            return Result.success("获取MCP工具列表成功", response);
            
        } catch (Exception e) {
            log.error("❌ 获取MCP工具列表失败", e);
            return Result.error("获取MCP工具列表失败: " + e.getMessage());
        }
    }

    /**
     * 调用MCP工具 - AI function calling执行接口
     */
    @PostMapping("/tool-call")
    public Result<Object> callMCPTool(@RequestBody MCPToolCallRequest request) {
        try {
            log.info("🔧 执行MCP工具调用: {} with parameters: {}", 
                    request.getToolName(), request.getParameters());
            
            if (!jythonMCPService.isReady()) {
                return Result.error("MCP服务未就绪，请稍后重试");
            }
            
            // 验证工具名称
            if (request.getToolName() == null || request.getToolName().trim().isEmpty()) {
                return Result.error("工具名称不能为空");
            }
            
            // 执行Python MCP工具
            String jsonResult = jythonMCPService.callTool(
                request.getToolName(), 
                request.getParameters() != null ? request.getParameters() : new HashMap<>()
            );
            
            // 解析JSON结果
            Object parsedResult = parseJsonResult(jsonResult);
            
            log.info("✅ MCP工具调用成功: {}", request.getToolName());
            return Result.success("MCP工具调用成功", parsedResult);
            
        } catch (Exception e) {
            log.error("❌ MCP工具调用失败: {} - {}", request.getToolName(), e.getMessage(), e);
            return Result.error("MCP工具调用失败: " + e.getMessage());
        }
    }

    /**
     * 查询维护历史 - 专用接口
     */
    @PostMapping("/query-maintenance-history")
    public Result<Object> queryMaintenanceHistory(@RequestBody MaintenanceHistoryRequest request) {
        try {
            log.info("🔍 查询维护历史: {}", request);
            
            Map<String, Object> parameters = new HashMap<>();
            if (request.getElevatorId() != null) {
                parameters.put("elevator_id", request.getElevatorId());
            }
            if (request.getMonthsBack() != null) {
                parameters.put("months_back", request.getMonthsBack());
            }
            if (request.getMaintenanceType() != null) {
                parameters.put("maintenance_type", request.getMaintenanceType());
            }
            if (request.getLimit() != null) {
                parameters.put("limit", request.getLimit());
            }
            
            String jsonResult = jythonMCPService.callTool("query_maintenance_history", parameters);
            Object parsedResult = parseJsonResult(jsonResult);
            
            return Result.success("查询维护历史成功", parsedResult);
            
        } catch (Exception e) {
            log.error("❌ 查询维护历史失败", e);
            return Result.error("查询维护历史失败: " + e.getMessage());
        }
    }

    /**
     * 分析异常模式 - 专用接口
     */
    @PostMapping("/analyze-anomaly-patterns")
    public Result<Object> analyzeAnomalyPatterns(@RequestBody AnomalyPatternsRequest request) {
        try {
            log.info("📊 分析异常模式: {}", request);
            
            Map<String, Object> parameters = new HashMap<>();
            if (request.getSystemName() != null) {
                parameters.put("system_name", request.getSystemName());
            }
            if (request.getSeverityLevel() != null) {
                parameters.put("severity_level", request.getSeverityLevel());
            }
            if (request.getDaysBack() != null) {
                parameters.put("days_back", request.getDaysBack());
            }
            if (request.getIncludeAiAnalysis() != null) {
                parameters.put("include_ai_analysis", request.getIncludeAiAnalysis());
            }
            
            String jsonResult = jythonMCPService.callTool("analyze_anomaly_patterns", parameters);
            Object parsedResult = parseJsonResult(jsonResult);
            
            return Result.success("异常模式分析成功", parsedResult);
            
        } catch (Exception e) {
            log.error("❌ 异常模式分析失败", e);
            return Result.error("异常模式分析失败: " + e.getMessage());
        }
    }

    /**
     * 计算设备健康评分 - 专用接口
     */
    @PostMapping("/calculate-health-score")
    public Result<Object> calculateHealthScore(@RequestBody HealthScoreRequest request) {
        try {
            log.info("🏥 计算设备健康评分: {}", request);
            
            Map<String, Object> parameters = new HashMap<>();
            if (request.getElevatorId() != null) {
                parameters.put("elevator_id", request.getElevatorId());
            }
            if (request.getDetailedAnalysis() != null) {
                parameters.put("detailed_analysis", request.getDetailedAnalysis());
            }
            
            String jsonResult = jythonMCPService.callTool("calculate_equipment_health_score", parameters);
            Object parsedResult = parseJsonResult(jsonResult);
            
            return Result.success("设备健康评分计算成功", parsedResult);
            
        } catch (Exception e) {
            log.error("❌ 设备健康评分计算失败", e);
            return Result.error("设备健康评分计算失败: " + e.getMessage());
        }
    }

    /**
     * 获取综合系统状态 - 专用接口
     */
    @GetMapping("/system-status")
    public Result<Object> getSystemStatus(
            @RequestParam(defaultValue = "true") Boolean includePredictions,
            @RequestParam(defaultValue = "true") Boolean includeRecommendations) {
        try {
            log.info("📋 获取综合系统状态");
            
            Map<String, Object> parameters = new HashMap<>();
            parameters.put("include_predictions", includePredictions);
            parameters.put("include_recommendations", includeRecommendations);
            
            String jsonResult = jythonMCPService.callTool("get_comprehensive_system_status", parameters);
            Object parsedResult = parseJsonResult(jsonResult);
            
            return Result.success("获取系统状态成功", parsedResult);
            
        } catch (Exception e) {
            log.error("❌ 获取系统状态失败", e);
            return Result.error("获取系统状态失败: " + e.getMessage());
        }
    }

    /**
     * MCP服务状态检查
     */
    @GetMapping("/status")
    public Result<Map<String, Object>> getMCPStatus() {
        try {
            Map<String, Object> status = jythonMCPService.getStatus();
            return Result.success("MCP服务状态", status);
        } catch (Exception e) {
            log.error("❌ 获取MCP状态失败", e);
            return Result.error("获取MCP状态失败: " + e.getMessage());
        }
    }

    // ========================= 私有辅助方法 =========================

    /**
     * 将工具格式化为OpenAI Function Calling格式
     */
    private List<Map<String, Object>> formatToolsForFunctionCalling(Map<String, Object> tools) {
        List<Map<String, Object>> formattedTools = new ArrayList<>();
        
        for (Map.Entry<String, Object> entry : tools.entrySet()) {
            Map<String, Object> tool = (Map<String, Object>) entry.getValue();
            
            Map<String, Object> functionTool = new HashMap<>();
            functionTool.put("type", "function");
            
            Map<String, Object> function = new HashMap<>();
            function.put("name", tool.get("name"));
            function.put("description", tool.get("description"));
            
            // 构建参数schema
            Map<String, Object> parameters = new HashMap<>();
            parameters.put("type", "object");
            parameters.put("properties", tool.get("parameters"));
            
            // 提取必需参数
            Map<String, Object> props = (Map<String, Object>) tool.get("parameters");
            List<String> required = new ArrayList<>();
            for (Map.Entry<String, Object> prop : props.entrySet()) {
                Map<String, Object> propDef = (Map<String, Object>) prop.getValue();
                if (Boolean.TRUE.equals(propDef.get("required"))) {
                    required.add(prop.getKey());
                }
            }
            if (!required.isEmpty()) {
                parameters.put("required", required);
            }
            
            function.put("parameters", parameters);
            functionTool.put("function", function);
            
            formattedTools.add(functionTool);
        }
        
        return formattedTools;
    }

    /**
     * 解析JSON结果
     */
    private Object parseJsonResult(String jsonResult) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().readValue(jsonResult, Object.class);
        } catch (Exception e) {
            log.warn("解析JSON结果失败，返回原始字符串: {}", e.getMessage());
            return jsonResult;
        }
    }

    // ========================= 请求实体类 =========================

    /**
     * MCP工具调用请求
     */
    public static class MCPToolCallRequest {
        private String toolName;
        private Map<String, Object> parameters;

        // Getters and Setters
        public String getToolName() { return toolName; }
        public void setToolName(String toolName) { this.toolName = toolName; }
        public Map<String, Object> getParameters() { return parameters; }
        public void setParameters(Map<String, Object> parameters) { this.parameters = parameters; }

        @Override
        public String toString() {
            return "MCPToolCallRequest{toolName='" + toolName + "', parameters=" + parameters + "}";
        }
    }

    /**
     * 维护历史查询请求
     */
    public static class MaintenanceHistoryRequest {
        private String elevatorId;
        private Integer monthsBack;
        private String maintenanceType;
        private Integer limit;

        // Getters and Setters
        public String getElevatorId() { return elevatorId; }
        public void setElevatorId(String elevatorId) { this.elevatorId = elevatorId; }
        public Integer getMonthsBack() { return monthsBack; }
        public void setMonthsBack(Integer monthsBack) { this.monthsBack = monthsBack; }
        public String getMaintenanceType() { return maintenanceType; }
        public void setMaintenanceType(String maintenanceType) { this.maintenanceType = maintenanceType; }
        public Integer getLimit() { return limit; }
        public void setLimit(Integer limit) { this.limit = limit; }

        @Override
        public String toString() {
            return "MaintenanceHistoryRequest{elevatorId='" + elevatorId + 
                   "', monthsBack=" + monthsBack + ", maintenanceType='" + maintenanceType + 
                   "', limit=" + limit + "}";
        }
    }

    /**
     * 异常模式分析请求
     */
    public static class AnomalyPatternsRequest {
        private String systemName;
        private String severityLevel;
        private Integer daysBack;
        private Boolean includeAiAnalysis;

        // Getters and Setters
        public String getSystemName() { return systemName; }
        public void setSystemName(String systemName) { this.systemName = systemName; }
        public String getSeverityLevel() { return severityLevel; }
        public void setSeverityLevel(String severityLevel) { this.severityLevel = severityLevel; }
        public Integer getDaysBack() { return daysBack; }
        public void setDaysBack(Integer daysBack) { this.daysBack = daysBack; }
        public Boolean getIncludeAiAnalysis() { return includeAiAnalysis; }
        public void setIncludeAiAnalysis(Boolean includeAiAnalysis) { this.includeAiAnalysis = includeAiAnalysis; }

        @Override
        public String toString() {
            return "AnomalyPatternsRequest{systemName='" + systemName + 
                   "', severityLevel='" + severityLevel + "', daysBack=" + daysBack + 
                   ", includeAiAnalysis=" + includeAiAnalysis + "}";
        }
    }

    /**
     * 健康评分请求
     */
    public static class HealthScoreRequest {
        private String elevatorId;
        private Boolean detailedAnalysis;

        // Getters and Setters
        public String getElevatorId() { return elevatorId; }
        public void setElevatorId(String elevatorId) { this.elevatorId = elevatorId; }
        public Boolean getDetailedAnalysis() { return detailedAnalysis; }
        public void setDetailedAnalysis(Boolean detailedAnalysis) { this.detailedAnalysis = detailedAnalysis; }

        @Override
        public String toString() {
            return "HealthScoreRequest{elevatorId='" + elevatorId + 
                   "', detailedAnalysis=" + detailedAnalysis + "}";
        }
    }
} 