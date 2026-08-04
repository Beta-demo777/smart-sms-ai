package com.smartsms.risk.dto;

import java.util.List;

public record RiskStudentDto(
        String studentId,
        String name,
        String studentNumber,
        String className,
        Double gpa,
        Double attendance,
        String severity,
        List<String> tags
) {
}

