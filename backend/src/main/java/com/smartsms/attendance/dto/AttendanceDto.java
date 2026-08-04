package com.smartsms.attendance.dto;

import com.smartsms.attendance.entity.Attendance;
import java.time.LocalDate;

public record AttendanceDto(
    String id,
    String studentId,
    String studentName,
    LocalDate date,
    Attendance.AttendanceStatus status,
    String notes
) {}
