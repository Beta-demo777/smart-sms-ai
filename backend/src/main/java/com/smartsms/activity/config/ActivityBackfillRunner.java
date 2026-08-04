package com.smartsms.activity.config;

import com.smartsms.activity.entity.ActivityCategory;
import com.smartsms.activity.repository.ActivityRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ActivityBackfillRunner implements CommandLineRunner {

    private final ActivityRepository activityRepository;

    public ActivityBackfillRunner(ActivityRepository activityRepository) {
        this.activityRepository = activityRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        activityRepository.backfillNullCategory(ActivityCategory.DATA);
    }
}
