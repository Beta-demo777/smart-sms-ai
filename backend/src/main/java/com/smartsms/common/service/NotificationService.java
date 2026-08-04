package com.smartsms.common.service;

import lombok.extern.slf4j.Slf4j;
import com.smartsms.common.entity.Notification;
import com.smartsms.common.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class NotificationService {
    
    private final NotificationRepository notificationRepository;
    private final JdbcTemplate jdbcTemplate;
    private volatile boolean typeConstraintEnsured = false;
    
    public List<Notification> getAllNotifications() {
        return notificationRepository.findAllByOrderByCreatedAtDesc();
    }

    public Notification createNotification(String userId, String targetRole, String title, String message, Notification.NotificationType type) {
        ensureTypeConstraintSupportsCurrentEnum();
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setTargetRole(targetRole);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type.name());
        notification.setCreatedAt(LocalDateTime.now());

        try {
            return notificationRepository.save(notification);
        } catch (Exception ex) {
            log.warn("Create notification with type {} failed, fallback to INFO: {}", type, ex.getMessage());
            notification.setType(Notification.NotificationType.INFO.name());
            return notificationRepository.save(notification);
        }
    }

    private void ensureTypeConstraintSupportsCurrentEnum() {
        if (typeConstraintEnsured) return;
        synchronized (this) {
            if (typeConstraintEnsured) return;
            try {
                List<String> checkConstraints = jdbcTemplate.queryForList(
                        """
                        SELECT c.conname
                        FROM pg_constraint c
                        JOIN pg_class t ON c.conrelid = t.oid
                        WHERE t.relname = 'notifications'
                          AND c.contype = 'c'
                          AND pg_get_constraintdef(c.oid) ILIKE '%type%'
                        """,
                        String.class
                );
                for (String conName : checkConstraints) {
                    jdbcTemplate.execute("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS \"" + conName + "\"");
                }

                String allowedValues = Arrays.stream(Notification.NotificationType.values())
                        .map(v -> "'" + v.name() + "'")
                        .collect(Collectors.joining(", "));
                jdbcTemplate.execute(
                        "ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (" + allowedValues + "))"
                );
                typeConstraintEnsured = true;
            } catch (Exception ex) {
                // Keep service available even if DB constraint migration is skipped.
                log.warn("Skip notification type constraint ensure: {}", ex.getMessage());
            }
        }
    }
    
    public List<Notification> getUserNotifications(String userId, String role) {
        try {
            return notificationRepository.findAvailableNotifications(userId, role);
        } catch (Exception e) {
            log.error("Failed to fetch notifications for user: {}, role: {}", userId, role, e);
            throw e;
        }
    }
    
    public List<Notification> getUnreadNotifications(String userId, String role) {
        return notificationRepository.findUnreadAvailableNotifications(userId, role);
    }
    
    public void markAsRead(String id) {
        notificationRepository.findById(id).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }
    
    public void markAllAsRead(String userId, String role) {
        List<Notification> unread = notificationRepository.findUnreadAvailableNotifications(userId, role);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    public void deleteNotification(String id) {
        notificationRepository.deleteById(id);
    }
}
