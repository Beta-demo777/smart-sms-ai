package com.smartsms.schedule.controller;

import com.smartsms.schedule.dto.CreateScheduleRequest;
import com.smartsms.schedule.entity.ScheduleItem;
import com.smartsms.schedule.service.ScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/schedules")
@RequiredArgsConstructor
public class ScheduleController {
    
    private final ScheduleService scheduleService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ScheduleItem> createScheduleItem(@RequestBody CreateScheduleRequest request) {
        return ResponseEntity.ok(scheduleService.addScheduleItem(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ScheduleItem> updateScheduleItem(@PathVariable String id, @RequestBody CreateScheduleRequest request) {
        return ResponseEntity.ok(scheduleService.updateScheduleItem(id, request));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ScheduleItem>> getAllSchedules() {
        return ResponseEntity.ok(scheduleService.getAllItems());
    }
    
    @GetMapping("/course/{courseId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ScheduleItem>> getByCourse(@PathVariable String courseId) {
        return ResponseEntity.ok(scheduleService.getScheduleByCourse(courseId));
    }
    
    @GetMapping("/classroom/{classroomId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ScheduleItem>> getByClassroom(@PathVariable String classroomId) {
        return ResponseEntity.ok(scheduleService.getScheduleByClassroom(classroomId));
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER','STUDENT')")
    public ResponseEntity<List<ScheduleItem>> getByStudent(@PathVariable String studentId) {
        return ResponseEntity.ok(scheduleService.getScheduleByStudent(studentId));
    }

    @GetMapping("/teacher/{teacherId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<List<ScheduleItem>> getByTeacher(@PathVariable String teacherId) {
        return ResponseEntity.ok(scheduleService.getScheduleByTeacher(teacherId));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteScheduleItem(@PathVariable String id) {
        scheduleService.deleteScheduleItem(id);
        return ResponseEntity.ok().build();
    }
}
