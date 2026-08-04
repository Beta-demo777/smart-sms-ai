package com.smartsms.ai.controller;

import com.smartsms.activity.service.ActivityService;
import com.smartsms.ai.dto.AiConfigResponse;
import com.smartsms.ai.dto.AiConfigUpdateRequest;
import com.smartsms.ai.service.AiConfigService;
import com.smartsms.ai.service.AiProxyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/admin/ai-config")
@Tag(name = "AI Config", description = "AI 本地/云端配置管理")
@PreAuthorize("hasRole('ADMIN')")
public class AdminAiConfigController {

    private final AiConfigService aiConfigService;
    private final AiProxyService aiProxyService;
    private final ActivityService activityService;

    public AdminAiConfigController(AiConfigService aiConfigService,
                                   AiProxyService aiProxyService,
                                   ActivityService activityService) {
        this.aiConfigService = aiConfigService;
        this.aiProxyService = aiProxyService;
        this.activityService = activityService;
    }

    @GetMapping
    @Operation(summary = "获取 AI 配置", description = "获取当前生效的 AI 提供方和本地模型配置")
    public ResponseEntity<AiConfigResponse> getConfig() {
        return ResponseEntity.ok(aiConfigService.getEffectiveConfig());
    }

    @PutMapping
    @Operation(summary = "更新 AI 配置", description = "更新 AI 提供方和本地模型参数，并立即生效")
    public ResponseEntity<AiConfigResponse> updateConfig(@RequestBody AiConfigUpdateRequest request,
                                                         Authentication authentication) {
        AiConfigResponse response = aiConfigService.updateConfig(request);
        String username = authentication != null && authentication.isAuthenticated() ? authentication.getName() : "anonymous";
        activityService.logActivity(username, "AI_CONFIG_UPDATE", "/admin/ai-config", "ai", "success");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/test")
    @Operation(summary = "测试 AI 连接", description = "测试当前配置下 AI 服务是否可用")
    public ResponseEntity<Map<String, Object>> testConnection(Authentication authentication) {
        aiConfigService.applyPersistedConfig();
        String reply = aiProxyService.testCurrentProvider();
        AiConfigResponse config = aiConfigService.getEffectiveConfig();
        String activeProvider = aiProxyService.currentProviderName();
        String username = authentication != null && authentication.isAuthenticated() ? authentication.getName() : "anonymous";
        activityService.logActivity(username, "AI_CONFIG_TEST", "/admin/ai-config/test", "ai", "success");
        return ResponseEntity.ok(Map.of(
                "ok", reply != null && !reply.isBlank(),
                "message", "测试请求已完成",
                "reply", reply,
                "provider", activeProvider,
                "config", config
        ));
    }
}
