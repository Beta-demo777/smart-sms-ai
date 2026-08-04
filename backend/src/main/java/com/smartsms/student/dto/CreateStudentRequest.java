package com.smartsms.student.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateStudentRequest(
    @NotBlank(message = "Name is required")
    String name,
    
    @NotBlank(message = "Student number is required")
    String studentNumber,
    
    @NotNull(message = "Age is required")
    @Min(value = 1, message = "Age must be positive")
    Integer age,
    
    @NotBlank(message = "Gender is required")
    String gender,
    
    @Email(message = "Invalid email format")
    String email,
    
    String classId,
    LocalDate enrollmentDate,
    BigDecimal gpa,
    BigDecimal attendance,
    String status,
    String avatar
) {}
