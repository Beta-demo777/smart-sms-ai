package com.smartsms.student.dto;

public record StudentStatsDto(
    long totalStudents,
    double averageGpa,
    int averageAttendance
) {}
