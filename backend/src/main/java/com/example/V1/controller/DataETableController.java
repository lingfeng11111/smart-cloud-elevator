package com.example.V1.controller;


import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.V1.commont.Result;
import com.example.V1.entity.DataETable;
import com.example.V1.entity.PromptKnowledge;
import com.example.V1.entity.Users;
import com.example.V1.service.IAiTableService;
import com.example.V1.service.IDataETableService;
import com.example.V1.config.AiPredictsLifespanConfig;
import com.example.V1.config.KnowledgeLoader;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * <p>
 * 异常数据表 前端控制器
 * </p>
 *
 * @author Netlibata
 * @since 2025-06-26
 */
@Slf4j
@RestController
@RequestMapping("/data-etable")
public class DataETableController {

    @Autowired
    private IDataETableService dataETableService;
    
    @Autowired
    private OpenAiChatModel openAiChatModel;

    /**
     * 智能寿命预测分析接口 - 集成AI深度分析
     */
    @GetMapping("/lifetime-analysis")
    public Result<String> getLifetimeAnalysis() {
        // 可视化打印 - 开始寿命预测
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        log.info("\n" +
                " ======================================\n" +
                "[智云梯AI寿命预测] 开始执行\n" +
                "时间: {}\n" +
                "目标: 基于异常数据预测电梯剩余使用寿命\n" +
                "======================================", timestamp);

        try {
            // Step 1: 查询最近的异常数据
            log.info("[Step 1] 正在查询异常数据...");
            LambdaQueryWrapper<DataETable> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.orderByDesc(DataETable::getCreateTime).last("LIMIT 50");
            List<DataETable> recentAnomalies = dataETableService.list(queryWrapper);
            
            log.info("查询到 {} 条异常数据记录", recentAnomalies.size());
            
            // 打印异常数据概况
            log.info("异常数据概况:");
            recentAnomalies.stream().limit(5).forEach(data -> 
                log.info("   • {} - {} : {} ({})", 
                    data.getSystemName(), 
                    data.getSystemSqName(), 
                    data.getEData(),
                    data.getCreateTime().format(DateTimeFormatter.ofPattern("MM-dd HH:mm")))
            );
            if (recentAnomalies.size() > 5) {
                log.info("   ... 还有 {} 条记录", recentAnomalies.size() - 5);
            }

            // Step 2: 加载知识库
            log.info(" [Step 2] 正在加载专家知识库...");
            List<PromptKnowledge> knowledgeList = KnowledgeLoader.loadKnowledgeFromJson();
            log.info("知识库加载完成，包含 {} 个专业案例", knowledgeList.size());

            // Step 3: 构建AI分析数据
            log.info("🔧 [Step 3] 正在构建AI分析输入数据...");
            ObjectMapper mapper = new ObjectMapper();
            String analysisData = mapper.writeValueAsString(recentAnomalies);
            
            // Step 4: 构建专业提示词
            log.info(" [Step 4] 正在构建专业寿命预测提示词...");
            AiPredictsLifespanConfig lifespanConfig = new AiPredictsLifespanConfig();
            String prompt = lifespanConfig.aiPredictsLifespan(knowledgeList, analysisData);
            
            // 打印提示词摘要
            log.info(" 提示词构建完成 (长度: {} 字符)", prompt.length());
            log.info(" 分析框架: 设备退化评估 → 故障模式识别 → 寿命建模 → 维护策略");

            // Step 5: 调用AI进行分析
            log.info(" [Step 5] 正在调用DeepSeek AI进行寿命预测分析...");
            log.info("  模型: deepseek-chat");
            log.info(" API: https://api.deepseek.com");
            
            Object aiResponseObj = openAiChatModel.call(prompt);
            String rawResponse = aiResponseObj.toString();
            
            log.info("AI响应获取成功 (响应长度: {} 字符)", rawResponse.length());

            // Step 6: 解析AI响应
            log.info(" [Step 6] 正在解析AI分析结果...");
            String cleanResponse = cleanJsonResponse(rawResponse);
            
            try {
                JsonNode jsonNode = mapper.readTree(cleanResponse);
                String mainResult = jsonNode.has("main") ? jsonNode.get("main").asText() : "未获取到主要分析结果";
                String detailMessage = jsonNode.has("message") ? jsonNode.get("message").asText() : "未获取到详细分析";
                
                // 可视化打印分析结果
                log.info(" [分析完成] AI寿命预测结果:");
                log.info("┌─  核心结论");
                log.info("│  {}", mainResult);
                log.info("├─  详细分析");
                log.info("│  {}", detailMessage.length() > 200 ? 
                    detailMessage.substring(0, 200) + "..." : detailMessage);
                log.info("└─ ✨ 分析置信度: 高");
                
                // 构建响应
                Map<String, String> responseMap = new HashMap<>();
                responseMap.put("main", mainResult);
                responseMap.put("message", detailMessage);
                
                String jsonResponse = mapper.writeValueAsString(responseMap);
                
                log.info(" 寿命预测分析执行完毕! 结果已返回前端");
                log.info("======================================\n");
                
                return Result.success("AI寿命预测分析完成", jsonResponse);
                
            } catch (Exception parseEx) {
                log.error(" JSON解析失败，返回原始响应", parseEx);
                return Result.success("寿命分析完成(原始格式)", cleanResponse);
            }
            
        } catch (Exception e) {
            log.error(" [错误] 寿命预测分析失败", e);
            log.info("======================================\n");
            return Result.error("寿命预测分析失败: " + e.getMessage());
        }
    }

