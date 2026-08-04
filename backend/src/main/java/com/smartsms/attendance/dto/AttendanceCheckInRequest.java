package com.smartsms.attendance.dto;

import com.smartsms.attendance.entity.Attendance;

public record AttendanceCheckInRequest(
    String studentId,
    Attendance.AttendanceStatus status,
    String notes,
    String date   // optional ISO date string "YYYY-MM-DD"; null = today
) {}
