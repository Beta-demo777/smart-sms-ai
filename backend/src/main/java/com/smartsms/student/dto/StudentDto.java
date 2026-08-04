package com.smartsms.student.dto;

import java.math.BigDecimal;
import java.util.List;

public record StudentDto(
    String id,
    String studentNumber,
    String name,
    Integer age,
    String gender,
    String email,
    String className,
    String classId,
    String enrollmentDate,
    BigDecimal gpa,
    BigDecimal attendance,
    String status,
    String avatar,
    List<String> enrolledCourses
) {}
