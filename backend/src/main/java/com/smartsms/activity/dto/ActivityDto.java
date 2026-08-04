package com.smartsms.activity.dto;

public record ActivityDto(
    String id,
    String user,
    String action,
    String target,
    String time,
    String category,
    String level
) {}
