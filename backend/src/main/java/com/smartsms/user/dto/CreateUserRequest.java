package com.smartsms.user.dto;

import com.smartsms.user.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateUserRequest(
    @NotBlank(message = "姓名不能为空")
    String name,
    
    @NotBlank(message = "用户名（学号/工号）不能为空")
    String username,
    
    @Email(message = "邮箱格式不正确")
    String email,
    
    @NotBlank(message = "密码不能为空")
    String password,
    
    @NotNull(message = "角色不能为空")
    Role role,
    
    String avatar
) {}
