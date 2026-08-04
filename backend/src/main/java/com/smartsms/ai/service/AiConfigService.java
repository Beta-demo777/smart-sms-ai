package com.smartsms.ai.service;

import com.smartsms.ai.config.AiProperties;
import com.smartsms.ai.config.OllamaProperties;
import com.smartsms.ai.dto.AiConfigResponse;
import com.smartsms.ai.dto.AiConfigUpdateRequest;
import com.smartsms.common.service.SystemSettingService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AiConfigService {

    public static final String KEY_PROVIDER = "ai.provider";
    public static final String KEY_OLLAMA_BASE_URL = "ollama.base-url";
    public static final String KEY_OLLAMA_MODEL = "ollama.model";
    public static final String KEY_OLLAMA_TIMEOUT = "ollama.timeout";
    public static final String KEY_OLLAMA_API_KEY = "ollama.api-key";
    public static final String KEY_OLLAMA_CHAT_PATH = "ollama.chat-path";
    public static final String KEY_OLLAMA_COMPLETION_PATH = "ollama.completion-path";

    private final SystemSettingService systemSettingService;
    private final AiProperties aiProperties;
    private final OllamaProperties ollamaProperties;

    public AiConfigService(SystemSettingService systemSettingService,
                           AiProperties aiProperties,
                           OllamaProperties ollamaProperties) {
        this.systemSettingService = systemSettingService;
        this.aiProperties = aiProperties;
        this.ollamaProperties = ollamaProperties;
    }

    @Transactional(readOnly = true)
    public AiConfigResponse getEffectiveConfig() {
        applyPersistedConfig();
        return snapshot();
    }

    public AiConfigResponse updateConfig(AiConfigUpdateRequest request) {
        if (request == null) {
            applyPersistedConfig();
            return snapshot();
        }

        if (request.provider() != null && !request.provider().isBlank()) {
            String provider = normalizeProvider(request.provider());
            systemSettingService.updateSetting(KEY_PROVIDER, provider, "AI provider switch");
            aiProperties.setProvider(provider);
        }
        if (request.ollamaBaseUrl() != null && !request.ollamaBaseUrl().isBlank()) {
            String baseUrl = request.ollamaBaseUrl().trim();
            systemSettingService.updateSetting(KEY_OLLAMA_BASE_URL, baseUrl, "Ollama base URL");
            ollamaProperties.setBaseUrl(baseUrl);
        }
        if (request.ollamaModel() != null && !request.ollamaModel().isBlank()) {
            String model = request.ollamaModel().trim();
            systemSettingService.updateSetting(KEY_OLLAMA_MODEL, model, "Ollama model");
            ollamaProperties.setModel(model);
        }
        if (request.ollamaTimeout() != null && request.ollamaTimeout() > 0) {
            int timeout = request.ollamaTimeout();
            systemSettingService.updateSetting(KEY_OLLAMA_TIMEOUT, String.valueOf(timeout), "Ollama timeout(ms)");
            ollamaProperties.setTimeout(timeout);
        }
        if (request.ollamaApiKey() != null) {
            String apiKey = request.ollamaApiKey().trim();
            systemSettingService.updateSetting(KEY_OLLAMA_API_KEY, apiKey, "OpenAI-compatible local API key");
            ollamaProperties.setApiKey(apiKey);
        }
        if (request.ollamaChatPath() != null && !request.ollamaChatPath().isBlank()) {
            String chatPath = normalizePath(request.ollamaChatPath());
            systemSettingService.updateSetting(KEY_OLLAMA_CHAT_PATH, chatPath, "Local chat endpoint path");
            ollamaProperties.setChatPath(chatPath);
        }
        if (request.ollamaCompletionPath() != null && !request.ollamaCompletionPath().isBlank()) {
            String completionPath = normalizePath(request.ollamaCompletionPath());
            systemSettingService.updateSetting(KEY_OLLAMA_COMPLETION_PATH, completionPath, "Local completion endpoint path");
            ollamaProperties.setCompletionPath(completionPath);
        }

        applyPersistedConfig();
        return snapshot();
    }

    public void applyPersistedConfig() {
        systemSettingService.getSetting(KEY_PROVIDER)
                .map(s -> s.getValue())
                .filter(v -> v != null && !v.isBlank())
                .map(this::normalizeProvider)
                .ifPresent(aiProperties::setProvider);

        systemSettingService.getSetting(KEY_OLLAMA_BASE_URL)
                .map(s -> s.getValue())
                .filter(v -> v != null && !v.isBlank())
                .ifPresent(v -> ollamaProperties.setBaseUrl(v.trim()));

        systemSettingService.getSetting(KEY_OLLAMA_MODEL)
                .map(s -> s.getValue())
                .filter(v -> v != null && !v.isBlank())
                .ifPresent(v -> ollamaProperties.setModel(v.trim()));

        systemSettingService.getSetting(KEY_OLLAMA_TIMEOUT)
                .map(s -> s.getValue())
                .filter(v -> v != null && !v.isBlank())
                .ifPresent(v -> {
                    try {
                        int timeout = Integer.parseInt(v.trim());
                        if (timeout > 0) {
                            ollamaProperties.setTimeout(timeout);
                        }
                    } catch (NumberFormatException ignored) {
                    }
                });

        systemSettingService.getSetting(KEY_OLLAMA_API_KEY)
                .map(s -> s.getValue())
                .ifPresent(v -> ollamaProperties.setApiKey(v == null ? "" : v.trim()));

        systemSettingService.getSetting(KEY_OLLAMA_CHAT_PATH)
                .map(s -> s.getValue())
                .filter(v -> v != null && !v.isBlank())
                .map(this::normalizePath)
                .ifPresent(ollamaProperties::setChatPath);

        systemSettingService.getSetting(KEY_OLLAMA_COMPLETION_PATH)
                .map(s -> s.getValue())
                .filter(v -> v != null && !v.isBlank())
                .map(this::normalizePath)
                .ifPresent(ollamaProperties::setCompletionPath);
    }

    private AiConfigResponse snapshot() {
        return new AiConfigResponse(
                normalizeProvider(aiProperties.getProvider()),
                ollamaProperties.getBaseUrl(),
                ollamaProperties.getModel(),
                ollamaProperties.getTimeout(),
                maskApiKey(ollamaProperties.getApiKey()),
                ollamaProperties.getChatPath(),
                ollamaProperties.getCompletionPath()
        );
    }

    private String normalizeProvider(String provider) {
        if (provider == null || provider.isBlank()) {
            return "remote";
        }
        String value = provider.trim().toLowerCase();
        if ("ollama".equals(value)) {
            return "local";
        }
        if (!"remote".equals(value) && !"local".equals(value)) {
            return "remote";
        }
        return value;
    }

    private String normalizePath(String path) {
        String p = path.trim();
        if (!p.startsWith("/")) {
            p = "/" + p;
        }
        return p;
    }

    private String maskApiKey(String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            return "";
        }
        int keep = Math.min(4, apiKey.length());
        return "*".repeat(Math.max(0, apiKey.length() - keep)) + apiKey.substring(apiKey.length() - keep);
    }
}
