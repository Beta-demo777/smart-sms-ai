package com.smartsms.user.dto;

import java.time.Instant;

public record UserDto(
    String id,
    String name,
    String username,
    String email,
    String role,
    String avatar,
    String status,
    Instant lastLogin,
    String profileId    // studentId or teacherId depending on role; null for admin
) {}
