package com.smartsms.ai.dto;

import jakarta.validation.constraints.NotBlank;

public record ReportRequest(
    @NotBlank(message = "Student ID is required")
    String studentId
) {}
