package com.smartsms.attendance.dto;

import com.smartsms.attendance.entity.LeaveRequest;
import java.time.LocalDate;

public record LeaveRequestDto(
    String id,
    String studentId,
    String studentName,
    String studentAvatar,
    LeaveRequest.LeaveType type,
    LocalDate startDate,
    LocalDate endDate,
    String reason,
    LeaveRequest.LeaveStatus status,
    String reviewerName,
    String reviewComment
) {}
