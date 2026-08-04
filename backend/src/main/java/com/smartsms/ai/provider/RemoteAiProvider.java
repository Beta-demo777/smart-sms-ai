package com.smartsms.ai.provider;

import com.smartsms.ai.config.RemoteAiProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class RemoteAiProvider implements AiProvider {

    private final RemoteAiProperties remoteAiProperties;

    public RemoteAiProvider(RemoteAiProperties remoteAiProperties) {
        this.remoteAiProperties = remoteAiProperties;
    }

    @Override
    public String name() {
        return "remote";
    }

    @Override
    public String chat(List<AiProviderMessage> history, String message, String context) {
        if (!isConfigured()) {
            return "AI 服务未配置，请设置 AI_API_KEY、AI_BASE_URL 和 AI_MODEL 环境变量";
        }

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", "请始终使用简体中文回答。"));

        if (context != null && !context.isBlank()) {
            messages.add(Map.of("role", "system", "content", "上下文：" + context));
        }

        for (AiProviderMessage msg : history) {
            String role = "assistant".equals(msg.role()) ? "assistant" : "user";
            messages.add(Map.of("role", role, "content", msg.content()));
        }

        messages.add(Map.of("role", "user", "content", message));

        Map<String, Object> body = Map.of(
                "model", remoteAiProperties.getModel(),
                "messages", messages,
                "stream", false
        );

        return webClient().post()
                .uri(remoteAiProperties.getChatPath())
                .contentType(MediaType.APPLICATION_JSON)
                .headers(this::applyAuthHeader)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofMillis(remoteAiProperties.getTimeout()))
                .map(this::extractChatResponse)
                .onErrorResume(e -> Mono.just("远程 AI 调用失败: " + e.getMessage()))
                .block();
    }

    @Override
    public String complete(String prompt) {
        return chat(List.of(), prompt, null);
    }

    @SuppressWarnings("unchecked")
    private String extractChatResponse(Map<String, Object> response) {
        try {
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (choices != null && !choices.isEmpty()) {
                Map<String, Object> first = choices.get(0);
                Map<String, Object> message = (Map<String, Object>) first.get("message");
                if (message != null) {
                    Object content = message.get("content");
                    if (content instanceof String text && !text.isBlank()) {
                        return text;
                    }
                }
            }
            return "无法解析 AI 响应";
        } catch (Exception e) {
            return "响应解析错误: " + e.getMessage();
        }
    }

    private WebClient webClient() {
        return WebClient.builder()
                .baseUrl(remoteAiProperties.getBaseUrl())
                .build();
    }

    private void applyAuthHeader(HttpHeaders headers) {
        String apiKey = remoteAiProperties.getApiKey();
        if (apiKey != null && !apiKey.isBlank()) {
            headers.setBearerAuth(apiKey);
        }
    }

    private boolean isConfigured() {
        return remoteAiProperties.getApiKey() != null && !remoteAiProperties.getApiKey().isBlank()
                && remoteAiProperties.getBaseUrl() != null && !remoteAiProperties.getBaseUrl().isBlank()
                && remoteAiProperties.getModel() != null && !remoteAiProperties.getModel().isBlank();
    }
}
