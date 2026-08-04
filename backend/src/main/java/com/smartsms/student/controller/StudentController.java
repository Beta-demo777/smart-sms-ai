package com.smartsms.student.controller;

import com.smartsms.student.dto.CreateStudentRequest;
import com.smartsms.student.dto.StudentDto;
import com.smartsms.student.dto.UpdateStudentRequest;
import com.smartsms.student.service.StudentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/students")
@Tag(name = "Students", description = "学生管理接口")
public class StudentController {

    private final StudentService studentService;

    public StudentController(StudentService studentService) {
        this.studentService = studentService;
    }

    @GetMapping
    @Operation(summary = "获取学生列表", description = "分页获取所有学生")
    public ResponseEntity<Page<StudentDto>> getAllStudents(
            @PageableDefault(size = 10) Pageable pageable,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String classId,
            @RequestParam(required = false) String keyword) {
        
        if (keyword != null && !keyword.isBlank()) {
            return ResponseEntity.ok(studentService.searchStudents(keyword, pageable));
        }
        if (status != null && !status.isBlank()) {
            return ResponseEntity.ok(studentService.getStudentsByStatus(status, pageable));
        }
        if (classId != null && !classId.isBlank()) {
            return ResponseEntity.ok(studentService.getStudentsByClass(classId, pageable));
        }
        return ResponseEntity.ok(studentService.getAllStudents(pageable));
    }

    @GetMapping("/stats")
    @Operation(summary = "获取学生统计数据", description = "获取系统整体学生统计，如GPA平均分和出勤率平均值，用于仪表盘展示")
    public ResponseEntity<com.smartsms.student.dto.StudentStatsDto> getStudentStats() {
        return ResponseEntity.ok(studentService.getStudentStats());
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取学生详情", description = "根据ID获取学生信息")
    public ResponseEntity<StudentDto> getStudentById(@PathVariable String id) {
        return ResponseEntity.ok(studentService.getStudentById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "创建学生", description = "创建新学生")
    public ResponseEntity<StudentDto> createStudent(@Valid @RequestBody CreateStudentRequest request) {
        return ResponseEntity.ok(studentService.createStudent(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "更新学生", description = "更新学生信息")
    public ResponseEntity<StudentDto> updateStudent(@PathVariable String id,
                                                    @Valid @RequestBody UpdateStudentRequest request) {
        return ResponseEntity.ok(studentService.updateStudent(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "删除学生", description = "删除学生")
    public ResponseEntity<Void> deleteStudent(@PathVariable String id) {
        studentService.deleteStudent(id);
        return ResponseEntity.noContent().build();
    }
}
