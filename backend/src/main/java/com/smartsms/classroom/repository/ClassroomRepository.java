package com.smartsms.classroom.repository;

import com.smartsms.classroom.entity.Classroom;
import com.smartsms.classroom.entity.ClassroomStatus;
import com.smartsms.classroom.entity.ClassroomType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ClassroomRepository extends JpaRepository<Classroom, String> {
    
    Page<Classroom> findByStatus(ClassroomStatus status, Pageable pageable);
    
    Page<Classroom> findByType(ClassroomType type, Pageable pageable);
    
    @Query("SELECT c FROM Classroom c WHERE c.capacity >= :minCapacity")
    Page<Classroom> findByMinCapacity(Integer minCapacity, Pageable pageable);
    
    @Query("SELECT c FROM Classroom c WHERE " +
           "LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(c.location) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Classroom> searchByKeyword(String keyword, Pageable pageable);
    
    long countByStatus(ClassroomStatus status);
}
