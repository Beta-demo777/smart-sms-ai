package com.smartsms.teacher.entity;

import com.fasterxml.jackson.annotation.JsonValue;

public enum TeacherStatus {
    ACTIVE("在职"),
    ON_LEAVE("休假"),
    RESIGNED("离职");
    
    private final String value;
    
    TeacherStatus(String value) { this.value = value; }
    
    @JsonValue
    public String getValue() { return value; }
    
    public static TeacherStatus fromValue(String value) {
        for (TeacherStatus s : values()) {
            if (s.value.equals(value)) return s;
        }
        throw new IllegalArgumentException("Unknown status: " + value);
    }
}
