package com.smartsms.activity.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "activities")
public class Activity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(name = "user_name", nullable = false)
    private String user;
    
    @Column(nullable = false)
    private String action;
    
    private String target;
    
    @Column(name = "activity_time", nullable = false)
    private Instant time = Instant.now();
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActivityType type;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "activity_category")
    private ActivityCategory category;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUser() { return user; }
    public void setUser(String user) { this.user = user; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getTarget() { return target; }
    public void setTarget(String target) { this.target = target; }
    public Instant getTime() { return time; }
    public void setTime(Instant time) { this.time = time; }
    public ActivityType getType() { return type; }
    public void setType(ActivityType type) { this.type = type; }
    public ActivityCategory getCategory() { return category; }
    public void setCategory(ActivityCategory category) { this.category = category; }
}
