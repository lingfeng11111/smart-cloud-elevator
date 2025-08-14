package com.example.V1.config;

import com.example.V1.entity.PromptKnowledge;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;

public class AiPredictsLifespanConfig {
    public String aiPredictsLifespan(List<PromptKnowledge> knowledgeList, String data) throws JsonProcessingException {
        StringBuilder sb = new StringBuilder();
        sb.append("你是一名资深电梯故障分析与寿命预测专家，具备15年以上电梯维护经验，熟悉GB/T 24475-2009、GB 7588-2003等国家标准。\n\n");
        sb.append("【专业知识库】\n");
        sb.append("基于以下丰富的实践经验和案例分析：\n");
        
        for (int i = 0; i < Math.min(10, knowledgeList.size()); i++) {
            PromptKnowledge k = knowledgeList.get(i);
            sb.append("案例").append(i+1).append(": ").append(k.getPrompt()).append("\n");
            sb.append("专家分析: ").append(k.getCompletion()).append("\n\n");
        }

        sb.append("【当前异常数据分析】\n");
        sb.append("异常数据详情：\n");
        sb.append(new ObjectMapper().writeValueAsString(data)).append("\n\n");

        sb.append("【寿命预测任务要求】\n");
        sb.append("请基于上述专业知识和当前异常数据，进行精确的电梯剩余使用寿命(RUL - Remaining Useful Life)预测分析。\n\n");
        
        sb.append("【预测分析框架】\n");
        sb.append("1. 设备退化评估：分析当前异常参数的严重程度和发展趋势\n");
        sb.append("2. 故障模式识别：判断可能的故障类型和影响范围\n");
        sb.append("3. 寿命建模：基于磨损理论和历史数据预测剩余寿命\n");
        sb.append("4. 维护策略：提供基于风险的维护建议\n\n");

        sb.append("【输出格式规范】\n");
        sb.append("严格按照以下JSON格式返回，不得添加任何markdown标记或其他内容：\n");
        sb.append("{\n");
        sb.append("  \"main\": \"简明扼要的寿命预测结论(包含具体剩余寿命时间)\",\n");
        sb.append("  \"message\": \"详细的专业分析报告(包含退化机理、风险评估、维护建议)\"\n");
        sb.append("}\n\n");

        sb.append("【专业要求】\n");
        sb.append("1. main字段：提供核心结论，明确指出预计剩余使用寿命(如：预计剩余寿命18-24个月)\n");
        sb.append("2. message字段：详细分析应包含以下内容：\n");
        sb.append("   - 设备当前健康状态评级(A/B/C/D级)\n");
        sb.append("   - 关键部件磨损程度分析\n");
        sb.append("   - 失效概率和风险等级\n");
        sb.append("   - 预测性维护时间节点\n");
        sb.append("   - 成本效益分析建议\n");
        sb.append("3. 数值精确性：基于工程实际，提供可操作的时间预测\n");
        sb.append("4. 风险评估：量化安全风险，提供决策支持\n");
        sb.append("5. 维护策略：结合设备状态制定差异化维护计划\n\n");

        sb.append("【技术标准参考】\n");
        sb.append("- GB/T 24475-2009 电梯监测系统的配置和安装\n");
        sb.append("- GB 7588-2003 电梯制造与安装安全规范\n");
        sb.append("- TSG T7001-2009 电梯监督检验和定期检验规则\n");
        sb.append("- ISO 25745-2 电梯能效分类标准\n\n");

        sb.append("请立即基于以上要求进行专业分析，确保JSON格式完全正确且可解析。");

        return sb.toString();
    }

}
