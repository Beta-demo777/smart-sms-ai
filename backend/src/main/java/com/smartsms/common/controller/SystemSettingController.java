package com.smartsms.common.controller;

import com.smartsms.common.entity.SystemSetting;
import com.smartsms.common.service.SystemSettingService;
import com.smartsms.activity.service.ActivityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/settings")
@RequiredArgsConstructor
public class SystemSettingController {
    
    private final SystemSettingService systemSettingService;
    private final ActivityService activityService;

    @GetMapping
    public ResponseEntity<List<SystemSetting>> getAllSettings() {
        return ResponseEntity.ok(systemSettingService.getAllSettings());
    }
    
    @PostMapping
    public ResponseEntity<SystemSetting> updateSetting(@RequestBody Map<String, String> payload,
                                                       Authentication authentication) {
        SystemSetting setting = systemSettingService.updateSetting(
            payload.get("key"), 
            payload.get("value"), 
            payload.get("description")
        );
        String username = authentication != null && authentication.isAuthenticated() ? authentication.getName() : "anonymous";
        activityService.logActivity(username, "SYSTEM_SETTING_UPDATE", "key=" + payload.get("key"), "system", "success");
        return ResponseEntity.ok(setting);
    }
}
