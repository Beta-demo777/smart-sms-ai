package com.smartsms.common.service;

import com.smartsms.common.util.AvatarUtil;
import com.smartsms.student.entity.Student;
import com.smartsms.student.repository.StudentRepository;
import com.smartsms.teacher.entity.Teacher;
import com.smartsms.teacher.repository.TeacherRepository;
import com.smartsms.user.entity.User;
import com.smartsms.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AvatarBackfillService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;

    public AvatarBackfillService(UserRepository userRepository,
                                 StudentRepository studentRepository,
                                 TeacherRepository teacherRepository) {
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.teacherRepository = teacherRepository;
    }

    @Transactional
    public BackfillResult backfillAll() {
        int users = backfillUsers();
        int students = backfillStudents();
        int teachers = backfillTeachers();
        return new BackfillResult(users, students, teachers);
    }

    private int backfillUsers() {
        List<User> users = userRepository.findAll();
        int updated = 0;
        for (User user : users) {
            if (isBlank(user.getAvatar())) {
                String seed = firstNonBlank(user.getUsername(), user.getName(), user.getEmail());
                user.setAvatar(AvatarUtil.defaultAvatar(seed));
                updated++;
            }
        }
        userRepository.saveAll(users);
        return updated;
    }

    private int backfillStudents() {
        List<Student> students = studentRepository.findAll();
        int updated = 0;
        for (Student student : students) {
            String seed = firstNonBlank(student.getStudentNumber(), student.getName(), student.getEmail());
            boolean changed = false;
            if (isBlank(student.getAvatar())) {
                student.setAvatar(AvatarUtil.defaultAvatar(seed));
                changed = true;
            }
            if (student.getUser() != null && isBlank(student.getUser().getAvatar())) {
                student.getUser().setAvatar(AvatarUtil.defaultAvatar(seed));
                changed = true;
            }
            if (changed) updated++;
        }
        studentRepository.saveAll(students);
        return updated;
    }

    private int backfillTeachers() {
        List<Teacher> teachers = teacherRepository.findAll();
        int updated = 0;
        for (Teacher teacher : teachers) {
            String seed = firstNonBlank(teacher.getTeacherNumber(), teacher.getName(), teacher.getEmail());
            boolean changed = false;
            if (isBlank(teacher.getAvatar())) {
                teacher.setAvatar(AvatarUtil.defaultAvatar(seed));
                changed = true;
            }
            if (teacher.getUser() != null && isBlank(teacher.getUser().getAvatar())) {
                teacher.getUser().setAvatar(AvatarUtil.defaultAvatar(seed));
                changed = true;
            }
            if (changed) updated++;
        }
        teacherRepository.saveAll(teachers);
        return updated;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (!isBlank(v)) return v;
        }
        return "default";
    }

    public record BackfillResult(int usersUpdated, int studentsUpdated, int teachersUpdated) {}
}
