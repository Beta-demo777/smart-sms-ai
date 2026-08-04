package com.smartsms.attendance.dto;

import com.smartsms.attendance.entity.LeaveRequest;
import java.time.LocalDate;

public record SubmitLeaveRequest(
    String studentId,
    LeaveRequest.LeaveType type,
    LocalDate startDate,
    LocalDate endDate,
    String reason
) {}
