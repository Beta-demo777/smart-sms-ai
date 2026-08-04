package com.smartsms.ai.dto;

public record AiConfigUpdateRequest(
        String provider,
        String ollamaBaseUrl,
        String ollamaModel,
        Integer ollamaTimeout,
        String ollamaApiKey,
        String ollamaChatPath,
        String ollamaCompletionPath
) {
}
