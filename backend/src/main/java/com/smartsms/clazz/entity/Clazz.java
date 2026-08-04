package com.smartsms.clazz.entity;

import com.smartsms.common.audit.AuditableEntity;
import com.smartsms.teacher.entity.Teacher;
import jakarta.persistence.*;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "classes")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Clazz extends AuditableEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String name;
    
    private String department;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "advisor_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Teacher advisor;
    
    @Column(name = "student_count")
    private Integer studentCount = 0;
    
    @Column(nullable = false)
    private Integer year;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClazzStatus status = ClazzStatus.ACTIVE;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public Teacher getAdvisor() { return advisor; }
    public void setAdvisor(Teacher advisor) { this.advisor = advisor; }
    public Integer getStudentCount() { return studentCount; }
    public void setStudentCount(Integer studentCount) { this.studentCount = studentCount; }
    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }
    public ClazzStatus getStatus() { return status; }
    public void setStatus(ClazzStatus status) { this.status = status; }
}
