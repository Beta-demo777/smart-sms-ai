package com.smartsms.score;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/scores")
@RequiredArgsConstructor
public class ScoreController {
    private final ScoreService scoreService;

    @GetMapping("/exam/{examId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<List<ScoreResponse>> getScoresByExam(@PathVariable String examId) {
        return ResponseEntity.ok(scoreService.getScoresByExam(examId).stream()
            .map(this::toResponse)
            .collect(java.util.stream.Collectors.toList()));
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("@accessGuard.canViewScoresForStudent(#studentId)")
    public ResponseEntity<List<ScoreResponse>> getScoresByStudent(@PathVariable String studentId) {
        return ResponseEntity.ok(scoreService.getScoresByStudent(studentId).stream()
            .map(this::toResponse)
            .collect(java.util.stream.Collectors.toList()));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<ScoreResponse> recordScore(@RequestBody ScoreRequest request) {
        return ResponseEntity.ok(toResponse(scoreService.recordScore(
            request.getExamId(),
            request.getStudentId(),
            request.getValue(),
            request.getFeedback()
        )));
    }

    @PostMapping("/recalculate-gpa")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> recalculateAllGpa() {
        scoreService.recalculateAllGpa();
        return ResponseEntity.ok().build();
    }

    @GetMapping("/stats/student/{studentId}")
    @PreAuthorize("@accessGuard.canViewScoresForStudent(#studentId)")
    public ResponseEntity<ScoreStatsResponse> getStudentStats(@PathVariable String studentId) {
        return ResponseEntity.ok(scoreService.getStudentStats(studentId));
    }

    private ScoreResponse toResponse(Score score) {
        ScoreResponse.CourseSummary courseSummary = null;
        if (score.getExam() != null && score.getExam().getCourse() != null) {
            courseSummary = new ScoreResponse.CourseSummary(
                score.getExam().getCourse().getId(),
                score.getExam().getCourse().getName()
            );
        }
        return ScoreResponse.builder()
            .id(score.getId())
            .scoreValue(score.getScoreValue())
            .feedback(score.getFeedback())
            .gradedAt(score.getGradedAt())
            .student(new ScoreResponse.StudentSummary(
                score.getStudent().getId(),
                score.getStudent().getName(),
                score.getStudent().getStudentNumber()
            ))
            .exam(new ScoreResponse.ExamSummary(
                score.getExam().getId(),
                score.getExam().getTitle(),
                courseSummary
            ))
            .build();
    }

    @Data
    public static class ScoreRequest {
        private String examId;
        private String studentId;
        private Double value;
        private String feedback;
    }

    @Data
    @lombok.Builder
    public static class ScoreResponse {
        private String id;
        private Double scoreValue;
        private String feedback;
        private java.time.LocalDateTime gradedAt;
        private StudentSummary student;
        private ExamSummary exam;

        @Data
        @lombok.AllArgsConstructor
        public static class StudentSummary {
            private String id;
            private String name;
            private String studentNumber;
        }

        @Data
        @lombok.AllArgsConstructor
        public static class ExamSummary {
            private String id;
            private String title;
            private CourseSummary course;
        }

        @Data
        @lombok.AllArgsConstructor
        public static class CourseSummary {
            private String id;
            private String name;
        }
    }
}
