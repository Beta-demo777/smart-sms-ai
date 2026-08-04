package com.smartsms.user.dto;

import com.smartsms.user.entity.Role;

public record UpdateUserRequest(
    String name,
    String username,
    String email,
    String password,
    Role role,
    String avatar,
    String status
) {}
