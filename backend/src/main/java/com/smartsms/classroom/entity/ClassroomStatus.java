package com.smartsms.classroom.entity;

import com.fasterxml.jackson.annotation.JsonValue;

public enum ClassroomStatus {
    AVAILABLE("空闲"),
    IN_USE("使用中"),
    MAINTENANCE("维护中");
    
    private final String value;
    
    ClassroomStatus(String value) { this.value = value; }
    
    @JsonValue
    public String getValue() { return value; }
    
    public static ClassroomStatus fromValue(String value) {
        for (ClassroomStatus s : values()) {
            if (s.value.equals(value)) return s;
        }
        throw new IllegalArgumentException("Unknown status: " + value);
    }
}
