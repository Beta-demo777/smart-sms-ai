package com.smartsms.course.dto;

public record UpdateCourseRequest(
    String name,
    String teacherId,
    Integer credits,
    Integer maxCapacity,
    String schedule,
    String location
) {}
