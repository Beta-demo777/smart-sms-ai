package com.smartsms.student.repository;

import com.smartsms.student.entity.Student;
import com.smartsms.student.entity.StudentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, String> {
    
    Optional<Student> findByEmail(String email);
    
    boolean existsByEmail(String email);
    
    @Query("SELECT s FROM Student s WHERE s.user.id = :userId")
    Optional<Student> findByUserId(String userId);

    @Deprecated
    Optional<Student> findByUser_Id(String userId);

    boolean existsByStudentNumber(String studentNumber);
    
    Page<Student> findByStatus(StudentStatus status, Pageable pageable);
    List<Student> findByStatus(StudentStatus status);
    
    Page<Student> findByClazzId(String classId, Pageable pageable);
    
    @Query("SELECT s FROM Student s WHERE " +
           "LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(s.studentNumber) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(s.email) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Student> searchByKeyword(String keyword, Pageable pageable);
    
    @Query("SELECT AVG(s.gpa) FROM Student s WHERE s.status = 'ENROLLED'")
    Double calculateAverageGpa();

    @Query("SELECT AVG(s.attendance) FROM Student s WHERE s.status = 'ENROLLED'")
    Double calculateAverageAttendance();
    
    long countByStatus(StudentStatus status);
    long countByClazzId(String classId);
    
    List<Student> findByClazzId(String classId);
}
