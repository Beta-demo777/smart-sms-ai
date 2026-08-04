package com.smartsms.major.dto;

public class MajorDto {
    private String id;
    private String name;
    private String code;
    private String departmentId;
    private String departmentName;
    private String description;
    private String head;
    private String status;
    private String createdAt;

    public MajorDto() {}

    public MajorDto(String id, String name, String code, String departmentId, String departmentName,
                    String description, String head, String status, String createdAt) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.departmentId = departmentId;
        this.departmentName = departmentName;
        this.description = description;
        this.head = head;
        this.status = status;
        this.createdAt = createdAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getDepartmentId() { return departmentId; }
    public void setDepartmentId(String departmentId) { this.departmentId = departmentId; }

    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getHead() { return head; }
    public void setHead(String head) { this.head = head; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
