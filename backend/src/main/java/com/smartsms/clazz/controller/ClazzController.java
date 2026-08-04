package com.smartsms.clazz.controller;

import com.smartsms.clazz.dto.ClazzDto;
import com.smartsms.clazz.dto.CreateClazzRequest;
import com.smartsms.clazz.dto.UpdateClazzRequest;
import com.smartsms.clazz.service.ClazzService;
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
@RequestMapping("/classes")
@Tag(name = "Classes", description = "班级管理接口")
public class ClazzController {

    private final ClazzService clazzService;

    public ClazzController(ClazzService clazzService) {
        this.clazzService = clazzService;
    }

    @GetMapping
    @Operation(summary = "获取班级列表", description = "分页获取所有班级")
    public ResponseEntity<Page<ClazzDto>> getAllClasses(
            @PageableDefault(size = 10) Pageable pageable,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {
        
        if (keyword != null && !keyword.isBlank()) {
            return ResponseEntity.ok(clazzService.searchClasses(keyword, pageable));
        }
        if (status != null && !status.isBlank()) {
            return ResponseEntity.ok(clazzService.getClassesByStatus(status, pageable));
        }
        return ResponseEntity.ok(clazzService.getAllClasses(pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取班级详情", description = "根据ID获取班级信息")
    public ResponseEntity<ClazzDto> getClassById(@PathVariable String id) {
        return ResponseEntity.ok(clazzService.getClassById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "创建班级", description = "创建新班级")
    public ResponseEntity<ClazzDto> createClass(@Valid @RequestBody CreateClazzRequest request) {
        return ResponseEntity.ok(clazzService.createClass(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "更新班级", description = "更新班级信息")
    public ResponseEntity<ClazzDto> updateClass(@PathVariable String id,
                                                @Valid @RequestBody UpdateClazzRequest request) {
        return ResponseEntity.ok(clazzService.updateClass(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "删除班级", description = "删除班级")
    public ResponseEntity<Void> deleteClass(@PathVariable String id) {
        clazzService.deleteClass(id);
        return ResponseEntity.noContent().build();
    }
}
