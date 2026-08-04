package com.smartsms.activity.controller;

import com.smartsms.activity.dto.ActivityDto;
import com.smartsms.activity.service.ActivityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/activities")
@Tag(name = "Activities", description = "活动日志接口")
public class ActivityController {

    private final ActivityService activityService;

    public ActivityController(ActivityService activityService) {
        this.activityService = activityService;
    }

    @GetMapping
    @Operation(summary = "获取活动列表", description = "分页获取最近活动")
    public ResponseEntity<Page<ActivityDto>> getActivities(
            @PageableDefault(size = 20) Pageable pageable,
            @RequestParam(required = false) String user,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Authentication authentication) {
        String effectiveUser = user;
        boolean admin = isAdmin(authentication);
        if (!admin) {
            effectiveUser = authentication != null ? authentication.getName() : user;
        }

        if ((keyword != null && !keyword.isBlank())
                || (level != null && !level.isBlank())
                || startDate != null
                || endDate != null) {
            if (admin) {
                return ResponseEntity.ok(activityService.searchActivities(keyword, category, level, startDate, endDate, pageable));
            }
            return ResponseEntity.ok(activityService.searchActivitiesByUser(effectiveUser, keyword, category, level, startDate, endDate, pageable));
        }

        if (effectiveUser != null && !effectiveUser.isBlank()) {
            return ResponseEntity.ok(activityService.getActivitiesByUser(effectiveUser, pageable));
        }
        if (!admin) {
            return ResponseEntity.ok(activityService.getActivitiesByUser(authentication.getName(), pageable));
        }
        if (category != null && !category.isBlank()) {
            return ResponseEntity.ok(activityService.getActivitiesByCategory(category, pageable));
        }
        if (type != null && !type.isBlank()) {
            return ResponseEntity.ok(activityService.getActivitiesByType(type, pageable));
        }
        return ResponseEntity.ok(activityService.getRecentActivities(pageable));
    }

    @GetMapping("/export")
    @Operation(summary = "导出活动日志", description = "按筛选条件导出 CSV")
    public ResponseEntity<byte[]> exportActivities(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Authentication authentication) {
        Page<ActivityDto> page;
        if (isAdmin(authentication)) {
            page = activityService.searchActivities(keyword, category, level, startDate, endDate, Pageable.unpaged());
        } else {
            String username = authentication != null ? authentication.getName() : "";
            page = activityService.searchActivitiesByUser(username, keyword, category, level, startDate, endDate, Pageable.unpaged());
        }

        StringBuilder csv = new StringBuilder();
        csv.append("id,user,action,target,time,category,level\n");
        for (ActivityDto dto : page.getContent()) {
            csv.append(escapeCsv(dto.id())).append(',')
               .append(escapeCsv(dto.user())).append(',')
               .append(escapeCsv(dto.action())).append(',')
               .append(escapeCsv(dto.target())).append(',')
               .append(escapeCsv(dto.time())).append(',')
               .append(escapeCsv(dto.category())).append(',')
               .append(escapeCsv(dto.level()))
               .append('\n');
        }

        String datePart = LocalDate.now().format(DateTimeFormatter.ISO_DATE);
        String filename = "activity-logs-" + datePart + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.toString().getBytes());
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        String escaped = value.replace("\"", "\"\"");
        if (escaped.contains(",") || escaped.contains("\"") || escaped.contains("\n")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }

    private boolean isAdmin(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities() == null) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }
}
