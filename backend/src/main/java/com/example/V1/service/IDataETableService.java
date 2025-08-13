package com.example.V1.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.example.V1.Dto.AbnormalDataWithAiDTO;
import com.example.V1.commont.Result;
import com.example.V1.entity.DataETable;
import com.baomidou.mybatisplus.extension.service.IService;

/**
 * <p>
 * 异常数据表 服务类
 * </p>
 */
public interface IDataETableService extends IService<DataETable> {

    Result<String> getgainData(DataETable dataETable);

    // 快速创建异常数据（不进行AI分析）
    Result<String> create(DataETable dataETable);

    // 分页查询（携带AI结果）
    Result<IPage<AbnormalDataWithAiDTO>> selectWithAi(long current, long size);

    // 分页查询异常数据（原有接口，供前端旧路径使用）
    Result<IPage<DataETable>> getErrorData(long current, long size, Long id, String systemName, String systemSqName);

    // AI 预测电梯寿命分析
    Result<String> getLifetimeAnalysis();
}
