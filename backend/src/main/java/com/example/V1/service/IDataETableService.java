package com.example.V1.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.example.V1.Dto.AbnormalDataWithAiDTO;
import com.example.V1.commont.Result;
import com.example.V1.entity.DataETable;
import com.baomidou.mybatisplus.extension.service.IService;

import java.util.List;
import java.util.Map;

/**
 * <p>
 * 异常数据表 服务类
 * </p>
 */
public interface IDataETableService extends IService<DataETable> {

    Result<String> getgainData(DataETable dataETable);

    // 快速创建异常数据（不进行AI分析）
    Result<String> create(DataETable dataETable);

    /**
     * 分页查询（携带AI结果）——用于前端看板展示严重等级
     */
    Result<IPage<AbnormalDataWithAiDTO>> selectWithAi(long current, long size);

    // ========================= MCP专用方法 =========================

    /**
     * MCP专用：获取异常模式数据，用于Python分析
     */
    List<DataETable> getAnomalyPatternsForMCP(Map<String, Object> params);

    /**
     * MCP专用：获取最近异常数据
     */
    List<DataETable> getRecentAnomaliesForMCP(String elevatorId, int days);

    /**
     * MCP专用：获取所有电梯的最近异常数据
     */
    List<DataETable> getAllRecentAnomaliesForMCP(int days);

    /**
     * MCP专用：获取所有电梯信息
     */
    List<Map<String, Object>> getAllElevatorsForMCP();

    // 分页查询异常数据（原有接口，供前端旧路径使用）
    Result<IPage<DataETable>> getErrorData(long current, long size, Long id, String systemName, String systemSqName);

    // AI 预测电梯寿命分析
    Result<String> getLifetimeAnalysis();
}
