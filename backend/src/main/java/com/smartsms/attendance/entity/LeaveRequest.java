package com.smartsms.attendance.entity;

import com.smartsms.student.entity.Student;
import com.smartsms.teacher.entity.Teacher;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@Entity
@Table(name = "leave_requests")
public class LeaveRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false, foreignKey = @ForeignKey(name = "fk_leave_request_student", foreignKeyDefinition = "FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE"))
    private Student student;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LeaveType type;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LeaveStatus status;

    @ManyToOne
    @JoinColumn(name = "reviewer_id")
    private Teacher reviewer;

    private String reviewComment;

    public enum LeaveType {
        SICK,
        PERSONAL,
        OTHER
    }

    public enum LeaveStatus {
        PENDING,
        APPROVED,
        REJECTED
    }
}
