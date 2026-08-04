package com.smartsms.teacher.dto;

import java.time.LocalDate;

public record UpdateTeacherRequest(
    String name,
    String teacherNumber,
    String title,
    String department,
    String email,
    String phone,
    String status,
    String avatar,
    LocalDate joinDate,
    String researchArea
) {}
