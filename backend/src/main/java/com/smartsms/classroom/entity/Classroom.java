package com.smartsms.classroom.entity;

import com.smartsms.common.audit.AuditableEntity;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "classrooms")
public class Classroom extends AuditableEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false)
    private Integer capacity;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClassroomType type;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClassroomStatus status = ClassroomStatus.AVAILABLE;
    
    private String location;
    
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "classroom_equipment", joinColumns = @JoinColumn(name = "classroom_id"))
    @Column(name = "equipment")
    private List<String> equipment = new ArrayList<>();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
    public ClassroomType getType() { return type; }
    public void setType(ClassroomType type) { this.type = type; }
    public ClassroomStatus getStatus() { return status; }
    public void setStatus(ClassroomStatus status) { this.status = status; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public List<String> getEquipment() { return equipment; }
    public void setEquipment(List<String> equipment) { this.equipment = equipment; }
}
