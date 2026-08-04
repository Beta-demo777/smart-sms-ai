package com.smartsms.score;

import com.smartsms.common.exception.ResourceNotFoundException;
import com.smartsms.course.entity.Course;
import com.smartsms.course.repository.CourseRepository;
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

@Service
@RequiredArgsConstructor
@Transactional
public class ExamService {
    private final ExamRepository examRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;

    public List<Exam> getAllExams() {
        return examRepository.findAll();
    }
    
    public List<Exam> getExamsByCourse(String courseId) {
        return examRepository.findByCourseId(courseId);
    }

    public Exam createExam(Exam exam, String courseId) {
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
        enforceTeacherOwnership(course);
        exam.setCourse(course);
        return examRepository.save(exam);
    }
    
    public Exam updateExam(String id, Exam examDetails) {
        Exam exam = examRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));
        enforceTeacherOwnership(exam.getCourse());
            
        exam.setTitle(examDetails.getTitle());
        exam.setDate(examDetails.getDate());
        exam.setMaxScore(examDetails.getMaxScore());
        exam.setDescription(examDetails.getDescription());
        
        return examRepository.save(exam);
    }
    
    public void deleteExam(String id) {
        Exam exam = examRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));
        enforceTeacherOwnership(exam.getCourse());
        examRepository.delete(exam);
    }

    private void enforceTeacherOwnership(Course course) {
        String username = resolveCurrentUsername();
        if (username == null || "anonymous".equals(username)) return;

        User actor = userRepository.findByUsername(username).orElse(null);
        if (actor == null || actor.getRole() != Role.TEACHER) return;

        String courseTeacherUsername = course != null
                && course.getTeacher() != null
                && course.getTeacher().getUser() != null
                ? course.getTeacher().getUser().getUsername()
                : null;

        if (courseTeacherUsername == null || !courseTeacherUsername.equals(username)) {
            throw new AccessDeniedException("您无权操作该课程的考试");
        }
    }

    private String resolveCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return "anonymous";
        }
        return authentication.getName();
    }
}
