package com.smartsms;

import com.smartsms.common.config.DataSeeder;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles({"test", "dev"})
@Disabled("Manual database seeding helper; do not run in CI.")
public class DataSeederTest {

    @Autowired
    private DataSeeder dataSeeder;

    @Test
    public void executeSeeder() {
        System.out.println("Starting Database Seeder from Test...");
        dataSeeder.run();
        System.out.println("Database Seeder Finished.");
    }
}
