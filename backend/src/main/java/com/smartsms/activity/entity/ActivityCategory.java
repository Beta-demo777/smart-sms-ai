package com.smartsms.activity.entity;

import com.fasterxml.jackson.annotation.JsonValue;

public enum ActivityCategory {
    AUTH("auth"),
    DATA("data"),
    SECURITY("security"),
    SYSTEM("system"),
    AI("ai");

    private final String value;

    ActivityCategory(String value) { this.value = value; }

    @JsonValue
    public String getValue() { return value; }

    public static ActivityCategory fromValue(String value) {
        for (ActivityCategory c : values()) {
            if (c.value.equalsIgnoreCase(value)) return c;
        }
        throw new IllegalArgumentException("Unknown category: " + value);
    }
}
