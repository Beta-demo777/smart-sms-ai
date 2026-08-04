package com.smartsms.score;

import com.smartsms.student.entity.Student;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Entity
@Table(name = "scores")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Score {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "student_id", nullable = false, foreignKey = @ForeignKey(name = "fk_score_student", foreignKeyDefinition = "FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE"))
    private Student student;

    @Column(nullable = false)
    private Double scoreValue;

    @Column(length = 500)
    private String feedback;
    
    @Builder.Default
    private LocalDateTime gradedAt = LocalDateTime.now();
}
