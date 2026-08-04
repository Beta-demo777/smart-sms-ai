package com.smartsms.common.config;

import com.smartsms.common.service.AvatarBackfillService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class AvatarBackfillRunner implements CommandLineRunner {

    private final AvatarBackfillService avatarBackfillService;

    public AvatarBackfillRunner(AvatarBackfillService avatarBackfillService) {
        this.avatarBackfillService = avatarBackfillService;
    }

    @Override
    public void run(String... args) {
        avatarBackfillService.backfillAll();
    }
}
