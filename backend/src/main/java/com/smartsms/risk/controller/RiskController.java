package com.smartsms.risk.controller;

import com.smartsms.risk.dto.RiskStudentDto;
import com.smartsms.risk.service.RiskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/risk")
@Tag(name = "Risk", description = "教务风险预警接口")
public class RiskController {

    private final RiskService riskService;

    public RiskController(RiskService riskService) {
        this.riskService = riskService;
    }

    @GetMapping("/students")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    @Operation(summary = "获取学生风险名单", description = "管理员返回全局风险名单；教师返回本人授课范围风险名单")
    public ResponseEntity<List<RiskStudentDto>> getStudentRisks(
            @RequestParam(defaultValue = "30") int limit,
            Authentication authentication
    ) {
        int safeLimit = Math.max(1, Math.min(limit, 200));
        boolean admin = isAdmin(authentication);
        String username = authentication != null ? authentication.getName() : "";
        return ResponseEntity.ok(riskService.getRiskStudentsByUsername(username, admin, safeLimit));
    }

    private boolean isAdmin(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities() == null) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }
}

