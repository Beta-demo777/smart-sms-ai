package com.smartsms.user.service;

import com.smartsms.common.exception.BadRequestException;
import com.smartsms.common.exception.ResourceNotFoundException;
import com.smartsms.user.dto.CreateUserRequest;
import com.smartsms.user.dto.UpdateUserRequest;
import com.smartsms.user.dto.UserDto;
import com.smartsms.user.entity.Role;
import com.smartsms.user.entity.User;
import com.smartsms.user.repository.UserRepository;
import com.smartsms.common.util.AvatarUtil;
import com.smartsms.activity.service.ActivityService;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.smartsms.user.event.UserCreatedEvent;
import com.smartsms.user.event.UserUpdatedEvent;
import com.smartsms.student.repository.StudentRepository;
import com.smartsms.student.service.StudentService;
import com.smartsms.teacher.repository.TeacherRepository;
import org.springframework.context.annotation.Lazy;

import java.time.Instant;

@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher eventPublisher;
    private final StudentRepository studentRepository;
    private final StudentService studentService;
    private final TeacherRepository teacherRepository;
    private final ActivityService activityService;

    public UserService(UserRepository userRepository, 
                       PasswordEncoder passwordEncoder, 
                       ApplicationEventPublisher eventPublisher,
                       StudentRepository studentRepository,
                       @Lazy StudentService studentService,
                       TeacherRepository teacherRepository,
                       ActivityService activityService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.eventPublisher = eventPublisher;
        this.studentRepository = studentRepository;
        this.studentService = studentService;
        this.teacherRepository = teacherRepository;
        this.activityService = activityService;
    }

    public String encodePassword(String password) {
        return passwordEncoder.encode(password);
    }

    public Page<UserDto> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::toDto);
    }

    public Page<UserDto> getUsersByRole(Role role, Pageable pageable) {
        return userRepository.findByRole(role, pageable).map(this::toDto);
    }

    public Page<UserDto> searchUsers(String keyword, Pageable pageable) {
        return userRepository.searchByKeyword(keyword, pageable).map(this::toDto);
    }

    public UserDto getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return toDto(user);
    }

    public UserDto getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        return toDto(user);
    }

    public UserDto getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));
        return toDto(user);
    }

    public UserDto createUser(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new BadRequestException("用户名已存在: " + request.username());
        }
        if (request.email() != null && userRepository.existsByEmail(request.email())) {
            throw new BadRequestException("邮箱已存在: " + request.email());
        }

        User user = new User();
        user.setName(request.name());
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(request.role());
        String avatar = (request.avatar() == null || request.avatar().isBlank())
                ? AvatarUtil.defaultAvatar(request.username())
                : request.avatar();
        user.setAvatar(avatar);
        user.setStatus("active");

        User savedUser = userRepository.save(user);
        eventPublisher.publishEvent(new UserCreatedEvent(this, savedUser));
        return toDto(savedUser);
    }

    public UserDto updateUser(String id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        Role oldRole = user.getRole();
        String oldStatus = user.getStatus();
        boolean passwordChanged = request.password() != null;

        if (request.name() != null) user.setName(request.name());
        if (request.username() != null && !request.username().equals(user.getUsername())) {
             if (userRepository.existsByUsername(request.username())) {
                 throw new BadRequestException("Username already exists: " + request.username());
             }
             user.setUsername(request.username());
        }
        if (request.email() != null && !request.email().equals(user.getEmail())) {
            // Only check for uniqueness if the new email is NOT empty/null
            if (request.email() != null && !request.email().trim().isEmpty() && userRepository.existsByEmail(request.email())) {
                throw new BadRequestException("Email already exists: " + request.email());
            }
            // If email is empty or blank, set it to null to avoid database unique constraint violation on empty strings
            if (request.email() == null || request.email().trim().isEmpty()) {
                user.setEmail(null);
            } else {
                user.setEmail(request.email());
            }
        }
        if (request.password() != null) {
            user.setPassword(passwordEncoder.encode(request.password()));
        }
        if (request.role() != null) user.setRole(request.role());
        if (request.avatar() != null) user.setAvatar(request.avatar());
        if (request.status() != null) user.setStatus(request.status());

        User savedUser = userRepository.save(user);
        eventPublisher.publishEvent(new UserUpdatedEvent(this, savedUser));

        String actor = resolveCurrentUsername();
        if (request.role() != null && oldRole != null && request.role() != oldRole) {
            activityService.logActivity(actor, "USER_ROLE_CHANGE", "userId=" + user.getId() + " oldRole=" + oldRole.getValue() + " newRole=" + request.role().getValue(), "security", "warning");
        }
        if (request.status() != null && oldStatus != null && !request.status().equalsIgnoreCase(oldStatus)) {
            activityService.logActivity(actor, "USER_STATUS_CHANGE", "userId=" + user.getId() + " oldStatus=" + oldStatus + " newStatus=" + request.status(), "security", "warning");
        }
        if (passwordChanged) {
            activityService.logActivity(actor, "USER_PASSWORD_RESET", "userId=" + user.getId(), "security", "warning");
        }

        return toDto(savedUser);
    }

    public void deleteUser(String id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User", "id", id);
        }
        
        // Check if user is a student and delete via StudentService to handle dependencies
        studentRepository.findByUserId(id).ifPresentOrElse(
            student -> studentService.deleteStudent(student.getId()),
            () -> userRepository.deleteById(id)
        );
    }

    public void updateLastLogin(String username) {
        userRepository.findByUsername(username).ifPresent(user -> {
            user.setLastLogin(Instant.now());
            userRepository.save(user);
        });
    }

    private String resolveCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return "anonymous";
        }
        return authentication.getName();
    }

    private UserDto toDto(User user) {
        // Resolve the linked student or teacher entity ID for the profile
        String profileId = null;
        if (user.getRole() != null) {
            String roleVal = user.getRole().getValue().toLowerCase();
            if ("student".equals(roleVal)) {
                profileId = studentRepository.findByUserId(user.getId())
                        .map(s -> s.getId())
                        .orElse(null);
            } else if ("teacher".equals(roleVal) || "admin".equals(roleVal)) {
                profileId = teacherRepository.findByUserId(user.getId())
                        .map(t -> t.getId())
                        .orElse(null);
            }
        }
        return new UserDto(
                user.getId(),
                user.getName(),
                user.getUsername(),
                user.getEmail(),
                user.getRole().getValue(),
                user.getAvatar(),
                user.getStatus(),
                user.getLastLogin(),
                profileId
        );
    }
}
