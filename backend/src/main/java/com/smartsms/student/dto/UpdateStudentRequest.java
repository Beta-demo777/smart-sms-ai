package com.smartsms.student.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record UpdateStudentRequest(
    String name,
    String studentNumber,
    Integer age,
    String gender,
    String email,
    String classId,
    LocalDate enrollmentDate,
    BigDecimal gpa,
    BigDecimal attendance,
    String status,
    String avatar
) {}
