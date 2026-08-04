package com.smartsms.common.config;

import com.smartsms.activity.service.ActivityService;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;

@RestController
@Profile("dev")
public class SeedController {

    private final DataSeeder dataSeeder;
    private final ActivityService activityService;

    public SeedController(DataSeeder dataSeeder, ActivityService activityService) {
        this.dataSeeder = dataSeeder;
        this.activityService = activityService;
    }

    @GetMapping("/api/test/seed")
    public String seed(Authentication authentication) {
        dataSeeder.run();
        String username = authentication != null && authentication.isAuthenticated() ? authentication.getName() : "anonymous";
        activityService.logActivity(username, "SYSTEM_SEED", "/api/test/seed", "system", "success");
        return "Database Seeded Automatically!";
    }
}
