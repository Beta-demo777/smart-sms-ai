package com.smartsms.student.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum StudentStatus {
    ENROLLED("在读"),
    ON_LEAVE("休学"),
    GRADUATED("毕业");
    
    private final String value;
    
    StudentStatus(String value) { this.value = value; }
    
    @JsonValue
    public String getValue() { return value; }
    
    @JsonCreator
    public static StudentStatus fromValue(String value) {
        if (value == null) return ENROLLED;
        for (StudentStatus s : values()) {
            if (s.value.equals(value) || s.name().equalsIgnoreCase(value)) return s;
        }
        return switch (value.toLowerCase()) {
            case "active", "在读" -> ENROLLED;
            case "on_leave", "休学" -> ON_LEAVE;
            case "graduated", "毕业" -> GRADUATED;
            default -> ENROLLED;
        };
    }
}
