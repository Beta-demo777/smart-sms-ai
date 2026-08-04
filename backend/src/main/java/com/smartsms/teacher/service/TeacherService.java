package com.smartsms.teacher.service;

import com.smartsms.common.exception.BadRequestException;
import com.smartsms.common.exception.ResourceNotFoundException;
import com.smartsms.teacher.dto.CreateTeacherRequest;
import com.smartsms.teacher.dto.TeacherDto;
import com.smartsms.teacher.dto.UpdateTeacherRequest;
import com.smartsms.teacher.entity.Teacher;
import com.smartsms.teacher.entity.TeacherStatus;
import com.smartsms.teacher.repository.TeacherRepository;
import com.smartsms.user.entity.Role;
import com.smartsms.common.util.AvatarUtil;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class TeacherService {

    private final TeacherRepository teacherRepository;
    private final com.smartsms.user.repository.UserRepository userRepository;
    private final com.smartsms.user.service.UserService userService;

    public TeacherService(TeacherRepository teacherRepository,
                          com.smartsms.user.repository.UserRepository userRepository,
                          com.smartsms.user.service.UserService userService) {
        this.teacherRepository = teacherRepository;
        this.userRepository = userRepository;
        this.userService = userService;
    }

    public Page<TeacherDto> getAllTeachers(Pageable pageable) {
        return teacherRepository.findAllByUserRoleOrNoUser(Role.TEACHER, pageable).map(this::toDto);
    }

    public Page<TeacherDto> getTeachersByStatus(String status, Pageable pageable) {
        return teacherRepository.findByStatusAndUserRoleOrNoUser(
                TeacherStatus.fromValue(status),
                Role.TEACHER,
                pageable
        ).map(this::toDto);
    }

    public Page<TeacherDto> getTeachersByDepartment(String department, Pageable pageable) {
        return teacherRepository.findByDepartmentAndUserRoleOrNoUser(
                department,
                Role.TEACHER,
                pageable
        ).map(this::toDto);
    }

    public Page<TeacherDto> searchTeachers(String keyword, Pageable pageable) {
        return teacherRepository.searchByKeywordAndUserRoleOrNoUser(
                keyword,
                Role.TEACHER,
                pageable
        ).map(this::toDto);
    }

    public List<String> getAllDepartments() {
        return teacherRepository.findAllDepartmentsByUserRoleOrNoUser(Role.TEACHER).stream()
                .filter(department -> department != null && !department.isBlank())
                .distinct()
                .collect(Collectors.toList());
    }

    public TeacherDto getTeacherById(String id) {
        Teacher teacher = teacherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", id));
        return toDto(teacher);
    }

    public TeacherDto createTeacher(CreateTeacherRequest request) {
        if (request.teacherNumber() != null && !request.teacherNumber().isBlank() && teacherRepository.existsByTeacherNumber(request.teacherNumber())) {
            throw new BadRequestException("Teacher number already exists: " + request.teacherNumber());
        }
        if (request.email() != null && !request.email().isBlank() && teacherRepository.existsByEmail(request.email())) {
            throw new BadRequestException("Email already exists: " + request.email());
        }

        Teacher teacher = new Teacher();
        teacher.setName(request.name());
        teacher.setTeacherNumber(request.teacherNumber());
        teacher.setTitle(request.title());
        teacher.setDepartment(request.department());
        teacher.setEmail(request.email());
        teacher.setPhone(request.phone());
        teacher.setStatus(request.status() != null ? TeacherStatus.fromValue(request.status()) : TeacherStatus.ACTIVE);
        String teacherAvatar = (request.avatar() == null || request.avatar().isBlank())
                ? AvatarUtil.defaultAvatar(request.teacherNumber() != null ? request.teacherNumber() : request.name())
                : request.avatar();
        teacher.setAvatar(teacherAvatar);
        teacher.setJoinDate(request.joinDate() != null ? request.joinDate() : LocalDate.now());
        teacher.setResearchArea(request.researchArea());

        // Create associated user account
        com.smartsms.user.entity.User user = new com.smartsms.user.entity.User();
        user.setName(request.name());
        user.setUsername(request.teacherNumber());
        user.setEmail(request.email());
        user.setPassword(userService.encodePassword("123456")); // Default password
        user.setRole(com.smartsms.user.entity.Role.TEACHER);
        user.setAvatar(teacherAvatar);
        user.setStatus("active");
        user = userRepository.save(user);
        
        teacher.setUser(user);

        return toDto(teacherRepository.save(teacher));
    }

    public TeacherDto updateTeacher(String id, UpdateTeacherRequest request) {
        Teacher teacher = teacherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", id));

        if (request.name() != null) teacher.setName(request.name());
        if (request.teacherNumber() != null && !request.teacherNumber().isBlank() && !request.teacherNumber().equals(teacher.getTeacherNumber())) {
            if (teacherRepository.existsByTeacherNumber(request.teacherNumber())) {
                throw new BadRequestException("Teacher number already exists: " + request.teacherNumber());
            }
            teacher.setTeacherNumber(request.teacherNumber());
        }
        if (request.title() != null) teacher.setTitle(request.title());
        if (request.department() != null) teacher.setDepartment(request.department());
        if (request.email() != null && !request.email().isBlank() && !request.email().equals(teacher.getEmail())) {
            if (teacherRepository.existsByEmail(request.email())) {
                throw new BadRequestException("Email already exists: " + request.email());
            }
            teacher.setEmail(request.email());
        }
        if (request.phone() != null) teacher.setPhone(request.phone());
        if (request.status() != null) teacher.setStatus(TeacherStatus.fromValue(request.status()));
        if (request.avatar() != null) teacher.setAvatar(request.avatar());
        if (request.joinDate() != null) teacher.setJoinDate(request.joinDate());
        if (request.researchArea() != null) teacher.setResearchArea(request.researchArea());

        // Sync with associated user
        if (teacher.getUser() != null) {
            com.smartsms.user.entity.User user = teacher.getUser();
            if (request.name() != null) user.setName(request.name());
            if (request.teacherNumber() != null) user.setUsername(request.teacherNumber());
            if (request.email() != null) user.setEmail(request.email());
            if (request.avatar() != null) user.setAvatar(request.avatar());
            userRepository.save(user);
        }

        return toDto(teacherRepository.save(teacher));
    }

    public void deleteTeacher(String id) {
        Teacher teacher = teacherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", id));
        
        // Delete associated user account
        if (teacher.getUser() != null) {
            userRepository.delete(teacher.getUser());
        }
        
        teacherRepository.delete(teacher);
    }

    private TeacherDto toDto(Teacher teacher) {
        return new TeacherDto(
                teacher.getId(),
                teacher.getTeacherNumber(),
                teacher.getName(),
                teacher.getTitle(),
                teacher.getDepartment(),
                teacher.getEmail(),
                teacher.getPhone(),
                teacher.getStatus().getValue(),
                teacher.getAvatar(),
                teacher.getJoinDate() != null ? teacher.getJoinDate().toString() : null,
                teacher.getResearchArea()
        );
    }
}
