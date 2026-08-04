package com.smartsms.activity.repository;

import com.smartsms.activity.entity.Activity;
import com.smartsms.activity.entity.ActivityCategory;
import com.smartsms.activity.entity.ActivityType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface ActivityRepository extends JpaRepository<Activity, String> {
    
    Page<Activity> findByUser(String user, Pageable pageable);
    
    Page<Activity> findByType(ActivityType type, Pageable pageable);

    Page<Activity> findByCategory(ActivityCategory category, Pageable pageable);

    @Modifying
    @Query("update Activity a set a.category = :category where a.category is null")
    int backfillNullCategory(ActivityCategory category);
    
    Page<Activity> findByTimeBetween(Instant start, Instant end, Pageable pageable);

    @Query("""
            SELECT a FROM Activity a
            WHERE (:keyword IS NULL OR :keyword = '' 
                OR LOWER(a.user) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(a.action) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(a.target) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:category IS NULL OR :category = '' OR a.category = :category)
              AND (:level IS NULL OR :level = '' OR a.type = :level)
              AND (:start IS NULL OR a.time >= :start)
              AND (:end IS NULL OR a.time <= :end)
            ORDER BY a.time DESC
            """)
    Page<Activity> search(
            @org.springframework.data.repository.query.Param("keyword") String keyword,
            @org.springframework.data.repository.query.Param("category") ActivityCategory category,
            @org.springframework.data.repository.query.Param("level") ActivityType level,
            @org.springframework.data.repository.query.Param("start") Instant start,
            @org.springframework.data.repository.query.Param("end") Instant end,
            Pageable pageable
    );

    @Query("""
            SELECT a FROM Activity a
            WHERE a.user = :user
              AND (:keyword IS NULL OR :keyword = ''
                OR LOWER(a.action) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(a.target) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:category IS NULL OR :category = '' OR a.category = :category)
              AND (:level IS NULL OR :level = '' OR a.type = :level)
              AND (:start IS NULL OR a.time >= :start)
              AND (:end IS NULL OR a.time <= :end)
            ORDER BY a.time DESC
            """)
    Page<Activity> searchByUser(
            @org.springframework.data.repository.query.Param("user") String user,
            @org.springframework.data.repository.query.Param("keyword") String keyword,
            @org.springframework.data.repository.query.Param("category") ActivityCategory category,
            @org.springframework.data.repository.query.Param("level") ActivityType level,
            @org.springframework.data.repository.query.Param("start") Instant start,
            @org.springframework.data.repository.query.Param("end") Instant end,
            Pageable pageable
    );
    
    Page<Activity> findAllByOrderByTimeDesc(Pageable pageable);
}
