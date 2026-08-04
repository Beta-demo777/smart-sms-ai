package com.smartsms.classroom.controller;

import com.smartsms.classroom.dto.ClassroomDto;
import com.smartsms.classroom.dto.CreateClassroomRequest;
import com.smartsms.classroom.dto.UpdateClassroomRequest;
import com.smartsms.classroom.service.ClassroomService;
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
@RequestMapping("/classrooms")
@Tag(name = "Classrooms", description = "教室管理接口")
public class ClassroomController {

    private final ClassroomService classroomService;

    public ClassroomController(ClassroomService classroomService) {
        this.classroomService = classroomService;
    }

    @GetMapping
    @Operation(summary = "获取教室列表", description = "分页获取所有教室")
    public ResponseEntity<Page<ClassroomDto>> getAllClassrooms(
            @PageableDefault(size = 10) Pageable pageable,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String keyword) {
        
        if (keyword != null && !keyword.isBlank()) {
            return ResponseEntity.ok(classroomService.searchClassrooms(keyword, pageable));
        }
        if (status != null && !status.isBlank()) {
            return ResponseEntity.ok(classroomService.getClassroomsByStatus(status, pageable));
        }
        if (type != null && !type.isBlank()) {
            return ResponseEntity.ok(classroomService.getClassroomsByType(type, pageable));
        }
        return ResponseEntity.ok(classroomService.getAllClassrooms(pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取教室详情", description = "根据ID获取教室信息")
    public ResponseEntity<ClassroomDto> getClassroomById(@PathVariable String id) {
        return ResponseEntity.ok(classroomService.getClassroomById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "创建教室", description = "创建新教室")
    public ResponseEntity<ClassroomDto> createClassroom(@Valid @RequestBody CreateClassroomRequest request) {
        return ResponseEntity.ok(classroomService.createClassroom(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "更新教室", description = "更新教室信息")
    public ResponseEntity<ClassroomDto> updateClassroom(@PathVariable String id,
                                                        @Valid @RequestBody UpdateClassroomRequest request) {
        return ResponseEntity.ok(classroomService.updateClassroom(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "删除教室", description = "删除教室")
    public ResponseEntity<Void> deleteClassroom(@PathVariable String id) {
        classroomService.deleteClassroom(id);
        return ResponseEntity.noContent().build();
    }
}
