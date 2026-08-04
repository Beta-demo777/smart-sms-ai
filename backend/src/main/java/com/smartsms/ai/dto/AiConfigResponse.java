package com.smartsms.ai.dto;

public record AiConfigResponse(
        String provider,
        String ollamaBaseUrl,
        String ollamaModel,
        Integer ollamaTimeout,
        String ollamaApiKey,
        String ollamaChatPath,
        String ollamaCompletionPath
) {
}
