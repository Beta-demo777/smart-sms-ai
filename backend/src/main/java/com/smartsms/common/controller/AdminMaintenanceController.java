package com.smartsms.common.controller;

import com.smartsms.common.service.AvatarBackfillService;
import com.smartsms.common.service.AvatarBackfillService.BackfillResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/maintenance")
@Tag(name = "Admin Maintenance", description = "管理员维护接口")
public class AdminMaintenanceController {

    private final AvatarBackfillService avatarBackfillService;

    public AdminMaintenanceController(AvatarBackfillService avatarBackfillService) {
        this.avatarBackfillService = avatarBackfillService;
    }

    @PostMapping("/avatars/backfill")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "回填默认头像", description = "为缺失头像的用户/学生/教师回填默认头像")
    public ResponseEntity<BackfillResult> backfillAvatars() {
        return ResponseEntity.ok(avatarBackfillService.backfillAll());
    }
}
