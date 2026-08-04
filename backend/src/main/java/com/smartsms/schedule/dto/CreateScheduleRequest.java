package com.smartsms.schedule.dto;

import java.time.DayOfWeek;
import java.time.LocalTime;

public record CreateScheduleRequest(
    String courseId,
    String classroomId,
    DayOfWeek dayOfWeek,
    LocalTime startTime,
    LocalTime endTime,
    String semester
) {}
