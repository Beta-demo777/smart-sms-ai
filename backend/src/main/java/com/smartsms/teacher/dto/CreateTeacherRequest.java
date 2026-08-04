package com.smartsms.teacher.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record CreateTeacherRequest(
    @NotBlank(message = "Name is required")
    String name,
    @NotBlank(message = "Teacher number is required")
    String teacherNumber,
    String title,
    String department,
    @Email(message = "Invalid email format")
    String email,
    String phone,
    String status,
    String avatar,
    LocalDate joinDate,
    String researchArea
) {}
