package com.smartsms.score;

import com.smartsms.common.exception.ResourceNotFoundException;
import com.smartsms.student.entity.Student;
import com.smartsms.student.repository.StudentRepository;
import com.smartsms.user.entity.Role;
import com.smartsms.user.entity.User;
import com.smartsms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.OptionalDouble;

@Service
@RequiredArgsConstructor
@Transactional
public class ScoreService {
    private final ScoreRepository scoreRepository;
    private final ExamRepository examRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;

    public List<Score> getScoresByExam(String examId) {
        return scoreRepository.findByExamId(examId);
    }

    public List<Score> getScoresByStudent(String studentId) {
        return scoreRepository.findByStudentId(studentId);
    }

    public Score recordScore(String examId, String studentId, Double value, String feedback) {
        Exam exam = examRepository.findById(examId)
            .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));

        enforceTeacherOwnership(exam);

        Student student = studentRepository.findById(studentId)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        Optional<Score> existingScore = scoreRepository.findByExamIdAndStudentId(examId, studentId);

        Score score;
        if (existingScore.isPresent()) {
            score = existingScore.get();
            score.setScoreValue(value);
            score.setFeedback(feedback);
        } else {
            score = Score.builder()
                .exam(exam)
                .student(student)
                .scoreValue(value)
                .feedback(feedback)
                .build();
        }

        Score saved = scoreRepository.save(score);
        recalculateStudentGpa(student);
        return saved;
    }

    private void enforceTeacherOwnership(Exam exam) {
        String username = resolveCurrentUsername();
        if (username == null || "anonymous".equals(username)) return;

        User actor = userRepository.findByUsername(username).orElse(null);
        if (actor == null || actor.getRole() != Role.TEACHER) return;

        String courseTeacherUsername = exam.getCourse() != null
                && exam.getCourse().getTeacher() != null
                && exam.getCourse().getTeacher().getUser() != null
                ? exam.getCourse().getTeacher().getUser().getUsername()
                : null;

        if (courseTeacherUsername == null || !courseTeacherUsername.equals(username)) {
            throw new AccessDeniedException("您无权录入该考试成绩");
        }
    }

    private String resolveCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return "anonymous";
        }
        return authentication.getName();
    }

    /** Recalculate GPA and Credits for a single student from their scores (score/maxScore * 4.0 scale) */
    private void recalculateStudentGpa(Student student) {
        List<Score> scores = scoreRepository.findByStudentId(student.getId());
        if (scores.isEmpty()) {
            student.setGpa(BigDecimal.ZERO);
            student.setTotalCredits(0);
            studentRepository.save(student);
            return;
        }
        
        double avgPercent = scores.stream()
            .filter(s -> s.getExam() != null && s.getExam().getMaxScore() > 0)
            .mapToDouble(s -> s.getScoreValue() / s.getExam().getMaxScore())
            .average()
            .orElse(0.0);
        BigDecimal gpa = BigDecimal.valueOf(avgPercent * 4.0).setScale(2, RoundingMode.HALF_UP);
        student.setGpa(gpa);
        
        // Sum credits from passed exams (score >= 60% of maxScore)
        int totalCredits = scores.stream()
            .filter(s -> s.getExam() != null && s.getExam().getCourse() != null)
            .filter(s -> s.getScoreValue() >= (s.getExam().getMaxScore() * 0.6))
            .mapToInt(s -> s.getExam().getCourse().getCredits())
            .sum();
        student.setTotalCredits(totalCredits);
        
        studentRepository.save(student);
    }

    /** Batch recalculate GPA for ALL students — call once to fix existing data */
    public void recalculateAllGpa() {
        List<Student> students = studentRepository.findAll();
        for (Student student : students) {
            recalculateStudentGpa(student);
        }
    }

    /** Aggregate score statistics for a single student */
    public ScoreStatsResponse getStudentStats(String studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        List<Score> scores = scoreRepository.findByStudentId(studentId);

        if (scores.isEmpty()) {
            return ScoreStatsResponse.builder()
                    .studentId(studentId)
                    .gpa(student.getGpa() != null ? student.getGpa().doubleValue() : 0.0)
                    .totalExams(0)
                    .avgScore(0.0)
                    .maxScore(0.0)
                    .minScore(0.0)
                    .build();
        }

        OptionalDouble avg = scores.stream().mapToDouble(Score::getScoreValue).average();
        double max = scores.stream().mapToDouble(Score::getScoreValue).max().orElse(0.0);
        double min = scores.stream().mapToDouble(Score::getScoreValue).min().orElse(0.0);

        // Calculate Rank in Class (or across all students for now)
        List<Student> allStudents = studentRepository.findAll();
        allStudents.sort((s1, s2) -> s2.getGpa().compareTo(s1.getGpa()));
        int rank = 1;
        for (Student s : allStudents) {
            if (s.getId().equals(studentId)) break;
            rank++;
        }

        return ScoreStatsResponse.builder()
                .studentId(studentId)
                .gpa(student.getGpa() != null ? student.getGpa().doubleValue() : 0.0)
                .totalExams(scores.size())
                .avgScore(BigDecimal.valueOf(avg.orElse(0.0)).setScale(2, RoundingMode.HALF_UP).doubleValue())
                .maxScore(max)
                .minScore(min)
                .rank(rank)
                .totalCredits(student.getTotalCredits() != null ? student.getTotalCredits() : 0)
                .build();
    }
}
