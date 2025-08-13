package com.example.V1.Dto;

import com.example.V1.config.LocalDateTimeSerializer;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class AbnormalDataWithAiDTO {
    private Integer id;

    @JsonProperty("createTime")
    @JsonSerialize(using = LocalDateTimeSerializer.class)
    private LocalDateTime createTime;

    @JsonProperty("systemName")
    private String systemName;

    @JsonProperty("systemSqName")
    private String systemSqName;

    @JsonProperty("eName")
    private String eName;

    @JsonProperty("eData")
    private String eData;

    @JsonProperty("aiCode")
    private Integer aiCode;

    @JsonProperty("aiResult")
    private String aiResult;
} 