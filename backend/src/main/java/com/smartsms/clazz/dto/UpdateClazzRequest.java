package com.smartsms.clazz.dto;

public record UpdateClazzRequest(
    String name,
    String department,
    String advisorId,
    Integer year,
    String status
) {}
