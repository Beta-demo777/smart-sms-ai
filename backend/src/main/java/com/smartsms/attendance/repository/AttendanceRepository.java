package com.smartsms.attendance.repository;

import com.smartsms.attendance.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, String> {
    List<Attendance> findByStudentId(String studentId);
    
    List<Attendance> findByDate(LocalDate date);
    
    Optional<Attendance> findByStudentIdAndDate(String studentId, LocalDate date);
    
    List<Attendance> findByStudentIdAndDateBetween(String studentId, LocalDate startDate, LocalDate endDate);

    List<Attendance> findByDateBetween(LocalDate startDate, LocalDate endDate);

    List<Attendance> findByStudentIdIn(Collection<String> studentIds);
}
