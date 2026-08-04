package com.smartsms.ai.service;

import com.smartsms.ai.config.AiProperties;
import com.smartsms.ai.dto.ChatResponse;
import com.smartsms.ai.provider.AiProvider;
import com.smartsms.ai.repository.ChatMessageRepository;
import com.smartsms.ai.repository.ChatSessionRepository;
import com.smartsms.student.repository.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AiProxyServiceTest {

    @Mock
    private StudentRepository studentRepository;
    @Mock
    private ChatSessionRepository chatSessionRepository;
    @Mock
    private ChatMessageRepository chatMessageRepository;
    @Mock
    private AiProvider aiProvider;
    @Mock
    private AiConfigService aiConfigService;

    private AiProperties properties;
    private AiProxyService service;

    @BeforeEach
    void setUp() {
        properties = new AiProperties();
        properties.setProvider("remote");

        when(aiProvider.name()).thenReturn("remote");
        service = new AiProxyService(
                properties,
                List.of(aiProvider),
                studentRepository,
                chatSessionRepository,
                chatMessageRepository,
                aiConfigService
        );
    }

    @Test
    void testChat_SuccessfulResponse() {
        // Arrange
        String message = "Hello";
        String aiReply = "Hi there!";

        // Mock repository saves
        when(chatSessionRepository.save(any())).thenAnswer(invocation -> {
            com.smartsms.ai.entity.ChatSession s = invocation.getArgument(0);
            s.setId("test-session-id");
            return s;
        });
        when(chatMessageRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        when(aiProvider.chat(anyList(), eq(message), isNull())).thenReturn(aiReply);

        // Act
        ChatResponse response = service.chat(message, null, "user1", null);

        // Assert
        assertTrue(response.success(), "Response should be successful but was: " + response.response());
        assertEquals(aiReply, response.response());
        assertEquals("test-session-id", response.sessionId());
        verify(chatMessageRepository, atLeastOnce()).save(any());
        verify(chatSessionRepository, atLeastOnce()).save(any());
    }

    @Test
    void testChat_NoProviderAvailable() {
        // Arrange
        service = new AiProxyService(
                properties,
                List.of(),
                studentRepository,
                chatSessionRepository,
                chatMessageRepository,
                aiConfigService
        );
        when(chatSessionRepository.save(any())).thenAnswer(invocation -> {
            com.smartsms.ai.entity.ChatSession s = invocation.getArgument(0);
            s.setId("test-session-id");
            return s;
        });
        when(chatMessageRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        ChatResponse response = service.chat("Hello", null);

        // Assert
        assertFalse(response.success());
        assertTrue(response.response().contains("No AI provider"));
    }
}
