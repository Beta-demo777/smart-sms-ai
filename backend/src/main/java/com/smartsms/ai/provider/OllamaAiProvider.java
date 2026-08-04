package com.smartsms.ai.provider;

import com.smartsms.ai.config.OllamaProperties;
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
public class OllamaAiProvider implements AiProvider {

    private final OllamaProperties ollamaProperties;

    public OllamaAiProvider(OllamaProperties ollamaProperties) {
        this.ollamaProperties = ollamaProperties;
    }

    @Override
    public String name() {
        return "local";
    }

    @Override
    public String chat(List<AiProviderMessage> history, String message, String context) {
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
                "model", ollamaProperties.getModel(),
                "messages", messages,
                "stream", false
        );

        return webClient().post()
                .uri(ollamaProperties.getChatPath())
                .contentType(MediaType.APPLICATION_JSON)
                .headers(this::applyAuthHeader)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofMillis(ollamaProperties.getTimeout()))
                .map(this::extractChatResponse)
                .onErrorResume(e -> Mono.just("本地 AI（OpenAI兼容）调用失败: " + e.getMessage()))
                .block();
    }

    @Override
    public String complete(String prompt) {
        Map<String, Object> body = Map.of(
                "model", ollamaProperties.getModel(),
                "prompt", "请始终使用简体中文回答。\n\n" + prompt,
                "stream", false
        );

        return webClient().post()
                .uri(ollamaProperties.getCompletionPath())
                .contentType(MediaType.APPLICATION_JSON)
                .headers(this::applyAuthHeader)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofMillis(ollamaProperties.getTimeout()))
                .map(this::extractGenerateResponse)
                .onErrorResume(e -> Mono.just("本地 AI（OpenAI兼容）调用失败: " + e.getMessage()))
                .block();
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
            return "无法解析本地 AI 响应";
        } catch (Exception e) {
            return "本地 AI 响应解析错误: " + e.getMessage();
        }
    }

    private String extractGenerateResponse(Map<String, Object> response) {
        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (choices != null && !choices.isEmpty()) {
                Object text = choices.get(0).get("text");
                if (text instanceof String str && !str.isBlank()) {
                    return str;
                }
            }
            return "无法解析本地 AI 响应";
        } catch (Exception e) {
            return "本地 AI 响应解析错误: " + e.getMessage();
        }
    }

    private WebClient webClient() {
        return WebClient.builder()
                .baseUrl(ollamaProperties.getBaseUrl())
                .build();
    }

    private void applyAuthHeader(HttpHeaders headers) {
        String apiKey = ollamaProperties.getApiKey();
        if (apiKey != null && !apiKey.isBlank()) {
            headers.setBearerAuth(apiKey);
        }
    }
}
