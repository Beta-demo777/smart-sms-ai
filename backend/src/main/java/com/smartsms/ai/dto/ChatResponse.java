package com.smartsms.ai.dto;

public record ChatResponse(
    String response,
    boolean success,
    String sessionId
) {
    public ChatResponse(String response, boolean success) {
        this(response, success, null);
    }
}
