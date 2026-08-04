package com.smartsms.common.repository;

import com.smartsms.common.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);
    
    @org.springframework.data.jpa.repository.Query("SELECT n FROM Notification n WHERE n.userId = :userId OR (n.userId IS NULL AND (n.targetRole IS NULL OR n.targetRole = :role)) ORDER BY n.createdAt DESC")
    List<Notification> findAvailableNotifications(@org.springframework.data.repository.query.Param("userId") String userId, @org.springframework.data.repository.query.Param("role") String role);
    
    @org.springframework.data.jpa.repository.Query("SELECT n FROM Notification n WHERE (n.userId = :userId OR (n.userId IS NULL AND (n.targetRole IS NULL OR n.targetRole = :role))) AND n.read = false ORDER BY n.createdAt DESC")
    List<Notification> findUnreadAvailableNotifications(@org.springframework.data.repository.query.Param("userId") String userId, @org.springframework.data.repository.query.Param("role") String role);

    List<Notification> findAllByOrderByCreatedAtDesc();
}
