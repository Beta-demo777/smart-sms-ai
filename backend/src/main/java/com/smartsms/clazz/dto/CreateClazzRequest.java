package com.smartsms.clazz.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateClazzRequest(
    @NotBlank(message = "Name is required")
    String name,
    String department,
    String advisorId,
    @NotNull(message = "Year is required")
    Integer year,
    String status
) {}
