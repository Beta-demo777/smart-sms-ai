package com.smartsms.classroom.dto;

import java.util.List;

public record ClassroomDto(
    String id,
    String name,
    Integer capacity,
    String type,
    String status,
    String location,
    List<String> equipment
) {}
