package com.smartsms.major.repository;

import com.smartsms.major.entity.Major;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MajorRepository extends JpaRepository<Major, String> {
    @Override
    @EntityGraph(attributePaths = "department")
    Page<Major> findAll(Pageable pageable);

    @Override
    @EntityGraph(attributePaths = "department")
    Optional<Major> findById(String id);

    boolean existsByName(String name);
    boolean existsByCode(String code);
}
