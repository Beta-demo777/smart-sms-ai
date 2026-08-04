package com.smartsms.attendance.service;

import com.smartsms.attendance.entity.Attendance;
import com.smartsms.attendance.repository.AttendanceRepository;
import com.smartsms.student.entity.Student;
import com.smartsms.student.repository.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AttendanceServiceTest {

    @Mock
    private AttendanceRepository attendanceRepository;

    @Mock
    private StudentRepository studentRepository;

    @InjectMocks
    private AttendanceService attendanceService;

    private Student student;
    private String studentId = "test-student-id";

    @BeforeEach
    void setUp() {
        student = new Student();
        student.setId(studentId);
        student.setName("Test Student");
    }

    @Test
    void testCheckIn_NewAttendance() {
        // Arrange
        Attendance.AttendanceStatus status = Attendance.AttendanceStatus.PRESENT;
        String notes = "On time";
        LocalDate date = LocalDate.now();

        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(attendanceRepository.findByStudentIdAndDate(studentId, date)).thenReturn(Optional.empty());
        when(attendanceRepository.save(any(Attendance.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Attendance result = attendanceService.checkIn(studentId, status, notes, date);

        // Assert
        assertEquals(student, result.getStudent());
        assertEquals(status, result.getStatus());
        assertEquals(notes, result.getNotes());
        assertEquals(date, result.getDate());
        verify(attendanceRepository).save(any(Attendance.class));
    }

    @Test
    void testRecalculateAttendance_NormalCase() {
        // Arrange
        Attendance a1 = new Attendance();
        a1.setStatus(Attendance.AttendanceStatus.PRESENT);
        
        Attendance a2 = new Attendance();
        a2.setStatus(Attendance.AttendanceStatus.ABSENT);
        
        Attendance a3 = new Attendance();
        a3.setStatus(Attendance.AttendanceStatus.LATE);
        
        Attendance a4 = new Attendance();
        a4.setStatus(Attendance.AttendanceStatus.PRESENT);

        List<Attendance> records = Arrays.asList(a1, a2, a3, a4);
        when(attendanceRepository.findByStudentId(studentId)).thenReturn(records);

        // Act
        // Invoke via checkIn or directly if it was public, but it's private. 
        // We'll test it via checkIn or use ReflectionTestUtils if needed, 
        // but testing via public method checkIn is better.
        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(attendanceRepository.findByStudentIdAndDate(any(), any())).thenReturn(Optional.empty());
        when(attendanceRepository.save(any(Attendance.class))).thenReturn(a1);

        attendanceService.checkIn(studentId, Attendance.AttendanceStatus.PRESENT, "note", LocalDate.now());

        // Assert
        // 3 out of 4 are present/late = 75.0%
        assertEquals(new BigDecimal("75.0"), student.getAttendance());
        verify(studentRepository, atLeastOnce()).save(student);
    }

    @Test
    void testRecalculateAttendance_NoRecords() {
        // Arrange
        when(attendanceRepository.findByStudentId(studentId)).thenReturn(Collections.emptyList());
        when(studentRepository.findById(studentId)).thenReturn(Optional.of(student));
        when(attendanceRepository.findByStudentIdAndDate(any(), any())).thenReturn(Optional.empty());
        when(attendanceRepository.save(any(Attendance.class))).thenReturn(new Attendance());

        // Act
        attendanceService.checkIn(studentId, Attendance.AttendanceStatus.PRESENT, "note", LocalDate.now());

        // Assert
        assertEquals(new BigDecimal("100"), student.getAttendance());
        verify(studentRepository, atLeastOnce()).save(student);
    }
}
