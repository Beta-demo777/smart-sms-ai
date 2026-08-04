package com.smartsms.attendance.dto;

import com.smartsms.attendance.entity.LeaveRequest;

public record ReviewLeaveRequest(
    String reviewerId,
    LeaveRequest.LeaveStatus status,
    String comment
) {}
