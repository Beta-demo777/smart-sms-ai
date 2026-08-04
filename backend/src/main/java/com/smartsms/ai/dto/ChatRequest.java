package com.smartsms.ai.dto;

import jakarta.validation.constraints.NotBlank;

public record ChatRequest(
    @NotBlank(message = "Message is required")
    String message,
    String context,
    String sessionId,
    String userId // Optional, can be inferred from token
) {}
