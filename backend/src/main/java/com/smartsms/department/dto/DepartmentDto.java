package com.smartsms.department.dto;

public class DepartmentDto {
    private String id;
    private String name;
    private String code;
    private String description;
    private String manager;
    private String contactEmail;
    private String status;
    private String createdAt;

    public DepartmentDto() {}

    public DepartmentDto(String id, String name, String code, String description, String manager, String contactEmail, String status, String createdAt) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.description = description;
        this.manager = manager;
        this.contactEmail = contactEmail;
        this.status = status;
        this.createdAt = createdAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getManager() { return manager; }
    public void setManager(String manager) { this.manager = manager; }
    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
