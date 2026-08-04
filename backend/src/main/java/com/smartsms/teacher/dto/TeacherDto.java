package com.smartsms.teacher.dto;

public record TeacherDto(
    String id,
    String teacherNumber,
    String name,
    String title,
    String department,
    String email,
    String phone,
    String status,
    String avatar,
    String joinDate,
    String researchArea
) {}
