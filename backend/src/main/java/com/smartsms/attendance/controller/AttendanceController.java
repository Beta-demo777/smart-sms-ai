package com.smartsms.attendance.controller;

import com.smartsms.attendance.dto.AttendanceCheckInRequest;
import com.smartsms.attendance.dto.AttendanceDto;
import com.smartsms.attendance.entity.Attendance;
import com.smartsms.attendance.service.AttendanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/attendance")
@Tag(name = "Attendance", description = "考勤管理接口")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    @PostMapping("/checkin")
    @PreAuthorize("@accessGuard.canCheckInFor(#request.studentId())")
    @Operation(summary = "学生打卡", description = "记录学生考勤状态，date 可选（默认今日）")
    public ResponseEntity<AttendanceDto> checkIn(@RequestBody AttendanceCheckInRequest request) {
        LocalDate date = (request.date() != null && !request.date().isBlank())
                ? LocalDate.parse(request.date())
                : null;
        Attendance attendance = attendanceService.checkIn(
                request.studentId(), request.status(), request.notes(), date);
        return ResponseEntity.ok(toDto(attendance));
    }

    @PostMapping("/records")
    @PreAuthorize("@accessGuard.canCheckInFor(#request.studentId())")
    @Operation(summary = "新增考勤记录", description = "追加一条考勤记录（不覆盖同日记录）")
    public ResponseEntity<AttendanceDto> createRecord(@RequestBody AttendanceCheckInRequest request) {
        LocalDate date = (request.date() != null && !request.date().isBlank())
                ? LocalDate.parse(request.date())
                : null;
        Attendance attendance = attendanceService.createRecord(
                request.studentId(), request.status(), request.notes(), date);
        return ResponseEntity.ok(toDto(attendance));
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("@accessGuard.canViewStudentAttendance(#studentId)")
    @Operation(summary = "获取学生考勤", description = "获取指定学生的考勤记录")
    public ResponseEntity<List<AttendanceDto>> getStudentAttendance(@PathVariable String studentId) {
        return ResponseEntity.ok(attendanceService.getStudentAttendance(studentId).stream()
                .map(this::toDto)
                .collect(Collectors.toList()));
    }

    @GetMapping("/daily/{date}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    @Operation(summary = "获取每日考勤", description = "获取指定日期的所有考勤记录")
    public ResponseEntity<List<AttendanceDto>> getDailyAttendance(@PathVariable String date) {
        LocalDate localDate = LocalDate.parse(date);
        return ResponseEntity.ok(attendanceService.getDailyAttendance(localDate).stream()
                .map(this::toDto)
                .collect(Collectors.toList()));
    }

    @GetMapping("/monthly/{year}/{month}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    @Operation(summary = "获取月度考勤", description = "获取指定年月的所有考勤记录")
    public ResponseEntity<List<AttendanceDto>> getMonthlyAttendance(
            @PathVariable int year, @PathVariable int month) {
        return ResponseEntity.ok(attendanceService.getMonthlyAttendance(year, month).stream()
                .map(this::toDto)
                .collect(Collectors.toList()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    @Operation(summary = "删除考勤记录", description = "清除某条考勤记录（取消选中）")
    public ResponseEntity<Void> deleteAttendance(@PathVariable String id) {
        attendanceService.deleteAttendance(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/recalculate-rates")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "全量重算出勤率", description = "根据考勤明细重算所有学生 attendance 字段")
    public ResponseEntity<String> recalculateAllRates() {
        int processed = attendanceService.recalculateAllStudentAttendanceRates();
        return ResponseEntity.ok("Recalculated attendance rates for " + processed + " students");
    }

    private AttendanceDto toDto(Attendance attendance) {
        return new AttendanceDto(
                attendance.getId(),
                attendance.getStudent().getId(),
                attendance.getStudent().getName(),
                attendance.getDate(),
                attendance.getStatus(),
                attendance.getNotes()
        );
    }
}
