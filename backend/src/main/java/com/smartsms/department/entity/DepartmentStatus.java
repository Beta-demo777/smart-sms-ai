package com.smartsms.department.entity;

public enum DepartmentStatus {
    ACTIVE("启用"),
    INACTIVE("停用");

    private final String value;

    DepartmentStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
