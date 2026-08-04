package com.smartsms.user.controller;

import com.smartsms.security.dto.LoginRequest;
import com.smartsms.security.dto.LoginResponse;
import com.smartsms.security.jwt.JwtProperties;
import com.smartsms.security.jwt.JwtTokenProvider;
import com.smartsms.user.dto.CreateUserRequest;
import com.smartsms.user.dto.UserDto;
import com.smartsms.user.service.UserService;
import com.smartsms.activity.service.ActivityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@Tag(name = "Authentication", description = "认证相关接口")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;
    private final UserService userService;
    private final ActivityService activityService;

    public AuthController(AuthenticationManager authenticationManager,
                          JwtTokenProvider jwtTokenProvider,
                          JwtProperties jwtProperties,
                          UserService userService,
                          ActivityService activityService) {
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
        this.jwtProperties = jwtProperties;
        this.userService = userService;
        this.activityService = activityService;
    }

    @PostMapping("/login")
    @Operation(summary = "用户登录", description = "使用学号/工号和密码登录")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request,HttpServletResponse response) {
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.username(), request.password())
            );
        } catch (AuthenticationException ex) {
            activityService.logActivity(request.username(), "LOGIN_FAILED", "/auth/login", "auth", "error");
            throw ex;
        }

        String token = jwtTokenProvider.generateToken(authentication);
        
        Cookie cookie = new Cookie(jwtProperties.getCookieName(), token);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(jwtProperties.getCookieMaxAge());
        response.addCookie(cookie);

        userService.updateLastLogin(request.username());
        UserDto user = userService.getUserByUsername(request.username());
        activityService.logActivity(request.username(), "LOGIN", "/auth/login", "auth", "success");

        return ResponseEntity.ok(new LoginResponse(token, user));
    }

    @PostMapping("/register")
    @Operation(summary = "用户注册", description = "注册新用户")
    public ResponseEntity<UserDto> register(@Valid @RequestBody CreateUserRequest request) {
        UserDto user = userService.createUser(request);
        return ResponseEntity.ok(user);
    }

    @PostMapping("/logout")
    @Operation(summary = "用户登出", description = "清除登录状态")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        String username = resolveCurrentUsername();
        Cookie cookie = new Cookie(jwtProperties.getCookieName(), null);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        activityService.logActivity(username, "LOGOUT", "/auth/logout", "auth", "success");
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    @Operation(summary = "获取当前用户", description = "获取当前登录用户信息")
    public ResponseEntity<UserDto> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        UserDto user = userService.getUserByUsername(authentication.getName());
        return ResponseEntity.ok(user);
    }

    private String resolveCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return "anonymous";
        }
        return authentication.getName();
    }
}
