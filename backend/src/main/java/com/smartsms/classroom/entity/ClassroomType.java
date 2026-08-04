package com.smartsms.classroom.entity;

import com.fasterxml.jackson.annotation.JsonValue;

public enum ClassroomType {
    REGULAR("普通教室"),
    LECTURE_HALL("阶梯教室"),
    MULTIMEDIA_LAB("多媒体实验室"),
    LANGUAGE_LAB("语音室"),
    CONFERENCE_ROOM("会议室");
    
    private final String value;
    
    ClassroomType(String value) { this.value = value; }
    
    @JsonValue
    public String getValue() { return value; }
    
    public static ClassroomType fromValue(String value) {
        for (ClassroomType t : values()) {
            if (t.value.equals(value)) return t;
        }
        throw new IllegalArgumentException("Unknown type: " + value);
    }
}
