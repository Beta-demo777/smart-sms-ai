package com.smartsms.security.service;

import com.smartsms.student.entity.Student;
import com.smartsms.student.repository.StudentRepository;
import com.smartsms.teacher.entity.Teacher;
import com.smartsms.teacher.repository.TeacherRepository;
import com.smartsms.user.entity.Role;
import com.smartsms.user.entity.User;
import com.smartsms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component("accessGuard")
@RequiredArgsConstructor
public class AccessGuard {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;

    public boolean canSubmitLeaveFor(String studentId) {
        User actor = currentUser();
        if (actor == null) return false;
        if (actor.getRole() == Role.ADMIN) return true;
        if (actor.getRole() != Role.STUDENT) return false;
        return currentStudentProfileId(actor).map(studentId::equals).orElse(false);
    }

    public boolean canReviewLeaveAs(String reviewerId) {
        User actor = currentUser();
        if (actor == null) return false;
        if (actor.getRole() == Role.ADMIN) return true;
        if (actor.getRole() != Role.TEACHER) return false;
        return currentTeacherProfileId(actor).map(reviewerId::equals).orElse(false);
    }

    public boolean canViewStudentLeaveRequests(String studentId) {
        User actor = currentUser();
        if (actor == null) return false;
        if (actor.getRole() == Role.ADMIN || actor.getRole() == Role.TEACHER) return true;
        if (actor.getRole() != Role.STUDENT) return false;
        return currentStudentProfileId(actor).map(studentId::equals).orElse(false);
    }

    public boolean canCheckInFor(String studentId) {
        User actor = currentUser();
        if (actor == null) return false;
        if (actor.getRole() == Role.ADMIN || actor.getRole() == Role.TEACHER) return true;
        if (actor.getRole() != Role.STUDENT) return false;
        return currentStudentProfileId(actor).map(studentId::equals).orElse(false);
    }

    public boolean canViewStudentAttendance(String studentId) {
        User actor = currentUser();
        if (actor == null) return false;
        if (actor.getRole() == Role.ADMIN || actor.getRole() == Role.TEACHER) return true;
        if (actor.getRole() != Role.STUDENT) return false;
        return currentStudentProfileId(actor).map(studentId::equals).orElse(false);
    }

    public boolean canViewScoresForStudent(String studentId) {
        User actor = currentUser();
        if (actor == null) return false;
        if (actor.getRole() == Role.ADMIN || actor.getRole() == Role.TEACHER) return true;
        if (actor.getRole() != Role.STUDENT) return false;
        return currentStudentProfileId(actor).map(studentId::equals).orElse(false);
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        String username = authentication.getName();
        return userRepository.findByUsername(username).orElse(null);
    }

    private java.util.Optional<String> currentStudentProfileId(User user) {
        return studentRepository.findByUserId(user.getId()).map(Student::getId);
    }

    private java.util.Optional<String> currentTeacherProfileId(User user) {
        return teacherRepository.findByUserId(user.getId()).map(Teacher::getId);
    }
}
