package com.example.V1.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.V1.Dto.DataETableForAiDTO;
import com.example.V1.commont.Result;
import com.example.V1.config.AiPredictsLifespanConfig;
import com.example.V1.config.KnowledgeLoader;
import com.example.V1.config.BuildPromptWithKnowleConfig;
import com.example.V1.entity.*;
import com.example.V1.mapper.DataETableMapper;
import com.example.V1.service.IDataETableService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


/**
 * <p>
 * 异常数据表 服务实现类
 * </p>
 *
 * @author Netlibata
 * @since 2025-06-26
 */
@Slf4j
@Service
public class DataETableServiceImpl extends ServiceImpl<DataETableMapper, DataETable> implements IDataETableService {





    @Autowired
    private AiTableServiceImpl aiTableService;

    @Autowired
    private OpenAiChatModel knowledgeLoader;

    @Autowired
    private DataETableMapper dataETableMapper;

    @Override
    public Result<IPage<com.example.V1.Dto.AbnormalDataWithAiDTO>> selectWithAi(long current, long size) {
        try {
            Page<com.example.V1.Dto.AbnormalDataWithAiDTO> page = new Page<>(current, size);
            IPage<com.example.V1.Dto.AbnormalDataWithAiDTO> result = dataETableMapper.selectWithAiPage(page);
            return Result.success("查询成功", result);
        } catch (Exception e) {
            log.error("selectWithAi 查询失败", e);
            return Result.error("查询失败: " + e.getMessage());
        }
    }

    /**
     * 异常数据接收，AI分析并存储（AI失败也存）
     */
    public Result<String> getgainData(DataETable dataETable) {
        try {
            // 1. 设置默认字段
            if (dataETable.getSystemName() == null || dataETable.getSystemName().isEmpty()) {
                dataETable.setSystemName("未知系统");
            }
            if (dataETable.getSystemSqName() == null || dataETable.getSystemSqName().isEmpty()) {
                dataETable.setSystemSqName("未知组件");
            }

            // 2. 保存异常数据
            boolean saved = this.save(dataETable);
            if (!saved || dataETable.getId() == null) {
                return Result.error("异常数据保存失败");
            }

            Integer errorId = dataETable.getId();

            // 3. 构建 AI 输入数据
            DataETableForAiDTO dataForAI = new DataETableForAiDTO();
            dataForAI.setSystemName(dataETable.getSystemName());
            dataForAI.setSystemSqName(dataETable.getSystemSqName());
            dataForAI.setEName(dataETable.getEName());
            dataForAI.setESqName(dataETable.getEData());

            // 4. 构建提示词
            List<PromptKnowledge> knowledgeList = KnowledgeLoader.loadKnowledgeFromJson();
            String prompt = new BuildPromptWithKnowleConfig().buildPromptWithKnowledge(knowledgeList, dataForAI);

            // 5. 调用 AI 并处理响应
            String message = "AI响应异常";
            int code = 0;
            String severity = "未知";
            String suggestion = "AI未返回建议";

            try {
                Object aiResponseObj = knowledgeLoader.call(prompt);
                String aiResponse = aiResponseObj.toString();

                int jsonStart = aiResponse.indexOf("{");
                int jsonEnd = aiResponse.lastIndexOf("}");
                if (jsonStart >= 0 && jsonEnd > jsonStart) {
                    aiResponse = aiResponse.substring(jsonStart, jsonEnd + 1);
                } else {
                    aiResponse = aiResponse.replaceAll("```json", "").replaceAll("```", "").trim();
                }

                ObjectMapper mapper = new ObjectMapper();
                JsonNode jsonNode = mapper.readTree(aiResponse);
                message = jsonNode.has("aiResult") ? jsonNode.get("aiResult").asText().replace("\\n", "\n") : "AI未返回分析内容";
                code = jsonNode.has("aiCode") ? jsonNode.get("aiCode").asInt() : 0;
                suggestion = jsonNode.has("建议") ? jsonNode.get("建议").asText().replace("\\n", "\n") : "AI未返回建议";
                severity = code == 1 ? "严重故障" : "警告";

                //打印AI解析的数据
                log.info("message = {},code ={},suggestion ={},severity={}",message,code,suggestion,severity);

            } catch (Exception aiEx) {
                log.warn("AI解析失败，使用默认值: {}", aiEx.getMessage());
            }

            // 6. 保存AI结果
            AiTable aiTable = new AiTable();
            aiTable.setEId(errorId);
            aiTable.setAiResult(message);
            aiTable.setAiCode(code);
            aiTable.setAiSeverity(severity);
            aiTableService.save(aiTable);

            // 7. 构造返回
            ObjectMapper mapper = new ObjectMapper();
            ObjectNode resultJson = mapper.createObjectNode();
            resultJson.put("mtDataId", dataETable.getId());//返回异常数据的id
            resultJson.put("systemName", dataETable.getSystemName());
            resultJson.put("systemSqName", dataETable.getSystemSqName());
            resultJson.put("eName", dataETable.getEName());
            resultJson.put("eData", dataETable.getEData());
            resultJson.put("aiCode", code);
            resultJson.put("aiResult", message);
            resultJson.put("建议", suggestion);

            if ("AI响应异常".equals(message)) {
                return Result.error("异常数据已保存，但AI响应异常");
            } else {
                return Result.success("异常数据保存，AI分析成功", resultJson.toString());
            }

        } catch (Exception e) {
            log.error("保存并AI分析异常失败", e);
            return Result.error("保存或AI分析失败: " + e.getMessage());
        }
    }

