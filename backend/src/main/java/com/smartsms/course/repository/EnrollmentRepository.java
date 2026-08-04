package com.smartsms.course.repository;

import com.smartsms.course.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, String> {
    
    List<Enrollment> findByStudentId(String studentId);
    
    List<Enrollment> findByCourseId(String courseId);
    
    Optional<Enrollment> findByStudentIdAndCourseId(String studentId, String courseId);
    
    boolean existsByStudentIdAndCourseId(String studentId, String courseId);
    
    long countByCourseId(String courseId);
    
    void deleteByStudentIdAndCourseId(String studentId, String courseId);
}
