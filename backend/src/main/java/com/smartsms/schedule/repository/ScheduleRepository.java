package com.smartsms.schedule.repository;

import com.smartsms.schedule.entity.ScheduleItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface ScheduleRepository extends JpaRepository<ScheduleItem, String> {
    
    List<ScheduleItem> findByCourseId(String courseId);
    
    List<ScheduleItem> findByClassroomId(String classroomId);
    
    // Check for conflict in a room: overlapping time on same day
    @Query("SELECT s FROM ScheduleItem s WHERE s.classroom.id = :classroomId " +
           "AND s.dayOfWeek = :dayOfWeek " +
           "AND ((s.startTime < :endTime AND s.endTime > :startTime))")
    List<ScheduleItem> findConflictsByRoom(
        @Param("classroomId") String classroomId,
        @Param("dayOfWeek") DayOfWeek dayOfWeek,
        @Param("startTime") LocalTime startTime,
        @Param("endTime") LocalTime endTime
    );

    @Query("SELECT s FROM ScheduleItem s WHERE s.classroom.id = :classroomId " +
           "AND s.dayOfWeek = :dayOfWeek " +
           "AND s.id <> :excludeId " +
           "AND ((s.startTime < :endTime AND s.endTime > :startTime))")
    List<ScheduleItem> findConflictsByRoomExcluding(
        @Param("classroomId") String classroomId,
        @Param("dayOfWeek") DayOfWeek dayOfWeek,
        @Param("startTime") LocalTime startTime,
        @Param("endTime") LocalTime endTime,
        @Param("excludeId") String excludeId
    );

    // Check for conflict for a course (e.g. course can't be in 2 places at once - though database constraints prevent this usually, maybe teacher conflict?)
    // Finding conflicts for the TEACHER of the course would require joining Course -> Teacher.
    // Let's assume we want to query by Teacher ID eventually.
    // For now, let's just expose findByCourseId and Room Conflicts.

    @Query("SELECT s FROM ScheduleItem s WHERE s.course.teacher.id = :teacherId " +
            "AND s.dayOfWeek = :dayOfWeek " +
            "AND ((s.startTime < :endTime AND s.endTime > :startTime))")
    List<ScheduleItem> findConflictsByTeacher(
        @Param("teacherId") String teacherId,
        @Param("dayOfWeek") DayOfWeek dayOfWeek,
        @Param("startTime") LocalTime startTime,
        @Param("endTime") LocalTime endTime
    );

    @Query("SELECT s FROM ScheduleItem s WHERE s.course.teacher.id = :teacherId " +
            "AND s.dayOfWeek = :dayOfWeek " +
            "AND s.id <> :excludeId " +
            "AND ((s.startTime < :endTime AND s.endTime > :startTime))")
    List<ScheduleItem> findConflictsByTeacherExcluding(
        @Param("teacherId") String teacherId,
        @Param("dayOfWeek") DayOfWeek dayOfWeek,
        @Param("startTime") LocalTime startTime,
        @Param("endTime") LocalTime endTime,
        @Param("excludeId") String excludeId
    );

    @Query("SELECT s FROM ScheduleItem s WHERE s.course.id IN " +
           "(SELECT e.course.id FROM Enrollment e WHERE e.student.id = :studentId)")
    List<ScheduleItem> findByStudentId(@Param("studentId") String studentId);

    @Query("SELECT s FROM ScheduleItem s WHERE s.course.teacher.id = :teacherId")
    List<ScheduleItem> findByTeacherId(@Param("teacherId") String teacherId);
}
