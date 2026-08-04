package com.smartsms.course.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateCourseRequest(
    @NotBlank(message = "Course name is required")
    String name,
    @NotBlank(message = "Teacher is required")
    String teacherId,
    @NotNull(message = "Credits is required")
    @Min(value = 1, message = "Credits must be at least 1")
    Integer credits,
    @NotNull(message = "Max capacity is required")
    @Min(value = 1, message = "Max capacity must be at least 1")
    Integer maxCapacity,
    String schedule,
    String location
) {}
