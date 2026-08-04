package com.smartsms.activity.entity;

import com.fasterxml.jackson.annotation.JsonValue;

public enum ActivityType {
    SUCCESS("success"),
    INFO("info"),
    WARNING("warning"),
    ERROR("error");
    
    private final String value;
    
    ActivityType(String value) { this.value = value; }
    
    @JsonValue
    public String getValue() { return value; }
    
    public static ActivityType fromValue(String value) {
        for (ActivityType t : values()) {
            if (t.value.equalsIgnoreCase(value)) return t;
        }
        throw new IllegalArgumentException("Unknown type: " + value);
    }
}
