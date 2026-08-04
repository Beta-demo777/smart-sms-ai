package com.smartsms.course.dto;

public record CourseDto(
    String id,
    String name,
    String teacher,
    String teacherAvatar,
    Integer credits,
    Integer enrolled,
    Integer maxCapacity,
    String schedule,
    String location,
    Boolean isEnrolled
) {}
