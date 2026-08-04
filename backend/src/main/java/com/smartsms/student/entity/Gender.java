package com.smartsms.student.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Gender {
    MALE("男"),
    FEMALE("女");
    
    private final String value;
    
    Gender(String value) { this.value = value; }
    
    @JsonValue
    public String getValue() { return value; }
    
    @JsonCreator
    public static Gender fromValue(String value) {
        if (value == null) return MALE;
        for (Gender g : values()) {
            if (g.value.equals(value) || g.name().equalsIgnoreCase(value)) return g;
        }
        return value.toLowerCase().contains("女") || value.toLowerCase().equals("female") ? FEMALE : MALE;
    }
}
