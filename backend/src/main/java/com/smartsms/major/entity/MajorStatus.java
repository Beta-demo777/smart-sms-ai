package com.smartsms.major.entity;

public enum MajorStatus {
    ACTIVE("启用"),
    INACTIVE("停用");

    private final String value;

    MajorStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
