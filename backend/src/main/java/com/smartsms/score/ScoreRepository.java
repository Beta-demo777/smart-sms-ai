package com.smartsms.score;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScoreRepository extends JpaRepository<Score, String> {
    @Query("SELECT s FROM Score s JOIN FETCH s.student JOIN FETCH s.exam WHERE s.exam.id = :examId")
    List<Score> findByExamId(@Param("examId") String examId);

    @Query("SELECT s FROM Score s JOIN FETCH s.student JOIN FETCH s.exam WHERE s.student.id = :studentId")
    List<Score> findByStudentId(@Param("studentId") String studentId);

    Optional<Score> findByExamIdAndStudentId(String examId, String studentId);
}
