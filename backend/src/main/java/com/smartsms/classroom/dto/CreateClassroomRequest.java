package com.smartsms.classroom.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CreateClassroomRequest(
    @NotBlank(message = "Name is required")
    String name,
    @NotNull(message = "Capacity is required")
    @Min(value = 1, message = "Capacity must be at least 1")
    Integer capacity,
    @NotBlank(message = "Type is required")
    String type,
    String status,
    String location,
    List<String> equipment
) {}
