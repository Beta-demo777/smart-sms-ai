package com.smartsms.ai.dto;

import jakarta.validation.constraints.NotBlank;

public record RenameSessionRequest(
    @NotBlank(message = "Title is required")
    String title,
    String userId // Optional, can be inferred from token
) {}
