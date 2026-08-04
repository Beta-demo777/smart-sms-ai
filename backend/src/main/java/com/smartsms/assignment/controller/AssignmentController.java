package com.smartsms.assignment.controller;

import com.smartsms.assignment.entity.Assignment;
import com.smartsms.assignment.entity.AssignmentSubmission;
import com.smartsms.assignment.service.AssignmentService;
import com.smartsms.course.entity.Course;
import com.smartsms.course.repository.CourseRepository;
import com.smartsms.common.exception.ResourceNotFoundException;
import com.smartsms.teacher.entity.Teacher;
import com.smartsms.teacher.repository.TeacherRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/assignments")
@RequiredArgsConstructor
public class AssignmentController {
    private final AssignmentService assignmentService;
    private final CourseRepository courseRepository;
    private final TeacherRepository teacherRepository;

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER','STUDENT')")
    public ResponseEntity<List<AssignmentResponse>> getForStudent(@PathVariable String studentId) {
        return ResponseEntity.ok(assignmentService.getAssignmentsForStudent(studentId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList()));
    }

    @GetMapping("/student/{studentId}/submissions")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER','STUDENT')")
    public ResponseEntity<List<SubmissionResponse>> getSubmissionsForStudent(@PathVariable String studentId) {
        return ResponseEntity.ok(assignmentService.getSubmissionsByStudent(studentId).stream()
                .map(this::toSubmissionResponse)
                .collect(Collectors.toList()));
    }

    @GetMapping("/teacher/{teacherId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<List<AssignmentResponse>> getForTeacher(@PathVariable String teacherId) {
        return ResponseEntity.ok(assignmentService.getAssignmentsByTeacher(teacherId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList()));
    }

    @GetMapping("/{assignmentId}/submissions")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<List<SubmissionResponse>> getSubmissionsByAssignment(@PathVariable String assignmentId) {
        return ResponseEntity.ok(assignmentService.getSubmissionsByAssignment(assignmentId).stream()
                .map(this::toSubmissionResponse)
                .collect(Collectors.toList()));
    }

    @PostMapping("/submit")
    @PreAuthorize("hasAnyRole('ADMIN','STUDENT')")
    public ResponseEntity<SubmissionResponse> submit(@RequestBody SubmissionRequest request) {
        return ResponseEntity.ok(toSubmissionResponse(assignmentService.submitAssignment(
                request.getAssignmentId(),
                request.getStudentId(),
                request.getContent(),
                request.getFileUrl()
        )));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<AssignmentResponse> create(@RequestBody CreateAssignmentRequest request) {
        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
        Teacher teacher = teacherRepository.findById(request.getTeacherId())
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));

        Assignment assignment = Assignment.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .dueDate(request.getDueDate())
                .course(course)
                .teacher(teacher)
                .build();

        return ResponseEntity.ok(toResponse(assignmentService.createAssignment(assignment)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<AssignmentResponse> update(@PathVariable String id, @RequestBody UpdateAssignmentRequest request) {
        return ResponseEntity.ok(toResponse(assignmentService.updateAssignment(
                id,
                request.getTitle(),
                request.getDescription(),
                request.getDueDate()
        )));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        assignmentService.deleteAssignment(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/submissions/{id}/grade")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<SubmissionResponse> grade(@PathVariable String id, @RequestBody GradeRequest request) {
        return ResponseEntity.ok(toSubmissionResponse(assignmentService.gradeSubmission(
                id, request.getGrade(), request.getFeedback()
        )));
    }

    private AssignmentResponse toResponse(Assignment a) {
        return AssignmentResponse.builder()
                .id(a.getId())
                .title(a.getTitle())
                .description(a.getDescription())
                .dueDate(a.getDueDate())
                .courseId(a.getCourse().getId())
                .courseName(a.getCourse().getName())
                .teacherId(a.getTeacher().getId())
                .teacherName(a.getTeacher().getName())
                .active(a.getActive())
                .build();
    }

    private SubmissionResponse toSubmissionResponse(AssignmentSubmission s) {
        return SubmissionResponse.builder()
                .id(s.getId())
                .assignmentId(s.getAssignment().getId())
                .assignmentTitle(s.getAssignment().getTitle())
                .studentName(s.getStudent().getName())
                .content(s.getContent())
                .fileUrl(s.getFileUrl())
                .submissionDate(s.getSubmissionDate())
                .grade(s.getGrade())
                .teacherFeedback(s.getTeacherFeedback())
                .status(s.getStatus().name())
                .build();
    }

    @Data
    public static class CreateAssignmentRequest {
        private String title;
        private String description;
        private LocalDateTime dueDate;
        private String courseId;
        private String teacherId;
    }

    @Data
    public static class SubmissionRequest {
        private String assignmentId;
        private String studentId;
        private String content;
        private String fileUrl;
    }

    @Data
    public static class GradeRequest {
        private Double grade;
        private String feedback;
    }

    @Data
    public static class UpdateAssignmentRequest {
        private String title;
        private String description;
        private LocalDateTime dueDate;
    }

    @Data
    @lombok.Builder
    public static class AssignmentResponse {
        private String id;
        private String title;
        private String description;
        private LocalDateTime dueDate;
        private String courseId;
        private String courseName;
        private String teacherId;
        private String teacherName;
        private Boolean active;
    }

    @Data
    @lombok.Builder
    public static class SubmissionResponse {
        private String id;
        private String assignmentId;
        private String assignmentTitle;
        private String studentName;
        private String content;
        private String fileUrl;
        private LocalDateTime submissionDate;
        private Double grade;
        private String teacherFeedback;
        private String status;
    }
}
