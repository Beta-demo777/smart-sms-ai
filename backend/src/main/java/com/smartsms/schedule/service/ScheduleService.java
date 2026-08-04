package com.smartsms.schedule.service;

import com.smartsms.classroom.entity.Classroom;
import com.smartsms.classroom.repository.ClassroomRepository;
import com.smartsms.common.exception.ResourceNotFoundException;
import com.smartsms.course.entity.Course;
import com.smartsms.course.repository.CourseRepository;
import com.smartsms.schedule.dto.CreateScheduleRequest;
import com.smartsms.schedule.entity.ScheduleItem;
import com.smartsms.schedule.repository.ScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
public class ScheduleService {
    
    private final ScheduleRepository scheduleRepository;
    private final CourseRepository courseRepository;
    private final ClassroomRepository classroomRepository;

    public ScheduleItem addScheduleItem(CreateScheduleRequest request) {
        if (!request.startTime().isBefore(request.endTime())) {
            throw new IllegalArgumentException("Start time must be earlier than end time");
        }

        // Check Room Conflict
        List<ScheduleItem> roomConflicts = scheduleRepository.findConflictsByRoom(
            request.classroomId(), 
            request.dayOfWeek(), 
            request.startTime(), 
            request.endTime()
        );
        if (!roomConflicts.isEmpty()) {
            throw new IllegalStateException("Classroom is already booked for this time slot.");
        }

        Course course = courseRepository.findById(request.courseId())
            .orElseThrow(() -> new ResourceNotFoundException("Course", "id", request.courseId()));
            
        // Check Teacher Conflict
        if (course.getTeacher() != null) {
            List<ScheduleItem> teacherConflicts = scheduleRepository.findConflictsByTeacher(
                course.getTeacher().getId(),
                request.dayOfWeek(),
                request.startTime(),
                request.endTime()
            );
            if (!teacherConflicts.isEmpty()) {
                 throw new IllegalStateException("Teacher is already teaching another class at this time.");
            }
        }

        Classroom classroom = classroomRepository.findById(request.classroomId())
            .orElseThrow(() -> new ResourceNotFoundException("Classroom", "id", request.classroomId()));

        ScheduleItem item = new ScheduleItem();
        item.setCourse(course);
        item.setClassroom(classroom);
        item.setDayOfWeek(request.dayOfWeek());
        item.setStartTime(request.startTime());
        item.setEndTime(request.endTime());
        item.setSemester(request.semester());

        return scheduleRepository.save(item);
    }

    public ScheduleItem updateScheduleItem(String id, CreateScheduleRequest request) {
        if (!request.startTime().isBefore(request.endTime())) {
            throw new IllegalArgumentException("Start time must be earlier than end time");
        }

        ScheduleItem item = scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ScheduleItem", "id", id));

        List<ScheduleItem> roomConflicts = scheduleRepository.findConflictsByRoomExcluding(
                request.classroomId(),
                request.dayOfWeek(),
                request.startTime(),
                request.endTime(),
                id
        );
        if (!roomConflicts.isEmpty()) {
            throw new IllegalStateException("Classroom is already booked for this time slot.");
        }

        Course course = courseRepository.findById(request.courseId())
                .orElseThrow(() -> new ResourceNotFoundException("Course", "id", request.courseId()));

        if (course.getTeacher() != null) {
            List<ScheduleItem> teacherConflicts = scheduleRepository.findConflictsByTeacherExcluding(
                    course.getTeacher().getId(),
                    request.dayOfWeek(),
                    request.startTime(),
                    request.endTime(),
                    id
            );
            if (!teacherConflicts.isEmpty()) {
                throw new IllegalStateException("Teacher is already teaching another class at this time.");
            }
        }

        Classroom classroom = classroomRepository.findById(request.classroomId())
                .orElseThrow(() -> new ResourceNotFoundException("Classroom", "id", request.classroomId()));

        item.setCourse(course);
        item.setClassroom(classroom);
        item.setDayOfWeek(request.dayOfWeek());
        item.setStartTime(request.startTime());
        item.setEndTime(request.endTime());
        item.setSemester(request.semester());

        return scheduleRepository.save(item);
    }

    public List<ScheduleItem> getScheduleByCourse(String courseId) {
        return scheduleRepository.findByCourseId(courseId);
    }
    
    public List<ScheduleItem> getScheduleByClassroom(String classroomId) {
        return scheduleRepository.findByClassroomId(classroomId);
    }
    
    public List<ScheduleItem> getScheduleByStudent(String studentId) {
        return scheduleRepository.findByStudentId(studentId);
    }

    public List<ScheduleItem> getScheduleByTeacher(String teacherId) {
        return scheduleRepository.findByTeacherId(teacherId);
    }

    public List<ScheduleItem> getAllItems() {
        return scheduleRepository.findAll();
    }
    
    public void deleteScheduleItem(String id) {
        if (!scheduleRepository.existsById(id)) {
            throw new ResourceNotFoundException("ScheduleItem", "id", id);
        }
        scheduleRepository.deleteById(id);
    }
}
