package com.smartsms.attendance.repository;

import com.smartsms.attendance.entity.AttendanceSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AttendanceSessionRepository extends JpaRepository<AttendanceSession, String> {
    List<AttendanceSession> findByTeacherIdOrderByStartAtDesc(String teacherId);

    List<AttendanceSession> findByCourseIdInAndStatusAndEndAtAfterOrderByStartAtAsc(
            List<String> courseIds,
            AttendanceSession.SessionStatus status,
            LocalDateTime now
    );
}

