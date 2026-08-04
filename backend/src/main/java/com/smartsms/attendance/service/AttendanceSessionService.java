package com.smartsms.attendance.service;

import com.smartsms.attendance.entity.Attendance;
import com.smartsms.attendance.entity.AttendanceSession;
import com.smartsms.attendance.repository.AttendanceSessionRepository;
import com.smartsms.common.exception.ResourceNotFoundException;
import com.smartsms.course.entity.Course;
import com.smartsms.course.entity.Enrollment;
import com.smartsms.course.repository.CourseRepository;
import com.smartsms.course.repository.EnrollmentRepository;
import com.smartsms.student.entity.Student;
import com.smartsms.student.repository.StudentRepository;
import com.smartsms.teacher.entity.Teacher;
import com.smartsms.teacher.repository.TeacherRepository;
import com.smartsms.user.entity.Role;
import com.smartsms.user.entity.User;
import com.smartsms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AttendanceSessionService {

    private final AttendanceSessionRepository sessionRepository;
    private final CourseRepository courseRepository;
    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AttendanceService attendanceService;
    private final UserRepository userRepository;

    public AttendanceSession createSession(
            String title,
            String courseId,
            String teacherId,
            LocalDateTime startAt,
            LocalDateTime endAt
    ) {
        if (startAt == null || endAt == null || endAt.isBefore(startAt)) {
            throw new IllegalArgumentException("无效的签到时间范围");
        }
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
        Teacher teacher = teacherRepository.findById(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));

        if (course.getTeacher() == null || !teacher.getId().equals(course.getTeacher().getId())) {
            throw new AccessDeniedException("仅可为自己授课课程发布签到");
        }
        enforceTeacherOwnership(teacher.getUser());

        AttendanceSession session = AttendanceSession.builder()
                .title(title)
                .course(course)
                .teacher(teacher)
                .startAt(startAt)
                .endAt(endAt)
                .status(AttendanceSession.SessionStatus.OPEN)
                .checkinCode(generateCode())
                .build();
        return sessionRepository.save(session);
    }

    public List<AttendanceSession> getTeacherSessions(String teacherId) {
        enforceTeacherSelf(teacherId);
        return sessionRepository.findByTeacherIdOrderByStartAtDesc(teacherId);
    }

    public List<AttendanceSession> getActiveSessionsForStudent(String studentId) {
        enforceStudentSelf(studentId);
        List<String> courseIds = enrollmentRepository.findByStudentId(studentId).stream()
                .map(Enrollment::getCourse)
                .filter(c -> c != null && c.getId() != null)
                .map(Course::getId)
                .collect(Collectors.toList());
        if (courseIds.isEmpty()) return List.of();
        return sessionRepository.findByCourseIdInAndStatusAndEndAtAfterOrderByStartAtAsc(
                courseIds,
                AttendanceSession.SessionStatus.OPEN,
                LocalDateTime.now()
        ).stream().filter(s -> !s.getStartAt().isAfter(LocalDateTime.now())).toList();
    }

    public Attendance checkInBySession(String sessionId, String studentId, String checkinCode) {
        AttendanceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance session not found"));
        if (session.getStatus() != AttendanceSession.SessionStatus.OPEN) {
            throw new AccessDeniedException("签到场次已关闭");
        }
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(session.getStartAt()) || now.isAfter(session.getEndAt())) {
            throw new AccessDeniedException("当前不在签到时间窗口内");
        }
        enforceStudentSelf(studentId);

        boolean enrolled = enrollmentRepository.findByStudentId(studentId).stream()
                .anyMatch(e -> e.getCourse() != null
                        && e.getCourse().getId().equals(session.getCourse().getId()));
        if (!enrolled) {
            throw new AccessDeniedException("您不在该课程签到范围内");
        }
        String expected = session.getCheckinCode() == null ? "" : session.getCheckinCode().trim().toUpperCase();
        String provided = checkinCode == null ? "" : checkinCode.trim().toUpperCase();
        if (provided.isBlank() || !provided.equals(expected)) {
            throw new AccessDeniedException("签到码错误");
        }

        String notes = "签到场次: " + session.getTitle() + " [" + session.getCheckinCode() + "]";
        return attendanceService.checkIn(studentId, Attendance.AttendanceStatus.PRESENT, notes, LocalDate.now());
    }

    public AttendanceSession closeSession(String sessionId) {
        AttendanceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance session not found"));
        enforceTeacherOwnership(session.getTeacher() != null ? session.getTeacher().getUser() : null);
        session.setStatus(AttendanceSession.SessionStatus.CLOSED);
        return sessionRepository.save(session);
    }

    private String generateCode() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
    }

    private void enforceTeacherSelf(String teacherId) {
        User actor = currentUser();
        if (actor == null || actor.getRole() == Role.ADMIN) return;
        if (actor.getRole() != Role.TEACHER) {
            throw new AccessDeniedException("无权访问教师签到场次");
        }
        String actorTeacherId = teacherRepository.findByUserId(actor.getId())
                .map(Teacher::getId)
                .orElse(null);
        if (actorTeacherId == null || !actorTeacherId.equals(teacherId)) {
            throw new AccessDeniedException("仅可访问自己的签到场次");
        }
    }

    private void enforceStudentSelf(String studentId) {
        User actor = currentUser();
        if (actor == null || actor.getRole() == Role.ADMIN || actor.getRole() == Role.TEACHER) return;
        if (actor.getRole() != Role.STUDENT) {
            throw new AccessDeniedException("无权访问签到数据");
        }
        String actorStudentId = studentRepository.findByUserId(actor.getId())
                .map(Student::getId)
                .orElse(null);
        if (actorStudentId == null || !actorStudentId.equals(studentId)) {
            throw new AccessDeniedException("仅可访问自己的签到数据");
        }
    }

    private void enforceTeacherOwnership(User sessionTeacherUser) {
        User actor = currentUser();
        if (actor == null || actor.getRole() == Role.ADMIN) return;
        if (actor.getRole() != Role.TEACHER) {
            throw new AccessDeniedException("无权操作签到场次");
        }
        String teacherUsername = sessionTeacherUser != null ? sessionTeacherUser.getUsername() : null;
        if (teacherUsername == null || !teacherUsername.equals(actor.getUsername())) {
            throw new AccessDeniedException("仅可操作自己发布的签到场次");
        }
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) return null;
        return userRepository.findByUsername(authentication.getName()).orElse(null);
    }
}
