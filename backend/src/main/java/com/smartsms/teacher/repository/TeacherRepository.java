package com.smartsms.teacher.repository;

import com.smartsms.teacher.entity.Teacher;
import com.smartsms.teacher.entity.TeacherStatus;
import com.smartsms.user.entity.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeacherRepository extends JpaRepository<Teacher, String> {
    
    Optional<Teacher> findByEmail(String email);
    
    boolean existsByEmail(String email);
    
    @Query("SELECT t FROM Teacher t WHERE t.user.id = :userId")
    Optional<Teacher> findByUserId(String userId);

    @Deprecated
    Optional<Teacher> findByUser_Id(String userId);

    boolean existsByTeacherNumber(String teacherNumber);

    @Query("SELECT t FROM Teacher t LEFT JOIN t.user u WHERE u IS NULL OR u.role = :role")
    Page<Teacher> findAllByUserRoleOrNoUser(Role role, Pageable pageable);

    @Query("SELECT t FROM Teacher t LEFT JOIN t.user u " +
           "WHERE t.status = :status AND (u IS NULL OR u.role = :role)")
    Page<Teacher> findByStatusAndUserRoleOrNoUser(TeacherStatus status, Role role, Pageable pageable);

    @Query("SELECT t FROM Teacher t LEFT JOIN t.user u " +
           "WHERE t.department = :department AND (u IS NULL OR u.role = :role)")
    Page<Teacher> findByDepartmentAndUserRoleOrNoUser(String department, Role role, Pageable pageable);

    @Query("SELECT t FROM Teacher t LEFT JOIN t.user u WHERE " +
           "(LOWER(t.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(t.teacherNumber) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(t.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(t.department) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (u IS NULL OR u.role = :role)")
    Page<Teacher> searchByKeywordAndUserRoleOrNoUser(String keyword, Role role, Pageable pageable);
    
    long countByStatus(TeacherStatus status);
    
    @Query("SELECT DISTINCT t.department FROM Teacher t LEFT JOIN t.user u " +
           "WHERE t.department IS NOT NULL AND (u IS NULL OR u.role = :role)")
    List<String> findAllDepartmentsByUserRoleOrNoUser(Role role);

    @Deprecated
    @Query("SELECT DISTINCT t.department FROM Teacher t WHERE t.department IS NOT NULL")
    List<String> findAllDepartments();
}
