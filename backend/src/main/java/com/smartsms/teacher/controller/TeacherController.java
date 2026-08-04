package com.smartsms.teacher.controller;

import com.smartsms.teacher.dto.CreateTeacherRequest;
import com.smartsms.teacher.dto.TeacherDto;
import com.smartsms.teacher.dto.UpdateTeacherRequest;
import com.smartsms.teacher.service.TeacherService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/teachers")
@Tag(name = "Teachers", description = "教师管理接口")
public class TeacherController {

    private final TeacherService teacherService;

    public TeacherController(TeacherService teacherService) {
        this.teacherService = teacherService;
    }

    @GetMapping
    @Operation(summary = "获取教师列表", description = "分页获取所有教师")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<TeacherDto>> getAllTeachers(
            @PageableDefault(size = 10) Pageable pageable,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String keyword) {
        
        if (keyword != null && !keyword.isBlank()) {
            return ResponseEntity.ok(teacherService.searchTeachers(keyword, pageable));
        }
        if (status != null && !status.isBlank()) {
            return ResponseEntity.ok(teacherService.getTeachersByStatus(status, pageable));
        }
        if (department != null && !department.isBlank()) {
            return ResponseEntity.ok(teacherService.getTeachersByDepartment(department, pageable));
        }
        return ResponseEntity.ok(teacherService.getAllTeachers(pageable));
    }

    @GetMapping("/departments")
    @Operation(summary = "获取所有院系", description = "获取所有院系列表")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<String>> getAllDepartments() {
        return ResponseEntity.ok(teacherService.getAllDepartments());
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取教师详情", description = "根据ID获取教师信息")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TeacherDto> getTeacherById(@PathVariable String id) {
        return ResponseEntity.ok(teacherService.getTeacherById(id));
    }

    @PostMapping
    @Operation(summary = "创建教师", description = "创建新教师")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TeacherDto> createTeacher(@Valid @RequestBody CreateTeacherRequest request) {
        return ResponseEntity.ok(teacherService.createTeacher(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新教师", description = "更新教师信息")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TeacherDto> updateTeacher(@PathVariable String id,
                                                    @Valid @RequestBody UpdateTeacherRequest request) {
        return ResponseEntity.ok(teacherService.updateTeacher(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除教师", description = "删除教师")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteTeacher(@PathVariable String id) {
        teacherService.deleteTeacher(id);
        return ResponseEntity.noContent().build();
    }
}
