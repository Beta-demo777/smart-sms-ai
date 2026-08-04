package com.smartsms.attendance.controller;

import com.smartsms.attendance.entity.Attendance;
import com.smartsms.attendance.entity.AttendanceSession;
import com.smartsms.attendance.service.AttendanceSessionService;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/attendance/sessions")
@RequiredArgsConstructor
public class AttendanceSessionController {

    private final AttendanceSessionService sessionService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<SessionResponse> create(@RequestBody CreateSessionRequest request) {
        AttendanceSession session = sessionService.createSession(
                request.getTitle(),
                request.getCourseId(),
                request.getTeacherId(),
                request.getStartAt(),
                request.getEndAt()
        );
        return ResponseEntity.ok(toSessionResponse(session));
    }

    @GetMapping("/teacher/{teacherId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<List<SessionResponse>> getTeacherSessions(@PathVariable String teacherId) {
        return ResponseEntity.ok(sessionService.getTeacherSessions(teacherId).stream()
                .map(this::toSessionResponse)
                .toList());
    }

    @GetMapping("/active/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','STUDENT')")
    public ResponseEntity<List<SessionResponse>> getActiveSessionsForStudent(@PathVariable String studentId) {
        return ResponseEntity.ok(sessionService.getActiveSessionsForStudent(studentId).stream()
                .map(this::toSessionResponse)
                .toList());
    }

    @PostMapping("/{id}/checkin")
    @PreAuthorize("@accessGuard.canCheckInFor(#request.studentId)")
    public ResponseEntity<AttendanceCheckInResponse> checkIn(@PathVariable String id, @RequestBody SessionCheckInRequest request) {
        Attendance attendance = sessionService.checkInBySession(id, request.getStudentId(), request.getCheckinCode());
        return ResponseEntity.ok(AttendanceCheckInResponse.builder()
                .attendanceId(attendance.getId())
                .studentId(attendance.getStudent().getId())
                .date(attendance.getDate().toString())
                .status(attendance.getStatus().name())
                .notes(attendance.getNotes())
                .build());
    }

    @PutMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<SessionResponse> close(@PathVariable String id) {
        return ResponseEntity.ok(toSessionResponse(sessionService.closeSession(id)));
    }

    private SessionResponse toSessionResponse(AttendanceSession session) {
        return SessionResponse.builder()
                .id(session.getId())
                .title(session.getTitle())
                .courseId(session.getCourse() != null ? session.getCourse().getId() : null)
                .courseName(session.getCourse() != null ? session.getCourse().getName() : null)
                .teacherId(session.getTeacher() != null ? session.getTeacher().getId() : null)
                .teacherName(session.getTeacher() != null ? session.getTeacher().getName() : null)
                .startAt(session.getStartAt())
                .endAt(session.getEndAt())
                .status(session.getStatus().name())
                .checkinCode(session.getCheckinCode())
                .build();
    }

    @Data
    public static class CreateSessionRequest {
        private String title;
        private String courseId;
        private String teacherId;
        private LocalDateTime startAt;
        private LocalDateTime endAt;
    }

    @Data
    public static class SessionCheckInRequest {
        private String studentId;
        private String checkinCode;
    }

    @Data
    @Builder
    public static class SessionResponse {
        private String id;
        private String title;
        private String courseId;
        private String courseName;
        private String teacherId;
        private String teacherName;
        private LocalDateTime startAt;
        private LocalDateTime endAt;
        private String status;
        private String checkinCode;
    }

    @Data
    @Builder
    public static class AttendanceCheckInResponse {
        private String attendanceId;
        private String studentId;
        private String date;
        private String status;
        private String notes;
    }
}
