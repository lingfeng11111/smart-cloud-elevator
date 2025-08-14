package com.example.V1.controller;


import com.baomidou.mybatisplus.core.metadata.IPage;
import com.example.V1.commont.Result;
import com.example.V1.entity.DataETable;
import com.example.V1.entity.Users;
import com.example.V1.service.IAiTableService;
import com.example.V1.service.IDataETableService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import lombok.extern.slf4j.Slf4j;

import java.util.Arrays;
import java.util.HashMap;
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

    /**
     * 寿命分析
     * @deprecated 此接口已弃用，请使用 /mcp/tools/lifetime-analysis (MCP Function Calling)
     */
    @Deprecated
    @GetMapping("/lifetime-analysis")
    public Result<String> getLifetimeAnalysis() {
        // 添加弃用警告日志
        log.warn("⚠️ 使用了已弃用的寿命分析接口 /data-etable/lifetime-analysis，建议使用 MCP Function Calling");
        return dataETableService.getLifetimeAnalysis();
    }

    /**
     * 新的MCP寿命分析接口 - 支持更智能的AI数据查询
     */
    @GetMapping("/mcp-lifetime-analysis")
    public Result<Map<String, Object>> getMCPLifetimeAnalysis() {
        try {
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
            
            return Result.success(response);
        } catch (Exception e) {
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
