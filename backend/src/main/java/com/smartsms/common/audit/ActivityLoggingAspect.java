package com.smartsms.common.audit;

import com.smartsms.activity.service.ActivityService;
import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Aspect
@Component
public class ActivityLoggingAspect {

    private final ActivityService activityService;

    public ActivityLoggingAspect(ActivityService activityService) {
        this.activityService = activityService;
    }

    @AfterReturning(
            pointcut = "within(@org.springframework.web.bind.annotation.RestController *) && " +
                    "(@annotation(org.springframework.web.bind.annotation.PostMapping) || " +
                    "@annotation(org.springframework.web.bind.annotation.PutMapping) || " +
                    "@annotation(org.springframework.web.bind.annotation.DeleteMapping) || " +
                    "@annotation(org.springframework.web.bind.annotation.PatchMapping))"
    )
    public void logSuccess(JoinPoint joinPoint) {
        HttpServletRequest request = getCurrentRequest();
        if (request == null || shouldSkip(request.getRequestURI())) {
            return;
        }

        String user = getCurrentUsername();
        String action = buildAction(request);
        String target = buildTarget(request, joinPoint);
        activityService.logActivity(user, action, target, "data", "success");
    }

    @AfterThrowing(
            pointcut = "within(@org.springframework.web.bind.annotation.RestController *) && " +
                    "(@annotation(org.springframework.web.bind.annotation.PostMapping) || " +
                    "@annotation(org.springframework.web.bind.annotation.PutMapping) || " +
                    "@annotation(org.springframework.web.bind.annotation.DeleteMapping) || " +
                    "@annotation(org.springframework.web.bind.annotation.PatchMapping))",
            throwing = "ex"
    )
    public void logError(JoinPoint joinPoint, Throwable ex) {
        HttpServletRequest request = getCurrentRequest();
        if (request == null || shouldSkip(request.getRequestURI())) {
            return;
        }

        String user = getCurrentUsername();
        String action = buildAction(request);
        String target = buildTarget(request, joinPoint);
        String targetWithError = target + " | " + ex.getClass().getSimpleName();
        activityService.logActivity(user, action, targetWithError, "data", "error");
    }

    private HttpServletRequest getCurrentRequest() {
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        if (attrs instanceof ServletRequestAttributes servletAttrs) {
            return servletAttrs.getRequest();
        }
        return null;
    }

    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return "anonymous";
        }
        return authentication.getName();
    }

    private String buildAction(HttpServletRequest request) {
        String uri = normalizeUri(request.getRequestURI());
        String method = request.getMethod();
        if (uri.startsWith("/api/students")) return actionFor(method, "学生");
        if (uri.startsWith("/api/teachers")) return actionFor(method, "教师");
        if (uri.startsWith("/api/classes")) return actionFor(method, "班级");
        if (uri.startsWith("/api/courses")) return actionFor(method, "课程");
        if (uri.startsWith("/api/classrooms")) return actionFor(method, "教室");
        if (uri.startsWith("/api/departments")) return actionFor(method, "院系");
        if (uri.startsWith("/api/majors")) return actionFor(method, "专业");
        if (uri.startsWith("/api/users")) return actionFor(method, "用户");
        if (uri.startsWith("/api/exams")) return actionFor(method, "考试");
        if (uri.startsWith("/api/assignments")) return actionFor(method, "作业");
        if (uri.startsWith("/api/schedule")) return actionFor(method, "课表");
        if (uri.startsWith("/api/attendance")) return actionFor(method, "考勤");
        if (uri.startsWith("/api/leave")) return actionFor(method, "请假");
        if (uri.startsWith("/api/score") || uri.startsWith("/api/scores")) return actionFor(method, "成绩");
        return method + " " + uri;
    }

    private String buildTarget(HttpServletRequest request, JoinPoint joinPoint) {
        String uri = normalizeUri(request.getRequestURI());
        String id = extractLastPathId(uri);
        String query = request.getQueryString();
        String name = extractNameArg(joinPoint);
        StringBuilder target = new StringBuilder();
        String entityLabel = entityLabelFor(uri);
        if (entityLabel != null && name != null) {
            target.append(entityLabel).append(" name=").append(name);
        } else {
            target.append(uri);
            if (id != null) {
                target.append(" id=").append(id);
            }
        }
        if (query != null && !query.isBlank()) {
            target.append(" ?").append(query);
        }
        return target.toString();
    }

    private String normalizeUri(String uri) {
        if (uri == null) {
            return "";
        }
        return uri.replaceAll("/+", "/").trim();
    }

    private String entityLabelFor(String uri) {
        if (uri == null) return null;
        if (uri.startsWith("/api/students")) return "学生";
        if (uri.startsWith("/api/teachers")) return "教师";
        if (uri.startsWith("/api/classes")) return "班级";
        if (uri.startsWith("/api/courses")) return "课程";
        if (uri.startsWith("/api/classrooms")) return "教室";
        if (uri.startsWith("/api/departments")) return "院系";
        if (uri.startsWith("/api/majors")) return "专业";
        if (uri.startsWith("/api/users")) return "用户";
        if (uri.startsWith("/api/exams")) return "考试";
        if (uri.startsWith("/api/assignments")) return "作业";
        if (uri.startsWith("/api/schedule")) return "课表";
        if (uri.startsWith("/api/attendance")) return "考勤";
        if (uri.startsWith("/api/leave")) return "请假";
        if (uri.startsWith("/api/score") || uri.startsWith("/api/scores")) return "成绩";
        return null;
    }

    private String extractLastPathId(String uri) {
        if (uri == null || uri.isBlank()) {
            return null;
        }
        String[] parts = uri.split("/");
        if (parts.length == 0) {
            return null;
        }
        String last = parts[parts.length - 1];
        if (last.isBlank() || last.equals("students") || last.equals("teachers") || last.equals("classes")
                || last.equals("courses") || last.equals("classrooms") || last.equals("departments")
                || last.equals("majors")
                || last.equals("users") || last.equals("exams") || last.equals("assignments")
                || last.equals("schedule") || last.equals("attendance") || last.equals("leave")
                || last.equals("score") || last.equals("scores")) {
            return null;
        }
        return last;
    }

    private String extractNameArg(JoinPoint joinPoint) {
        if (joinPoint == null || joinPoint.getArgs() == null) {
            return null;
        }
        for (Object arg : joinPoint.getArgs()) {
            if (arg == null) continue;
            // Map-like payloads
            if (arg instanceof java.util.Map<?, ?> map) {
                Object val = map.get("name");
                if (val != null) return String.valueOf(val);
            }
            // Try getter method getName()
            try {
                var method = arg.getClass().getMethod("getName");
                Object val = method.invoke(arg);
                if (val != null) return String.valueOf(val);
            } catch (Exception ignored) {
            }
            // Try record component "name"
            try {
                var method = arg.getClass().getMethod("name");
                Object val = method.invoke(arg);
                if (val != null) return String.valueOf(val);
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private String actionFor(String method, String entityLabel) {
        return switch (method) {
            case "POST" -> "新增" + entityLabel;
            case "PUT", "PATCH" -> "更新" + entityLabel;
            case "DELETE" -> "删除" + entityLabel;
            default -> method + " " + entityLabel;
        };
    }

    private boolean shouldSkip(String uri) {
        if (uri == null) {
            return true;
        }
        return uri.startsWith("/api/activities")
                || uri.startsWith("/api/auth")
                || uri.startsWith("/api/test/seed")
                || uri.startsWith("/api/ai")
                || uri.startsWith("/api/files")
                || uri.startsWith("/api/settings");
    }
}
