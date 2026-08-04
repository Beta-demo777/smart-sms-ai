package com.smartsms.ai.controller;

import com.smartsms.ai.dto.ChatRequest;
import com.smartsms.ai.dto.ChatResponse;
import com.smartsms.ai.dto.RenameSessionRequest;
import com.smartsms.ai.dto.ReportRequest;
import com.smartsms.ai.entity.ChatSession;
import com.smartsms.ai.service.AiRoleQueryService;
import com.smartsms.ai.service.AiProxyService;
import com.smartsms.activity.service.ActivityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/ai")
@Tag(name = "AI", description = "AI 服务接口")
public class AiController {

    private final AiProxyService aiProxyService;
    private final AiRoleQueryService aiRoleQueryService;
    private final ActivityService activityService;

    public AiController(AiProxyService aiProxyService,
                        AiRoleQueryService aiRoleQueryService,
                        ActivityService activityService) {
        this.aiProxyService = aiProxyService;
        this.aiRoleQueryService = aiRoleQueryService;
        this.activityService = activityService;
    }

    @PostMapping("/chat")
    @Operation(summary = "AI 对话", description = "与 AI 助手对话 (支持上下文记忆)")
    public ResponseEntity<ChatResponse> chat(@Valid @RequestBody ChatRequest request, Authentication authentication) {
        // userId: prefer request.userId(), fallback to "anonymous" or implicit from context
        String userId = resolveUserId(authentication, request.userId());
        boolean forceToolFirst = aiRoleQueryService.shouldForceToolFirst(request.message());
        boolean analysisIntent = aiRoleQueryService.shouldGenerateAnalysis(request.message());

        if (forceToolFirst) {
            var strictReply = aiRoleQueryService.buildStrictReplyIfNeeded(request.message(), authentication);
            ChatResponse response = strictReply.map(reply -> {
                        if (analysisIntent) {
                            String analysisContext = String.join("\n\n",
                                    "你是校园系统AI助手。请基于已查询到的真实数据给出简洁分析结论。",
                                    "必须遵循：只能引用已给出的数据，不得编造；若样本不足，请明确说明局限性。",
                                    "输出建议：先给2-3条核心发现，再给1-3条可执行建议。",
                                    "已查询到的真实数据：\n" + reply
                            );
                            ChatResponse generated = aiProxyService.chat(
                                    request.message(),
                                    analysisContext,
                                    userId,
                                    request.sessionId()
                            );
                            if (generated.success()
                                    && !aiRoleQueryService.isConflictingWithFacts(generated.response(), reply)) {
                                return generated;
                            }
                        }
                        return aiProxyService.chatWithFixedReply(
                                request.message(),
                                reply,
                                userId,
                                request.sessionId());
                    })
                    .orElseGet(() -> aiProxyService.chatWithFixedReply(
                            request.message(),
                            "当前会话未识别到可用身份信息，暂时无法查询你的个人实时数据。请重新登录后再试。",
                            userId,
                            request.sessionId()));
            activityService.logActivity(userId, "AI_CHAT_TOOL_FORCE", "/ai/chat", "ai", "success");
            return ResponseEntity.ok(response);
        }

        var strictReply = aiRoleQueryService.buildStrictReplyIfNeeded(request.message(), authentication);
        boolean identityIntent = isIdentityQuestion(request.message());

        if (identityIntent || strictReply.isPresent()) {
            List<String> groundedFacts = new ArrayList<>();
            if (identityIntent) {
                groundedFacts.add("系统身份：我是 Smart-SMS 智能校园助手，负责基于当前系统数据与规则提供学习与教务支持。");
            }
            strictReply.ifPresent(groundedFacts::add);

            String groundedContext = String.join("\n\n",
                    "你是校园系统AI助手。请将“已查询到的真实数据”整理为自然、简洁、友好的中文回答。",
                    "严格要求：只能使用已查询到的数据，不得补充不存在的事实；若信息不足请明确说明。",
                    "禁止说“我还可以查询xxx”这类超出当前可查询范围的承诺，回答范围仅限输入中已经给出的可查询范围提示。",
                    "回答风格要求：不要使用固定开场白（如“根据系统实时数据”）；首句应直接回应用户问题，措辞可自然变化。",
                    "表达要求：默认 2-4 句，只有在用户明确要求列表时才使用列表。",
                    "已查询到的真实数据：\n" + String.join("\n\n", groundedFacts)
            );

            ChatResponse response = aiProxyService.chat(
                    request.message(),
                    groundedContext,
                    userId,
                    request.sessionId()
            );

            // Fallback: if model unavailable, return deterministic data response to avoid hallucination.
            if (!response.success()) {
                response = aiProxyService.chatWithFixedReply(
                        request.message(),
                        String.join("\n\n", groundedFacts),
                        userId,
                        request.sessionId()
                );
            } else if (strictReply.isPresent()
                    && aiRoleQueryService.isConflictingWithFacts(response.response(), strictReply.get())) {
                // If generated text contradicts known facts, force deterministic grounded reply.
                response = aiProxyService.chatWithFixedReply(
                        request.message(),
                        strictReply.get(),
                        userId,
                        request.sessionId()
                );
            }
            activityService.logActivity(userId, identityIntent ? "AI_CHAT_MIXED" : "AI_CHAT_TOOL", "/ai/chat", "ai", "success");
            return ResponseEntity.ok(response);
        }
        
        String enrichedContext = aiRoleQueryService.enrichContext(request.context(), request.message(), authentication);

        ChatResponse response = aiProxyService.chat(
            request.message(), 
            enrichedContext,
            userId, 
            request.sessionId()
        );
        activityService.logActivity(userId, "AI_CHAT", "/ai/chat", "ai", "success");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/sessions")
    @Operation(summary = "获取会话列表", description = "获取用户的历史对话列表")
    public ResponseEntity<List<ChatSession>> getUserSessions(@RequestParam(required = false, defaultValue = "anonymous") String userId,
                                                             Authentication authentication) {
        List<String> userIds = new ArrayList<>();
        if (userId != null && !userId.isBlank() && !"anonymous".equalsIgnoreCase(userId)) {
            userIds.add(userId);
        }
        if (authentication != null && authentication.isAuthenticated()) {
            String authName = authentication.getName();
            if (authName != null && !authName.isBlank() && !userIds.contains(authName)) {
                userIds.add(authName);
            }
        }
        if (userIds.isEmpty()) {
            userIds.add("anonymous");
        }

        List<ChatSession> sessions = userIds.size() == 1
                ? aiProxyService.getUserSessions(userIds.get(0))
                : aiProxyService.getUserSessions(userIds);

        activityService.logActivity(userIds.get(0), "AI_SESSIONS", "/ai/sessions", "ai", "info");
        return ResponseEntity.ok(sessions);
    }

    @PatchMapping("/sessions/{sessionId}/title")
    @Operation(summary = "重命名会话", description = "重命名当前用户的会话标题")
    public ResponseEntity<Void> renameSession(@PathVariable String sessionId,
                                              @Valid @RequestBody RenameSessionRequest request,
                                              Authentication authentication) {
        String userId = resolveUserId(authentication, request.userId());
        aiProxyService.renameSession(sessionId, request.title(), userId);
        activityService.logActivity(userId, "AI_SESSION_RENAME", "/ai/sessions/" + sessionId + "/title", "ai", "success");
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/sessions/{sessionId}")
    @Operation(summary = "删除会话", description = "删除当前用户的会话记录")
    public ResponseEntity<Void> deleteSession(@PathVariable String sessionId,
                                              @RequestParam(required = false) String userId,
                                              Authentication authentication) {
        String requesterId = resolveUserId(authentication, userId);
        aiProxyService.deleteSession(sessionId, requesterId);
        activityService.logActivity(requesterId, "AI_SESSION_DELETE", "/ai/sessions/" + sessionId, "ai", "success");
        return ResponseEntity.noContent().build();
    }
    
    @PostMapping("/report")
    @Operation(summary = "生成学生报告", description = "使用 AI 生成学生学业分析报告")
    public ResponseEntity<ChatResponse> generateReport(@Valid @RequestBody ReportRequest request, Authentication authentication) {
        ChatResponse response = aiProxyService.generateStudentReport(request.studentId());
        String userId = resolveUserId(authentication, null);
        activityService.logActivity(userId, "AI_REPORT", "studentId=" + request.studentId(), "ai", "success");
        return ResponseEntity.ok(response);
    }

    private String resolveUserId(Authentication authentication, String fallbackUserId) {
        if (fallbackUserId != null && !fallbackUserId.isBlank()) {
            return fallbackUserId;
        }
        if (authentication != null && authentication.isAuthenticated()) {
            return authentication.getName();
        }
        return "anonymous";
    }

    private boolean isIdentityQuestion(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }
        String text = message.toLowerCase(Locale.ROOT);
        return text.contains("你是谁")
                || text.contains("你是什么")
                || text.contains("你来自")
                || text.contains("你是哪个模型")
                || text.contains("who are you")
                || text.contains("what model")
                || text.contains("which model");
    }
}
