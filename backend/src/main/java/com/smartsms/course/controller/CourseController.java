package com.smartsms.course.controller;

import com.smartsms.course.dto.CourseDto;
import com.smartsms.course.dto.CreateCourseRequest;
import com.smartsms.course.dto.UpdateCourseRequest;
import com.smartsms.course.service.CourseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/courses")
@Tag(name = "Courses", description = "课程管理接口")
public class CourseController {

    private final CourseService courseService;

    public CourseController(CourseService courseService) {
        this.courseService = courseService;
    }

    @GetMapping
    @Operation(summary = "获取课程列表", description = "分页获取所有课程")
    public ResponseEntity<Page<CourseDto>> getAllCourses(
            @PageableDefault(size = 10) Pageable pageable,
            @RequestParam(required = false) String teacherId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String studentId) {
        
        if (keyword != null && !keyword.isBlank()) {
            return ResponseEntity.ok(courseService.searchCourses(keyword, pageable));
        }
        if (teacherId != null && !teacherId.isBlank()) {
            return ResponseEntity.ok(courseService.getCoursesByTeacher(teacherId, pageable));
        }
        return ResponseEntity.ok(courseService.getAllCourses(pageable, studentId));
    }

    @GetMapping("/available")
    @Operation(summary = "获取可选课程", description = "获取未满的课程")
    public ResponseEntity<Page<CourseDto>> getAvailableCourses(@PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(courseService.getAvailableCourses(pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取课程详情", description = "根据ID获取课程信息")
    public ResponseEntity<CourseDto> getCourseById(@PathVariable String id,
                                                   @RequestParam(required = false) String studentId) {
        return ResponseEntity.ok(courseService.getCourseById(id, studentId));
    }

    @PostMapping
    @Operation(summary = "创建课程", description = "创建新课程")
    public ResponseEntity<CourseDto> createCourse(@Valid @RequestBody CreateCourseRequest request) {
        return ResponseEntity.ok(courseService.createCourse(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新课程", description = "更新课程信息")
    public ResponseEntity<CourseDto> updateCourse(@PathVariable String id,
                                                  @Valid @RequestBody UpdateCourseRequest request) {
        return ResponseEntity.ok(courseService.updateCourse(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除课程", description = "删除课程")
    public ResponseEntity<Void> deleteCourse(@PathVariable String id) {
        courseService.deleteCourse(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{courseId}/enroll/{studentId}")
    @Operation(summary = "学生选课", description = "学生选择课程")
    public ResponseEntity<Void> enrollStudent(@PathVariable String courseId, @PathVariable String studentId) {
        courseService.enrollStudent(courseId, studentId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{courseId}/enroll/{studentId}")
    @Operation(summary = "学生退课", description = "学生退出课程")
    public ResponseEntity<Void> unenrollStudent(@PathVariable String courseId, @PathVariable String studentId) {
        courseService.unenrollStudent(courseId, studentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{courseId}/students")
    @Operation(summary = "获取选课学生", description = "获取课程的所有选课学生")
    public ResponseEntity<java.util.List<com.smartsms.student.dto.StudentDto>> getEnrolledStudents(@PathVariable String courseId) {
        return ResponseEntity.ok(courseService.getEnrolledStudents(courseId));
    }
}
