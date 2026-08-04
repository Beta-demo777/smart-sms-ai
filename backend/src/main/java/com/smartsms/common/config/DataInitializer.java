package com.smartsms.common.config;

import com.smartsms.user.entity.Role;
import com.smartsms.user.entity.User;
import com.smartsms.user.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

// @Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        // 创建测试用户: 用户名(学号/工号), 密码, 姓名, 邮箱, 角色
        createTestUserIfNotExists("admin001", "123456", "管理员", "admin@admin.com", Role.ADMIN);
        createTestUserIfNotExists("T20240001", "123456", "李老师", "teacher@teacher.com", Role.TEACHER);
        createTestUserIfNotExists("S20240001", "123456", "张同学", "student@student.com", Role.STUDENT);
    }

    private void createTestUserIfNotExists(String username, String password, String name, String email, Role role) {
        if (userRepository.findByUsername(username).isEmpty()) {
            User user = new User(name, username, email, passwordEncoder.encode(password), role);
            userRepository.save(user);
        }
    }
}