    @Override
    public Result<String> create(DataETable dataETable) {
        try {
            if (dataETable.getSystemName() == null || dataETable.getSystemName().isEmpty()) {
                dataETable.setSystemName("未知系统");
            }
            if (dataETable.getSystemSqName() == null || dataETable.getSystemSqName().isEmpty()) {
                dataETable.setSystemSqName("未知组件");
            }
            boolean saved = this.save(dataETable);
            if (!saved || dataETable.getId() == null) {
                return Result.error("异常数据保存失败");
            }
            // 仅返回 ID
            com.fasterxml.jackson.databind.node.ObjectNode resultJson = new com.fasterxml.jackson.databind.ObjectMapper().createObjectNode();
            resultJson.put("mtDataId", dataETable.getId());
            resultJson.put("systemName", dataETable.getSystemName());
            resultJson.put("systemSqName", dataETable.getSystemSqName());
            resultJson.put("eName", dataETable.getEName());
            resultJson.put("eData", dataETable.getEData());
            return Result.success("异常数据保存成功", resultJson.toString());
        } catch (Exception e) {
            log.error("快速保存异常数据失败", e);
            return Result.error("保存失败: " + e.getMessage());
        }
    }


    /**
     * 分页查询异常信息
     */
   @Override
    public Result<IPage<DataETable>> getErrorData(long current,
                                                  long size,
                                                  Long id,
                                                  String systemName,
                                                  String systemSqName) {

       try{
           //创建分页对象
           Page<DataETable> page = new Page<>(current, size);

           // 构建查询条件
           LambdaQueryWrapper<DataETable> queryWrapper = new LambdaQueryWrapper<>();

           // 如果指定了题库ID，则按题库ID查询
           if (id != null) {
               queryWrapper.eq(DataETable::getId, id);
           }
           if(systemName != null && !systemName.trim().isEmpty()){
               queryWrapper.like(DataETable::getSystemName, systemName);
           }
           if(systemSqName != null){
               queryWrapper.like(DataETable::getSystemSqName, systemSqName);
           }

           // 按更新时间降序排序
           queryWrapper.orderByDesc(DataETable::getCreateTime);

           IPage<DataETable> pageData = this.page(page, queryWrapper);

           // 如果没有查询到数据，返回空的分页对象
           if (pageData == null || pageData.getRecords().isEmpty()) {
               log.info("未查询到相关题目数据: 当前页={}, 每页大小={}", current, size);
               return Result.success("未查询到相关数据", pageData);
           }

           log.info("分页查询题目成功: 当前页={}, 每页大小={}, 总记录数={}, 总页数={}",
                   current, size, pageData.getTotal(), pageData.getPages());
           return Result.success("查询成功", pageData);
       }catch (Exception e){
           log.error("系统异常，查询失败",e);
           return Result.error("系统异常，查询失败");
       }
    }

    /**
     * AI预测电梯寿命
     */
    @Override
    public Result<String> getLifetimeAnalysis() {
        try {
            // 获取异常表最新的十条消息
            LambdaQueryWrapper<DataETable> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.orderByDesc(DataETable::getCreateTime)
                    .last("LIMIT 10");
            List<DataETable> dataList = this.baseMapper.selectList(queryWrapper);

            // 将数据转换为 JSON 字符串
            ObjectMapper objectMapper = new ObjectMapper();
            String json = objectMapper.writeValueAsString(dataList);

            // 调试输出，看一下数据格式
            System.out.println("查询结果 JSON： " + json);

            // 构造提示词
            List<PromptKnowledge> knowledgeList = KnowledgeLoader.loadKnowledgeFromJson();
            String prompt = new AiPredictsLifespanConfig().aiPredictsLifespan(knowledgeList, json);

            // 调用 AI 进行寿命预测分析
            String aiResult = knowledgeLoader.call(prompt);

            // 返回 AI 分析结果
            return Result.success(aiResult);

        } catch (JsonProcessingException e) {
            // 捕获 JSON 处理异常
            return Result.error("JSON 处理失败: " + e.getMessage());
        } catch (IOException e) {
            // 捕获 IO 异常
            return Result.error("AI 分析失败: " + e.getMessage());
        } catch (Exception e) {
            // 捕获其他异常
            return Result.error("分析失败: " + e.getMessage());
        }
    }

