package com.smartsms.attendance.controller;

import com.smartsms.attendance.dto.LeaveRequestDto;
import com.smartsms.attendance.dto.ReviewLeaveRequest;
import com.smartsms.attendance.dto.SubmitLeaveRequest;
import com.smartsms.attendance.entity.LeaveRequest;
import com.smartsms.attendance.service.LeaveService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/leaves")
@Tag(name = "Leave Management", description = "请假管理接口")
@RequiredArgsConstructor
public class LeaveController {

    private final LeaveService leaveService;

    @PostMapping
    @PreAuthorize("@accessGuard.canSubmitLeaveFor(#request.studentId())")
    @Operation(summary = "提交请假申请", description = "学生提交请假申请")
    public ResponseEntity<LeaveRequestDto> submitRequest(@RequestBody SubmitLeaveRequest request) {
        LeaveRequest leaveRequest = leaveService.submitRequest(
                request.studentId(),
                request.type(),
                request.startDate(),
                request.endDate(),
                request.reason()
        );
        return ResponseEntity.ok(toDto(leaveRequest));
    }

    @PutMapping("/{id}/review")
    @PreAuthorize("@accessGuard.canReviewLeaveAs(#request.reviewerId())")
    @Operation(summary = "审批请假申请", description = "教师审批请假申请")
    public ResponseEntity<LeaveRequestDto> reviewRequest(@PathVariable String id, @RequestBody ReviewLeaveRequest request) {
        LeaveRequest leaveRequest = leaveService.approveRequest(
                id,
                request.reviewerId(),
                request.status(),
                request.comment()
        );
        return ResponseEntity.ok(toDto(leaveRequest));
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    @Operation(summary = "获取待审批申请", description = "获取所有待审批的请假申请")
    public ResponseEntity<List<LeaveRequestDto>> getPendingRequests() {
        return ResponseEntity.ok(leaveService.getPendingRequests().stream()
                .map(this::toDto)
                .collect(Collectors.toList()));
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("@accessGuard.canViewStudentLeaveRequests(#studentId)")
    @Operation(summary = "获取学生申请", description = "获取指定学生的所有请假申请")
    public ResponseEntity<List<LeaveRequestDto>> getStudentRequests(@PathVariable String studentId) {
        return ResponseEntity.ok(leaveService.getStudentRequests(studentId).stream()
                .map(this::toDto)
                .collect(Collectors.toList()));
    }

    @GetMapping("/reviewer/{reviewerId}")
    @PreAuthorize("@accessGuard.canReviewLeaveAs(#reviewerId)")
    @Operation(summary = "获取审批人历史", description = "获取指定教师审批过的所有请假申请")
    public ResponseEntity<List<LeaveRequestDto>> getReviewerRequests(@PathVariable String reviewerId) {
        return ResponseEntity.ok(leaveService.getReviewerRequests(reviewerId).stream()
                .map(this::toDto)
                .collect(Collectors.toList()));
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "获取所有申请", description = "获取系统内所有的请假申请（仅限管理员使用）")
    public ResponseEntity<List<LeaveRequestDto>> getAllRequests() {
        return ResponseEntity.ok(leaveService.getAllRequests().stream()
                .map(this::toDto)
                .collect(Collectors.toList()));
    }

    private LeaveRequestDto toDto(LeaveRequest request) {
        return new LeaveRequestDto(
                request.getId(),
                request.getStudent().getId(),
                request.getStudent().getName(),
                request.getStudent().getAvatar(),
                request.getType(),
                request.getStartDate(),
                request.getEndDate(),
                request.getReason(),
                request.getStatus(),
                request.getReviewer() != null ? request.getReviewer().getName() : null,
                request.getReviewComment()
        );
    }
}
