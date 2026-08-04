package com.smartsms.course.repository;

import com.smartsms.course.entity.Course;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface CourseRepository extends JpaRepository<Course, String> {
    
    Page<Course> findByTeacherId(String teacherId, Pageable pageable);
    
    @Query("SELECT c FROM Course c WHERE LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Course> searchByKeyword(String keyword, Pageable pageable);
    
    @Query("SELECT c FROM Course c WHERE c.enrolledCount < c.maxCapacity")
    Page<Course> findAvailableCourses(Pageable pageable);
}
