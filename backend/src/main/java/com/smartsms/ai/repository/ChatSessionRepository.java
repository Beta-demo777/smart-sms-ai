package com.smartsms.ai.repository;

import com.smartsms.ai.entity.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, String> {
    @EntityGraph(attributePaths = "messages")
    List<ChatSession> findByUserIdOrderByLastMessageAtDesc(String userId);
    @EntityGraph(attributePaths = "messages")
    List<ChatSession> findByUserIdInOrderByLastMessageAtDesc(List<String> userIds);
}
