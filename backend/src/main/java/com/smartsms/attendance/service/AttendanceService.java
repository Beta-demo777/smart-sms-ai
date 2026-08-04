package com.smartsms.attendance.service;

import com.smartsms.attendance.entity.Attendance;
import com.smartsms.attendance.repository.AttendanceRepository;
import com.smartsms.common.exception.ResourceNotFoundException;
import com.smartsms.student.entity.Student;
import com.smartsms.student.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
public class AttendanceService {
    private final AttendanceRepository attendanceRepository;
    private final StudentRepository studentRepository;

    /**
     * Record or update attendance for a student on a given date.
     * After saving, recalculate and persist student.attendance rate.
     *
     * @param studentId  the student's ID
     * @param status     attendance status
     * @param notes      optional notes
     * @param date       date to record for; null defaults to today
     */
    public Attendance checkIn(String studentId, Attendance.AttendanceStatus status,
                              String notes, LocalDate date) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));

        LocalDate targetDate = (date != null) ? date : LocalDate.now();

        // Upsert: update existing record for this date, or create new
        Attendance attendance = attendanceRepository.findByStudentIdAndDate(studentId, targetDate)
                .orElse(new Attendance());

        attendance.setStudent(student);
        attendance.setDate(targetDate);
        attendance.setStatus(status);
        attendance.setNotes(notes);

        Attendance saved = attendanceRepository.save(attendance);

        // Recalculate and persist student attendance rate
        recalculateStudentAttendance(student);

        return saved;
    }

    /**
     * Create a new attendance record without upsert (allows multiple records on same date).
     */
    public Attendance createRecord(String studentId, Attendance.AttendanceStatus status,
                                   String notes, LocalDate date) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));

        LocalDate targetDate = (date != null) ? date : LocalDate.now();

        Attendance attendance = new Attendance();
        attendance.setStudent(student);
        attendance.setDate(targetDate);
        attendance.setStatus(status);
        attendance.setNotes(notes);

        Attendance saved = attendanceRepository.save(attendance);
        recalculateStudentAttendance(student);
        return saved;
    }

    /** Recalculate attendance percentage for a student from all their records */
    private void recalculateStudentAttendance(Student student) {
        List<Attendance> records = attendanceRepository.findByStudentId(student.getId());
        if (records.isEmpty()) {
            student.setAttendance(BigDecimal.valueOf(100));
            studentRepository.save(student);
            return;
        }

        long effectiveAttendance = records.stream()
                .filter(a -> a.getStatus() == Attendance.AttendanceStatus.PRESENT
                        || a.getStatus() == Attendance.AttendanceStatus.LATE
                        || a.getStatus() == Attendance.AttendanceStatus.LEAVE)
                .count();

        double rate = (double) effectiveAttendance / records.size() * 100.0;
        BigDecimal rounded = BigDecimal.valueOf(rate).setScale(1, RoundingMode.HALF_UP);
        student.setAttendance(rounded);
        studentRepository.save(student);
    }

    public void deleteAttendance(String id) {
        Attendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance", "id", id));
        Student student = attendance.getStudent();
        attendanceRepository.delete(attendance);
        recalculateStudentAttendance(student);
    }

    public List<Attendance> getStudentAttendance(String studentId) {
        return attendanceRepository.findByStudentId(studentId);
    }

    public List<Attendance> getDailyAttendance(LocalDate date) {
        return attendanceRepository.findByDate(date);
    }

    /** For month view: get all records for a student within a date range */
    public List<Attendance> getStudentAttendanceBetween(String studentId,
                                                         LocalDate start, LocalDate end) {
        return attendanceRepository.findByStudentIdAndDateBetween(studentId, start, end);
    }

    /** For month view: get all records for a month */
    public List<Attendance> getMonthlyAttendance(int year, int month) {
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
        return attendanceRepository.findByDateBetween(start, end);
    }

    /**
     * Recalculate attendance rate for all students from attendance detail records.
     *
     * @return number of students processed
     */
    public int recalculateAllStudentAttendanceRates() {
        List<Student> students = studentRepository.findAll();
        students.forEach(this::recalculateStudentAttendance);
        return students.size();
    }
}
