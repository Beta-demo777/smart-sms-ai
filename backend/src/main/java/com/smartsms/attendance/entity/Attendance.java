package com.smartsms.attendance.entity;

import com.smartsms.student.entity.Student;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@Entity
@Table(name = "attendance")
public class Attendance {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false, foreignKey = @ForeignKey(name = "fk_attendance_student", foreignKeyDefinition = "FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE"))
    private Student student;

    @Column(nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AttendanceStatus status;

    private String notes;

    public enum AttendanceStatus {
        PRESENT,
        ABSENT,
        LATE,
        LEAVE
    }
}