    // ========================= MCP专用方法实现 =========================

    @Override
    public List<DataETable> getAnomalyPatternsForMCP(Map<String, Object> params) {
        try {
            log.info("🔍 MCP查询异常模式数据: {}", params);
            
            LambdaQueryWrapper<DataETable> queryWrapper = new LambdaQueryWrapper<>();
            
            // 根据参数构建查询条件
            if (params.containsKey("systemName") && params.get("systemName") != null) {
                queryWrapper.eq(DataETable::getSystemName, params.get("systemName"));
            }
            
            if (params.containsKey("daysBack") && params.get("daysBack") != null) {
                int daysBack = (Integer) params.get("daysBack");
                queryWrapper.ge(DataETable::getCreateTime, 
                    LocalDateTime.now().minusDays(daysBack));
            }
            
            // 按创建时间倒序，限制数量避免数据过多
            queryWrapper.orderByDesc(DataETable::getCreateTime)
                    .last("LIMIT 200");
            
            List<DataETable> results = this.baseMapper.selectList(queryWrapper);
            log.info("✅ MCP查询异常模式完成，返回{}条记录", results.size());
            
            return results;
            
        } catch (Exception e) {
            log.error("❌ MCP查询异常模式失败", e);
            return new ArrayList<>();
        }
    }

    @Override
    public List<DataETable> getRecentAnomaliesForMCP(String elevatorId, int days) {
        try {
            log.info("🔍 MCP查询最近异常数据: elevatorId={}, days={}", elevatorId, days);
            
            LambdaQueryWrapper<DataETable> queryWrapper = new LambdaQueryWrapper<>();
            
            // 时间范围条件
            queryWrapper.ge(DataETable::getCreateTime, LocalDateTime.now().minusDays(days));
            
            // 注意：DataETable可能没有elevatorId字段，这里做简化处理
            // 实际项目中可能需要通过其他方式关联电梯ID
            
            queryWrapper.orderByDesc(DataETable::getCreateTime)
                    .last("LIMIT 100");
            
            List<DataETable> results = this.baseMapper.selectList(queryWrapper);
            log.info("✅ MCP查询最近异常完成，返回{}条记录", results.size());
            
            return results;
            
        } catch (Exception e) {
            log.error("❌ MCP查询最近异常失败", e);
            return new ArrayList<>();
        }
    }

    @Override
    public List<DataETable> getAllRecentAnomaliesForMCP(int days) {
        try {
            log.info("🔍 MCP查询所有电梯最近异常数据: days={}", days);
            
            LambdaQueryWrapper<DataETable> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.ge(DataETable::getCreateTime, LocalDateTime.now().minusDays(days))
                    .orderByDesc(DataETable::getCreateTime)
                    .last("LIMIT 500"); // 限制总数量
            
            List<DataETable> results = this.baseMapper.selectList(queryWrapper);
            log.info("✅ MCP查询所有异常完成，返回{}条记录", results.size());
            
            return results;
            
        } catch (Exception e) {
            log.error("❌ MCP查询所有异常失败", e);
            return new ArrayList<>();
        }
    }

    @Override
    public List<Map<String, Object>> getAllElevatorsForMCP() {
        try {
            log.info("🔍 MCP获取所有电梯信息");
            
            // 由于当前数据库结构中可能没有专门的电梯表
            // 这里返回模拟的电梯信息，实际项目中需要根据具体表结构调整
            List<Map<String, Object>> elevators = new ArrayList<>();
            
            // 模拟电梯数据
            Map<String, Object> elevator1 = new HashMap<>();
            elevator1.put("id", "EL-001");
            elevator1.put("name", "1号电梯");
            elevator1.put("location", "A座");
            elevator1.put("status", "运行中");
            elevators.add(elevator1);
            
            Map<String, Object> elevator2 = new HashMap<>();
            elevator2.put("id", "EL-002");
            elevator2.put("name", "2号电梯");
            elevator2.put("location", "B座");
            elevator2.put("status", "维护中");
            elevators.add(elevator2);
            
            log.info("✅ MCP获取电梯信息完成，返回{}台电梯", elevators.size());
            return elevators;
            
        } catch (Exception e) {
            log.error("❌ MCP获取电梯信息失败", e);
            return new ArrayList<>();
        }
    }
}
