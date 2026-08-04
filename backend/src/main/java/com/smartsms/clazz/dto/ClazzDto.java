package com.smartsms.clazz.dto;

public record ClazzDto(
    String id,
    String name,
    String department,
    String advisor,
    Integer studentCount,
    Integer year,
    String status
) {}
