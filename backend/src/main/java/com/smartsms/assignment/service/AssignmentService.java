package com.smartsms.assignment.service;

import com.smartsms.assignment.entity.Assignment;
import com.smartsms.assignment.entity.AssignmentSubmission;
import com.smartsms.assignment.repository.AssignmentRepository;
import com.smartsms.assignment.repository.AssignmentSubmissionRepository;
import com.smartsms.common.exception.ResourceNotFoundException;
import com.smartsms.course.entity.Enrollment;
import com.smartsms.course.repository.EnrollmentRepository;
import com.smartsms.student.entity.Student;
import com.smartsms.student.repository.StudentRepository;
import com.smartsms.teacher.entity.Teacher;
import com.smartsms.teacher.repository.TeacherRepository;
import com.smartsms.user.entity.Role;
import com.smartsms.user.entity.User;
import com.smartsms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AssignmentService {
    private final AssignmentRepository assignmentRepository;
    private final AssignmentSubmissionRepository submissionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
    private final UserRepository userRepository;

    public List<Assignment> getAssignmentsForStudent(String studentId) {
        enforceStudentSelf(studentId);
        List<Enrollment> enrollments = enrollmentRepository.findByStudentId(studentId);
        List<String> courseIds = enrollments.stream()
                .map(e -> e.getCourse().getId())
                .collect(Collectors.toList());
        return assignmentRepository.findByCourseIdIn(courseIds);
    }

    public List<Assignment> getAssignmentsByTeacher(String teacherId) {
        enforceTeacherSelf(teacherId);
        return assignmentRepository.findByTeacherIdAndActiveTrue(teacherId);
    }

    public Assignment createAssignment(Assignment assignment) {
        enforceTeacherOwnership(assignment.getTeacher() != null ? assignment.getTeacher().getUser() : null);
        return assignmentRepository.save(assignment);
    }

    public Assignment updateAssignment(String assignmentId, String title, String description, java.time.LocalDateTime dueDate) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));
        if (Boolean.FALSE.equals(assignment.getActive())) {
            throw new ResourceNotFoundException("Assignment not found");
        }

        enforceTeacherOwnership(assignment.getTeacher() != null ? assignment.getTeacher().getUser() : null);
        assignment.setTitle(title);
        assignment.setDescription(description);
        assignment.setDueDate(dueDate);
        return assignmentRepository.save(assignment);
    }

    public void deleteAssignment(String assignmentId) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));
        if (Boolean.FALSE.equals(assignment.getActive())) {
            return;
        }

        enforceTeacherOwnership(assignment.getTeacher() != null ? assignment.getTeacher().getUser() : null);
        assignment.setActive(false);
        assignmentRepository.save(assignment);
    }

    public AssignmentSubmission submitAssignment(String assignmentId, String studentId, String content, String fileUrl) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        enforceStudentSelf(studentId);

        boolean enrolled = enrollmentRepository.findByStudentId(studentId).stream()
                .anyMatch(e -> e.getCourse() != null
                        && e.getCourse().getId().equals(assignment.getCourse().getId()));
        if (!enrolled) {
            throw new AccessDeniedException("您未选修该课程，无法提交作业");
        }

        AssignmentSubmission submission = submissionRepository.findByAssignmentIdAndStudentId(assignmentId, studentId)
                .orElse(AssignmentSubmission.builder()
                        .assignment(assignment)
                        .student(student)
                        .build());

        submission.setContent(content);
        submission.setFileUrl(fileUrl);
        submission.setStatus(AssignmentSubmission.SubmissionStatus.SUBMITTED);
        
        return submissionRepository.save(submission);
    }

    public List<AssignmentSubmission> getSubmissionsByAssignment(String assignmentId) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));
        enforceTeacherOwnership(
                assignment.getTeacher() != null ? assignment.getTeacher().getUser() : null
        );
        return submissionRepository.findByAssignmentId(assignmentId);
    }

    public List<AssignmentSubmission> getSubmissionsByStudent(String studentId) {
        enforceStudentSelf(studentId);
        return submissionRepository.findByStudentId(studentId);
    }

    public AssignmentSubmission gradeSubmission(String submissionId, Double grade, String feedback) {
        AssignmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));
        enforceTeacherOwnership(
                submission.getAssignment() != null
                        && submission.getAssignment().getTeacher() != null
                        ? submission.getAssignment().getTeacher().getUser()
                        : null
        );
        
        submission.setGrade(grade);
        submission.setTeacherFeedback(feedback);
        submission.setStatus(AssignmentSubmission.SubmissionStatus.GRADED);
        
        return submissionRepository.save(submission);
    }

    private void enforceStudentSelf(String studentId) {
        User actor = currentUser();
        if (actor == null || actor.getRole() == Role.ADMIN || actor.getRole() == Role.TEACHER) return;
        if (actor.getRole() != Role.STUDENT) {
            throw new AccessDeniedException("无权访问学生作业数据");
        }

        String actorStudentId = studentRepository.findByUserId(actor.getId())
                .map(Student::getId)
                .orElse(null);
        if (actorStudentId == null || !actorStudentId.equals(studentId)) {
            throw new AccessDeniedException("仅可访问自己的作业数据");
        }
    }

    private void enforceTeacherOwnership(User assignmentTeacherUser) {
        User actor = currentUser();
        if (actor == null || actor.getRole() == Role.ADMIN) return;
        if (actor.getRole() != Role.TEACHER) {
            throw new AccessDeniedException("无权操作作业");
        }

        String assignmentTeacherUsername = assignmentTeacherUser != null ? assignmentTeacherUser.getUsername() : null;
        if (assignmentTeacherUsername == null || !assignmentTeacherUsername.equals(actor.getUsername())) {
            throw new AccessDeniedException("仅可操作自己课程的作业");
        }
    }

    private void enforceTeacherSelf(String teacherId) {
        User actor = currentUser();
        if (actor == null || actor.getRole() == Role.ADMIN) return;
        if (actor.getRole() != Role.TEACHER) {
            throw new AccessDeniedException("无权访问教师作业数据");
        }

        String actorTeacherId = teacherRepository.findByUserId(actor.getId())
                .map(Teacher::getId)
                .orElse(null);
        if (actorTeacherId == null || !actorTeacherId.equals(teacherId)) {
            throw new AccessDeniedException("仅可访问自己的作业数据");
        }
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return userRepository.findByUsername(authentication.getName()).orElse(null);
    }
}