    /**
     * 清理AI响应中的非JSON内容
     */
    private String cleanJsonResponse(String response) {
        // 查找JSON内容
        int jsonStart = response.indexOf("{");
        int jsonEnd = response.lastIndexOf("}");
        
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
            return response.substring(jsonStart, jsonEnd + 1);
        }
        
        // 清理markdown标记
        return response.replaceAll("```json", "").replaceAll("```", "").trim();
    }

    /**
     * 新的MCP寿命分析接口 - 支持更智能的AI数据查询
     */
    @GetMapping("/mcp-lifetime-analysis")
    public Result<Map<String, Object>> getMCPLifetimeAnalysis() {
        try {
            log.info("🔧 [MCP] 获取MCP寿命分析工具列表");
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "请使用 MCP Function Calling 进行智能寿命分析");
            response.put("mcp_endpoint", "/mcp/tools/analyze_equipment_lifespan");
            response.put("function_calling_tools", Arrays.asList(
                "query_maintenance_history",
                "analyze_anomaly_patterns", 
                "calculate_equipment_health_score",
                "get_comprehensive_system_status"
            ));
            response.put("example_request", "通过 DeepSeek API 的 function calling 调用上述工具进行深度分析");
            
            log.info(" [MCP] 工具列表返回成功");
            return Result.success(response);
        } catch (Exception e) {
            log.error(" [MCP] 获取MCP工具列表失败", e);
            return Result.error("MCP寿命分析接口初始化失败: " + e.getMessage());
        }
    }

    /**
     * 异常数据接收接口，AI分析并存储
     */
    @PostMapping("/gain-data")
    public Result<String> getgainData(@RequestBody DataETable dataETable){
        return dataETableService.getgainData(dataETable);
    }

    /**
     * 快速创建异常数据（不触发AI），用于前端ML弹窗分配时避免卡顿
     */
    @PostMapping("/create")
    public Result<String> create(@RequestBody DataETable dataETable){
        return dataETableService.create(dataETable);
    }

    /**
     * 分页查询异常数据（根据系统名称,id和子系统名称筛选）
     */
    @GetMapping("/selectData")
    public Result<IPage<DataETable>> getErrorData(
            @RequestParam(defaultValue = "1") long current,
            @RequestParam(defaultValue = "9") long size,
            @RequestParam(value ="id",  required = false) Long id,
            @RequestParam(value ="systemName",  required = false) String systemName,
            @RequestParam(value ="systemSqName",  required = false) String systemSqName){
        log.info("current = {},size = {},id = {},systemName = {}，systemSqName = {}", current, size, id, systemName, systemSqName);
        return dataETableService.getErrorData(current,size,id,systemName,systemSqName);
    }

    /**
     * 分页查询（携带AI结果）——用于前端看板展示严重等级
     */
    @GetMapping("/selectWithAi")
    public Result<com.baomidou.mybatisplus.core.metadata.IPage<com.example.V1.Dto.AbnormalDataWithAiDTO>> selectWithAi(
            @RequestParam(defaultValue = "1") long current,
            @RequestParam(defaultValue = "50") long size) {
        return dataETableService.selectWithAi(current, size);
    }

}
