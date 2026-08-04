package com.smartsms.clazz.repository;

import com.smartsms.clazz.entity.Clazz;
import com.smartsms.clazz.entity.ClazzStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ClazzRepository extends JpaRepository<Clazz, String> {
    
    Page<Clazz> findByStatus(ClazzStatus status, Pageable pageable);
    
    Page<Clazz> findByDepartment(String department, Pageable pageable);
    
    Page<Clazz> findByYear(Integer year, Pageable pageable);
    
    Page<Clazz> findByAdvisorId(String advisorId, Pageable pageable);
    
    @Query("SELECT c FROM Clazz c WHERE " +
           "LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(c.department) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Clazz> searchByKeyword(String keyword, Pageable pageable);
    
    long countByStatus(ClazzStatus status);
}
