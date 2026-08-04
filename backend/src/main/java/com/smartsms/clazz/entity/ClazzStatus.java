package com.smartsms.clazz.entity;

import com.fasterxml.jackson.annotation.JsonValue;

public enum ClazzStatus {
    ACTIVE("active"),
    GRADUATED("graduated");
    
    private final String value;
    
    ClazzStatus(String value) { this.value = value; }
    
    @JsonValue
    public String getValue() { return value; }
    
    public static ClazzStatus fromValue(String value) {
        for (ClazzStatus s : values()) {
            if (s.value.equalsIgnoreCase(value)) return s;
        }
        throw new IllegalArgumentException("Unknown status: " + value);
    }
}
