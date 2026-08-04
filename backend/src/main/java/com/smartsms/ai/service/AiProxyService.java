package com.smartsms.ai.service;

import com.smartsms.ai.config.AiProperties;
import com.smartsms.ai.dto.ChatResponse;
import com.smartsms.ai.entity.ChatMessage;
import com.smartsms.ai.entity.ChatSession;
import com.smartsms.ai.provider.AiProvider;
import com.smartsms.ai.provider.AiProviderMessage;
import com.smartsms.ai.repository.ChatMessageRepository;
import com.smartsms.ai.repository.ChatSessionRepository;
import com.smartsms.common.exception.ResourceNotFoundException;
import com.smartsms.student.entity.Student;
import com.smartsms.student.repository.StudentRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AiProxyService {

    private final AiProperties aiProperties;
    private final Map<String, AiProvider> providerMap;
    private final StudentRepository studentRepository;
    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final AiConfigService aiConfigService;

    public AiProxyService(AiProperties aiProperties,
                          List<AiProvider> providers,
                          StudentRepository studentRepository,
                          ChatSessionRepository chatSessionRepository,
                          ChatMessageRepository chatMessageRepository,
                          AiConfigService aiConfigService) {
        this.aiProperties = aiProperties;
        this.providerMap = providers.stream()
                .collect(Collectors.toMap(
                        p -> p.name().toLowerCase(),
                        Function.identity(),
                        (existing, replacement) -> existing
                ));
        this.studentRepository = studentRepository;
        this.chatSessionRepository = chatSessionRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.aiConfigService = aiConfigService;
    }

    @Transactional
    public ChatResponse chat(String message, String context, String userId, String sessionId) {
        aiConfigService.applyPersistedConfig();
        ChatSession session;
        List<ChatMessage> history = new ArrayList<>();

        // 1. Resolve Session
        if (sessionId != null && !sessionId.isBlank()) {
            session = chatSessionRepository.findById(sessionId)
                    .orElseThrow(() -> new ResourceNotFoundException("ChatSession", "id", sessionId));
            history = chatMessageRepository.findBySessionIdOrderByTimestampAsc(sessionId);
        } else {
            session = new ChatSession();
            session.setUserId(userId != null ? userId : "anonymous");
            session.setTitle(message.length() > 20 ? message.substring(0, 20) + "..." : message);
            session = chatSessionRepository.save(session);
        }

        // 2. Save user message immediately to persist history even if AI fails
        ChatMessage userMsg = new ChatMessage();
        userMsg.setSession(session);
        userMsg.setRole(ChatMessage.Role.USER);
        userMsg.setContent(message);
        userMsg.setTimestamp(LocalDateTime.now());
        chatMessageRepository.save(userMsg);

        session.setLastMessageAt(LocalDateTime.now());
        chatSessionRepository.save(session);

        // 3. Route to selected AI provider
        List<AiProviderMessage> providerHistory = history.stream()
                .map(msg -> new AiProviderMessage(
                        msg.getRole() == ChatMessage.Role.MODEL ? "assistant" : "user",
                        msg.getContent()
                ))
                .toList();

        // 4. Call API
        try {
            String aiReply = resolveProvider().chat(providerHistory, message, context);

            // Save AI Message
            ChatMessage aiMsg = new ChatMessage();
            aiMsg.setSession(session);
            aiMsg.setRole(ChatMessage.Role.MODEL);
            aiMsg.setContent(aiReply);
            aiMsg.setTimestamp(LocalDateTime.now());
            chatMessageRepository.save(aiMsg);

            return new ChatResponse(aiReply, true, session.getId());

        } catch (Exception e) {
            return new ChatResponse("AI 服务暂时不可用: " + e.getMessage(), false, session.getId());
        }
    }

    @Transactional
    public ChatResponse chatWithFixedReply(String message, String fixedReply, String userId, String sessionId) {
        ChatSession session;
        if (sessionId != null && !sessionId.isBlank()) {
            session = chatSessionRepository.findById(sessionId)
                    .orElseThrow(() -> new ResourceNotFoundException("ChatSession", "id", sessionId));
        } else {
            session = new ChatSession();
            session.setUserId(userId != null ? userId : "anonymous");
            session.setTitle(message.length() > 20 ? message.substring(0, 20) + "..." : message);
            session = chatSessionRepository.save(session);
        }

        ChatMessage userMsg = new ChatMessage();
        userMsg.setSession(session);
        userMsg.setRole(ChatMessage.Role.USER);
        userMsg.setContent(message);
        userMsg.setTimestamp(LocalDateTime.now());
        chatMessageRepository.save(userMsg);

        ChatMessage aiMsg = new ChatMessage();
        aiMsg.setSession(session);
        aiMsg.setRole(ChatMessage.Role.MODEL);
        aiMsg.setContent(fixedReply);
        aiMsg.setTimestamp(LocalDateTime.now());
        chatMessageRepository.save(aiMsg);

        session.setLastMessageAt(LocalDateTime.now());
        chatSessionRepository.save(session);

        return new ChatResponse(fixedReply, true, session.getId());
    }

    // Backward compatibility
    public ChatResponse chat(String message, String context) {
        return chat(message, context, "anonymous", null);
    }

    @Transactional(readOnly = true)
    public ChatResponse generateStudentReport(String studentId) {
        aiConfigService.applyPersistedConfig();
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));

        String prompt = String.format(
                "System Instruction: You are a helpful assistant that MUST ALWAYS respond in Simplified Chinese (简体中文), regardless of the input language. Do not output English.\n\n" +
                "你是一个专业的教育顾问。请根据以下学生信息，用中文生成一份简短的学业分析报告（约200字）：\n" +
                "学生姓名: %s\n" +
                "班级: %s\n" +
                "GPA: %.2f\n" +
                "出勤率: %.1f%%\n" +
                "状态: %s\n\n" +
                "请分析该学生的学业表现，并给出改进建议。\n",
                student.getName(),
                student.getClazz() != null ? student.getClazz().getName() : "未分配",
                student.getGpa(),
                student.getAttendance(),
                student.getStatus().getValue()
        );

        try {
            String response = resolveProvider().complete(prompt);
            return new ChatResponse(response, true);
        } catch (Exception e) {
            return new ChatResponse("生成报告失败: " + e.getMessage(), false);
        }
    }
    
    public List<ChatSession> getUserSessions(String userId) {
        return chatSessionRepository.findByUserIdOrderByLastMessageAtDesc(userId);
    }

    public List<ChatSession> getUserSessions(List<String> userIds) {
        return chatSessionRepository.findByUserIdInOrderByLastMessageAtDesc(userIds);
    }

    @Transactional
    public void renameSession(String sessionId, String title, String requesterId) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("ChatSession", "id", sessionId));
        validateSessionOwnership(session, requesterId);

        session.setTitle(title.trim());
        chatSessionRepository.save(session);
    }

    @Transactional
    public void deleteSession(String sessionId, String requesterId) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("ChatSession", "id", sessionId));
        validateSessionOwnership(session, requesterId);
        chatSessionRepository.delete(session);
    }

    private void validateSessionOwnership(ChatSession session, String requesterId) {
        if (requesterId == null || requesterId.isBlank()) {
            throw new AccessDeniedException("无权操作该会话");
        }
        if (!session.getUserId().equals(requesterId)) {
            throw new AccessDeniedException("仅可操作自己的会话记录");
        }
    }

    private AiProvider resolveProvider() {
        String configured = aiProperties.getProvider() == null ? "remote" : aiProperties.getProvider().trim().toLowerCase();
        AiProvider provider = providerMap.get(configured);
        if (provider != null) {
            return provider;
        }

        if (Arrays.asList("ollama", "local").contains(configured)) {
            AiProvider local = providerMap.get("local");
            if (local != null) {
                return local;
            }
        }

        AiProvider remote = providerMap.get("remote");
        if (remote != null) {
            return remote;
        }
        throw new IllegalStateException("No AI provider is available");
    }

    public String testCurrentProvider() {
        aiConfigService.applyPersistedConfig();
        return resolveProvider().chat(List.of(), "请回复“连接成功”。", "AI 配置连通性测试");
    }

    public String currentProviderName() {
        aiConfigService.applyPersistedConfig();
        return resolveProvider().name();
    }
}
