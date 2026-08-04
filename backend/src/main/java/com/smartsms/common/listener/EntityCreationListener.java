package com.smartsms.common.listener;

import com.smartsms.student.entity.Gender;
import com.smartsms.student.entity.Student;
import com.smartsms.student.entity.StudentStatus;
import com.smartsms.student.repository.StudentRepository;
import com.smartsms.teacher.entity.Teacher;
import com.smartsms.teacher.entity.TeacherStatus;
import com.smartsms.teacher.repository.TeacherRepository;
import com.smartsms.user.entity.Role;
import com.smartsms.user.entity.User;
import com.smartsms.user.event.UserCreatedEvent;
import com.smartsms.user.event.UserUpdatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class EntityCreationListener {

    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;

    @EventListener
    @Transactional
    public void handleUserCreated(UserCreatedEvent event) {
        User user = event.getUser();
        log.info("Handling UserCreatedEvent for user: {}, role: {}", user.getUsername(), user.getRole());

        if (user.getRole() == Role.STUDENT) {
            createStudentProfile(user);
        } else if (user.getRole() == Role.TEACHER || user.getRole() == Role.ADMIN) {
            createTeacherProfile(user);
        }
    }

    @EventListener
    @Transactional
    public void handleUserUpdated(UserUpdatedEvent event) {
        User user = event.getUser();
        log.info("Handling UserUpdatedEvent for user: {}, role: {}", user.getUsername(), user.getRole());

        if (user.getRole() == Role.STUDENT) {
            updateStudentProfile(user);
        } else if (user.getRole() == Role.TEACHER || user.getRole() == Role.ADMIN) {
            updateTeacherProfile(user);
        }
    }

    private void createStudentProfile(User user) {
        if (studentRepository.existsByStudentNumber(user.getUsername())) {
          log.warn("Student profile already exists for student number: {}", user.getUsername());
          return;
        }

        Student student = new Student();
        student.setUser(user);
        student.setName(user.getName());
        student.setStudentNumber(user.getUsername());
        student.setEmail(user.getEmail());
        student.setAge(18); // Default age
        student.setGender(Gender.MALE); // Default gender
        student.setEnrollmentDate(LocalDate.now());
        student.setStatus(StudentStatus.ENROLLED);
        student.setAvatar(user.getAvatar());

        studentRepository.save(student);
        log.info("Automatically created student profile for user: {}", user.getUsername());
    }

    private void updateStudentProfile(User user) {
        studentRepository.findByUserId(user.getId()).ifPresent(student -> {
            student.setName(user.getName());
            student.setStudentNumber(user.getUsername());
            student.setEmail(user.getEmail());
            student.setAvatar(user.getAvatar());
            // Sync status if needed, mapping User status to Student status could be complex, 
            // so we might skip status sync or map "inactive" -> "ON_LEAVE" etc.
            // For now, let's keep status separate as business logic might differ.
            
            studentRepository.save(student);
            log.info("Automatically updated student profile for user: {}", user.getUsername());
        });
    }

    private void createTeacherProfile(User user) {
        if (teacherRepository.existsByTeacherNumber(user.getUsername())) {
          log.warn("Teacher profile already exists for teacher number: {}", user.getUsername());
          return;
        }

        Teacher teacher = new Teacher();
        teacher.setUser(user);
        teacher.setName(user.getName());
        teacher.setTeacherNumber(user.getUsername());
        teacher.setEmail(user.getEmail());
        teacher.setStatus(TeacherStatus.ACTIVE);
        teacher.setAvatar(user.getAvatar());
        teacher.setJoinDate(LocalDate.now());

        teacherRepository.save(teacher);
        log.info("Automatically created teacher profile for user: {}", user.getUsername());
    }

    private void updateTeacherProfile(User user) {
        teacherRepository.findByUserId(user.getId()).ifPresent(teacher -> {
            teacher.setName(user.getName());
            teacher.setTeacherNumber(user.getUsername());
            teacher.setEmail(user.getEmail());
            teacher.setAvatar(user.getAvatar());
            
            teacherRepository.save(teacher);
            log.info("Automatically updated teacher profile for user: {}", user.getUsername());
        });
    }
}
