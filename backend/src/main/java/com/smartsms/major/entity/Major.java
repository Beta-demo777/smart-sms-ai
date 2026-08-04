package com.smartsms.major.entity;

import com.smartsms.common.audit.AuditableEntity;
import com.smartsms.department.entity.Department;
import jakarta.persistence.*;

@Entity
@Table(name = "majors")
public class Major extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false, unique = true)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    private String description;

    private String head;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MajorStatus status = MajorStatus.ACTIVE;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public Department getDepartment() {
        return department;
    }

    public void setDepartment(Department department) {
        this.department = department;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getHead() {
        return head;
    }

    public void setHead(String head) {
        this.head = head;
    }

    public MajorStatus getStatus() {
        return status;
    }

    public void setStatus(MajorStatus status) {
        this.status = status;
    }
}
