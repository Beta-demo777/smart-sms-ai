package com.smartsms.assignment.repository;

import com.smartsms.assignment.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, String> {
    List<Assignment> findByCourseId(String courseId);
    List<Assignment> findByTeacherId(String teacherId);
    List<Assignment> findByTeacherIdAndActiveTrue(String teacherId);
    
    @Query("SELECT a FROM Assignment a WHERE a.course.id IN :courseIds AND a.active = true")
    List<Assignment> findByCourseIdIn(@Param("courseIds") List<String> courseIds);
}
