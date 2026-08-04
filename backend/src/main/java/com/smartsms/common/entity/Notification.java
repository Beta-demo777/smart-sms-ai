package com.smartsms.common.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Locale;

@Data
@NoArgsConstructor
@Entity
@Table(name = "notifications")
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    // target specific user
    private String userId;

    // target specific role (STUDENT, TEACHER, ADMIN) or null for all
    private String targetRole;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private boolean read = false;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum NotificationType {
        TEACHING,
        EXAM,
        STUDENT_AFFAIRS,
        ACTIVITY,
        MAINTENANCE,
        EMERGENCY,
        INFO,
        SUCCESS,
        WARNING,
        ERROR;

        public static NotificationType fromValue(String raw) {
            if (raw == null || raw.isBlank()) {
                return INFO;
            }
            try {
                return NotificationType.valueOf(raw.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ex) {
                return INFO;
            }
        }
    }
}
