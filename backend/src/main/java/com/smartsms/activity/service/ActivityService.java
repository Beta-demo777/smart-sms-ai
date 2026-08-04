package com.smartsms.activity.service;

import com.smartsms.activity.dto.ActivityDto;
import com.smartsms.activity.entity.Activity;
import com.smartsms.activity.entity.ActivityCategory;
import com.smartsms.activity.entity.ActivityType;
import com.smartsms.activity.repository.ActivityRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;

@Service
@Transactional
public class ActivityService {

    private final ActivityRepository activityRepository;

    public ActivityService(ActivityRepository activityRepository) {
        this.activityRepository = activityRepository;
    }

    public Page<ActivityDto> getRecentActivities(Pageable pageable) {
        return activityRepository.findAllByOrderByTimeDesc(pageable).map(this::toDto);
    }

    public Page<ActivityDto> getActivitiesByUser(String user, Pageable pageable) {
        return activityRepository.findByUser(user, pageable).map(this::toDto);
    }

    public Page<ActivityDto> getActivitiesByType(String type, Pageable pageable) {
        return activityRepository.findByType(ActivityType.fromValue(type), pageable).map(this::toDto);
    }

    public Page<ActivityDto> getActivitiesByCategory(String category, Pageable pageable) {
        return activityRepository.findByCategory(ActivityCategory.fromValue(category), pageable).map(this::toDto);
    }

    public Page<ActivityDto> searchActivities(String keyword,
                                              String category,
                                              String level,
                                              LocalDate startDate,
                                              LocalDate endDate,
                                              Pageable pageable) {
        ActivityCategory categoryEnum = (category == null || category.isBlank())
                ? null
                : ActivityCategory.fromValue(category);
        ActivityType levelEnum = (level == null || level.isBlank())
                ? null
                : ActivityType.fromValue(level);
        Instant start = null;
        Instant end = null;
        ZoneId zone = ZoneId.systemDefault();
        if (startDate != null) {
            start = startDate.atStartOfDay(zone).toInstant();
        }
        if (endDate != null) {
            ZonedDateTime endOfDay = endDate.plusDays(1).atStartOfDay(zone).minusNanos(1);
            end = endOfDay.toInstant();
        }
        return activityRepository.search(keyword, categoryEnum, levelEnum, start, end, pageable).map(this::toDto);
    }

    public Page<ActivityDto> searchActivitiesByUser(String user,
                                                    String keyword,
                                                    String category,
                                                    String level,
                                                    LocalDate startDate,
                                                    LocalDate endDate,
                                                    Pageable pageable) {
        ActivityCategory categoryEnum = (category == null || category.isBlank())
                ? null
                : ActivityCategory.fromValue(category);
        ActivityType levelEnum = (level == null || level.isBlank())
                ? null
                : ActivityType.fromValue(level);

        Instant start = null;
        Instant end = null;
        ZoneId zone = ZoneId.systemDefault();
        if (startDate != null) {
            start = startDate.atStartOfDay(zone).toInstant();
        }
        if (endDate != null) {
            ZonedDateTime endOfDay = endDate.plusDays(1).atStartOfDay(zone).minusNanos(1);
            end = endOfDay.toInstant();
        }

        return activityRepository.searchByUser(user, keyword, categoryEnum, levelEnum, start, end, pageable).map(this::toDto);
    }

    public void logActivity(String user, String action, String target, String category, String level) {
        Activity activity = new Activity();
        activity.setUser(user);
        activity.setAction(action);
        activity.setTarget(target);
        activity.setCategory(ActivityCategory.fromValue(category));
        activity.setType(ActivityType.fromValue(level));
        activity.setTime(Instant.now());
        activityRepository.save(activity);
    }

    private ActivityDto toDto(Activity activity) {
        String timeStr = formatTimeAgo(activity.getTime());
        String category = activity.getCategory() != null ? activity.getCategory().getValue() : "data";
        String level = activity.getType() != null ? activity.getType().getValue() : "info";
        return new ActivityDto(
                activity.getId(),
                activity.getUser(),
                activity.getAction(),
                activity.getTarget(),
                timeStr,
                category,
                level
        );
    }

    private String formatTimeAgo(Instant time) {
        Duration duration = Duration.between(time, Instant.now());
        if (duration.toMinutes() < 1) return "刚刚";
        if (duration.toMinutes() < 60) return duration.toMinutes() + "分钟前";
        if (duration.toHours() < 24) return duration.toHours() + "小时前";
        if (duration.toDays() < 7) return duration.toDays() + "天前";
        return time.toString().substring(0, 10);
    }
}
