package com.smartsms.security.dto;

import com.smartsms.user.dto.UserDto;

public record LoginResponse(
    String token,
    UserDto user
) {}
