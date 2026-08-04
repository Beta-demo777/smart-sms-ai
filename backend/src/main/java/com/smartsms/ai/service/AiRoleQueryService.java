package com.smartsms.ai.service;

import com.smartsms.assignment.entity.Assignment;
import com.smartsms.assignment.entity.AssignmentSubmission;
import com.smartsms.assignment.repository.AssignmentRepository;
import com.smartsms.assignment.repository.AssignmentSubmissionRepository;
import com.smartsms.attendance.repository.AttendanceRepository;
import com.smartsms.attendance.repository.LeaveRequestRepository;
import com.smartsms.clazz.entity.Clazz;
import com.smartsms.clazz.repository.ClazzRepository;
import com.smartsms.classroom.entity.Classroom;
import com.smartsms.classroom.repository.ClassroomRepository;
import com.smartsms.course.entity.Course;
import com.smartsms.course.entity.Enrollment;
import com.smartsms.course.repository.CourseRepository;
import com.smartsms.course.repository.EnrollmentRepository;
import com.smartsms.schedule.entity.ScheduleItem;
import com.smartsms.schedule.repository.ScheduleRepository;
import com.smartsms.risk.dto.RiskStudentDto;
import com.smartsms.risk.service.RiskService;
import com.smartsms.score.Score;
import com.smartsms.score.ScoreRepository;
import com.smartsms.student.entity.Student;
import com.smartsms.student.repository.StudentRepository;
import com.smartsms.teacher.entity.Teacher;
import com.smartsms.teacher.repository.TeacherRepository;
import com.smartsms.user.entity.Role;
import com.smartsms.user.entity.User;
import com.smartsms.user.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AiRoleQueryService {
    private enum Tool {
        STUDENT_PROFILE,
        STUDENT_SCORES,
        STUDENT_ATTENDANCE,
        STUDENT_SCHEDULE,
        STUDENT_COURSES,
        STUDENT_TEACHERS,
        STUDENT_ASSIGNMENTS,
        STUDENT_LEAVES,
        TEACHER_PROFILE,
        TEACHER_COURSES,
        TEACHER_SCORES,
        TEACHER_ATTENDANCE,
        TEACHER_SCHEDULE,
        TEACHER_ASSIGNMENTS,
        TEACHER_STUDENTS,
        TEACHER_COURSE_STUDENTS,
        TEACHER_CLASS_STUDENTS,
        ADMIN_PROFILE,
        ADMIN_OVERVIEW,
        ADMIN_CLASSES,
        ADMIN_STUDENTS,
        ADMIN_TEACHERS,
        ADMIN_COURSES,
        ADMIN_COURSE_STUDENTS,
        ADMIN_CLASS_STUDENTS,
        ADMIN_CLASSROOMS,
        ADMIN_SCHEDULE,
        ADMIN_TEACHER_COURSES,
        ADMIN_ATTENDANCE,
        ADMIN_SCORES,
        ADMIN_STUDENT_QUALITY,
        ADMIN_TEACHER_LOAD,
        ADMIN_RISK_LIST
    }

    private enum QueryIntent {
        IDENTITY,
        ACADEMIC,
        ATTENDANCE,
        SCHEDULE,
        COURSE,
        ASSIGNMENT,
        LEAVE,
        OVERVIEW,
        LIST_ALL,
        UNKNOWN
    }

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
    private final ScoreRepository scoreRepository;
    private final AttendanceRepository attendanceRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final ClazzRepository clazzRepository;
    private final ScheduleRepository scheduleRepository;
    private final CourseRepository courseRepository;
    private final ClassroomRepository classroomRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AssignmentRepository assignmentRepository;
    private final AssignmentSubmissionRepository submissionRepository;
    private final RiskService riskService;

    public AiRoleQueryService(UserRepository userRepository,
                              StudentRepository studentRepository,
                              TeacherRepository teacherRepository,
                              ScoreRepository scoreRepository,
                              AttendanceRepository attendanceRepository,
                              LeaveRequestRepository leaveRequestRepository,
                              ClazzRepository clazzRepository,
                              ScheduleRepository scheduleRepository,
                              CourseRepository courseRepository,
                              ClassroomRepository classroomRepository,
                              EnrollmentRepository enrollmentRepository,
                              AssignmentRepository assignmentRepository,
                              AssignmentSubmissionRepository submissionRepository,
                              RiskService riskService) {
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.teacherRepository = teacherRepository;
        this.scoreRepository = scoreRepository;
        this.attendanceRepository = attendanceRepository;
        this.leaveRequestRepository = leaveRequestRepository;
        this.clazzRepository = clazzRepository;
        this.scheduleRepository = scheduleRepository;
        this.courseRepository = courseRepository;
        this.classroomRepository = classroomRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.assignmentRepository = assignmentRepository;
        this.submissionRepository = submissionRepository;
        this.riskService = riskService;
    }

    public String enrichContext(String baseContext, String message, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || message == null || message.isBlank()) {
            return baseContext;
        }
        Optional<User> userOpt = userRepository.findByUsername(authentication.getName());
        if (userOpt.isEmpty()) {
            return baseContext;
        }
        User user = userOpt.get();

        Set<Tool> tools = resolveTools(user.getRole(), message);
        if (tools.isEmpty()) {
            return baseContext;
        }

        List<String> toolResults = executeTools(user, tools, message);
        if (toolResults.isEmpty()) {
            return baseContext;
        }

        StringBuilder systemData = new StringBuilder(
                "以下为系统实时查询结果（后端工具已执行，且仅限当前角色权限）。" +
                "你必须只基于以下结果回答；未出现的数据请明确说“当前未查询到”，不得编造姓名、课程或数字。\n"
        );
        for (String r : toolResults) {
            systemData.append(cleanForUser(r)).append("\n");
        }

        if (baseContext == null || baseContext.isBlank()) {
            return systemData.toString().trim();
        }
        return baseContext + "\n\n" + systemData.toString().trim();
    }

    public boolean shouldForceToolFirst(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }
        return containsAny(message,
                "我的信息", "我的档案", "我的资料", "个人信息", "本人信息",
                "我的学号", "我的工号", "我的成绩", "我的分数", "我的gpa",
                "我的考勤", "我的出勤", "我的签到", "我的课表", "我的课程",
                "我的作业", "我的请假", "我的假条",
                "我的老师", "任课老师", "授课老师", "带课老师", "还有呢",
                "我的学生", "学生情况", "学生名单", "都有哪些学生",
                "学生成绩", "成绩情况",
                "学生考勤", "考勤情况", "学生的考勤情况",
                "有老师吗", "有班级吗", "没有班级吗", "没有老师吗", "你知道我的排课情况吗",
                "do you know my", "my profile", "my info", "my schedule", "my courses", "my grades");
    }

    public boolean shouldGenerateAnalysis(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }
        return containsAny(message,
                "分析", "解读", "建议", "趋势", "风险", "问题", "诊断", "总结", "洞察", "评价",
                "analyze", "analysis", "insight", "recommendation");
    }

    public Optional<String> buildStrictReplyIfNeeded(String message, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || message == null || message.isBlank()) {
            return Optional.empty();
        }
        Optional<User> userOpt = userRepository.findByUsername(authentication.getName());
        if (userOpt.isEmpty()) {
            return Optional.empty();
        }
        User user = userOpt.get();
        Set<Tool> tools = resolveTools(user.getRole(), message);
        if (tools.isEmpty()) {
            return Optional.empty();
        }
        List<String> results = executeTools(user, tools, message);
        if (results.isEmpty()) {
            return Optional.of("当前未查询到相关数据。");
        }
        // Return pure grounded facts only; response style should be generated by model naturally.
        String cleaned = results.stream().map(this::cleanForUser).collect(Collectors.joining("\n"));
        return Optional.of(cleaned);
    }

    private List<String> executeTools(User user, Set<Tool> tools, String message) {
        List<String> results = new ArrayList<>();
        for (Tool tool : tools) {
            switch (tool) {
                case STUDENT_PROFILE -> {
                    String r = buildStudentProfile(user);
                    if (!r.isBlank()) results.add(r);
                }
                case STUDENT_SCORES -> {
                    String r = buildStudentScores(user);
                    if (!r.isBlank()) results.add(r);
                }
                case STUDENT_ATTENDANCE -> {
                    String r = buildStudentAttendance(user);
                    if (!r.isBlank()) results.add(r);
                }
                case STUDENT_SCHEDULE -> {
                    String r = buildStudentSchedule(user);
                    if (!r.isBlank()) results.add(r);
                }
                case STUDENT_COURSES -> {
                    String r = buildStudentCourses(user);
                    if (!r.isBlank()) results.add(r);
                }
                case STUDENT_TEACHERS -> {
                    String r = buildStudentTeachers(user);
                    if (!r.isBlank()) results.add(r);
                }
                case STUDENT_ASSIGNMENTS -> {
                    String r = buildStudentAssignments(user);
                    if (!r.isBlank()) results.add(r);
                }
                case STUDENT_LEAVES -> {
                    String r = buildStudentLeaves(user);
                    if (!r.isBlank()) results.add(r);
                }
                case TEACHER_PROFILE -> {
                    String r = buildTeacherProfile(user);
                    if (!r.isBlank()) results.add(r);
                }
                case TEACHER_COURSES -> {
                    String r = buildTeacherCourses(user);
                    if (!r.isBlank()) results.add(r);
                }
                case TEACHER_SCORES -> {
                    String r = buildTeacherScores(user);
                    if (!r.isBlank()) results.add(r);
                }
                case TEACHER_ATTENDANCE -> {
                    String r = buildTeacherAttendance(user);
                    if (!r.isBlank()) results.add(r);
                }
                case TEACHER_SCHEDULE -> {
                    String r = buildTeacherSchedule(user);
                    if (!r.isBlank()) results.add(r);
                }
                case TEACHER_ASSIGNMENTS -> {
                    String r = buildTeacherAssignments(user);
                    if (!r.isBlank()) results.add(r);
                }
                case TEACHER_STUDENTS -> {
                    String r = buildTeacherStudents(user);
                    if (!r.isBlank()) results.add(r);
                }
                case TEACHER_COURSE_STUDENTS -> {
                    String r = buildTeacherCourseStudents(user, message);
                    if (!r.isBlank()) results.add(r);
                }
                case TEACHER_CLASS_STUDENTS -> {
                    String r = buildTeacherClassStudents(user, message);
                    if (!r.isBlank()) results.add(r);
                }
                case ADMIN_PROFILE -> {
                    String r = buildAdminProfile(user);
                    if (!r.isBlank()) results.add(r);
                }
                case ADMIN_OVERVIEW -> {
                    String r = buildAdminOverview();
                    if (!r.isBlank()) results.add(r);
                }
                case ADMIN_CLASSES -> {
                    String r = buildAdminClasses();
                    if (!r.isBlank()) results.add(r);
                }
                case ADMIN_STUDENTS -> {
                    String r = buildAdminStudents();
                    if (!r.isBlank()) results.add(r);
                }
                case ADMIN_TEACHERS -> {
                    String r = buildAdminTeachers();
                    if (!r.isBlank()) results.add(r);
                }
                case ADMIN_COURSES -> {
                    String r = buildAdminCourses();
                    if (!r.isBlank()) results.add(r);
                }
                case ADMIN_COURSE_STUDENTS -> {
                    String r = buildAdminCourseStudents(message);
                    if (!r.isBlank()) results.add(r);
                }
                case ADMIN_CLASS_STUDENTS -> {
                    String r = buildAdminClassStudents(message);
                    if (!r.isBlank()) results.add(r);
                }
                case ADMIN_CLASSROOMS -> {
                    String r = buildAdminClassrooms();
                    if (!r.isBlank()) results.add(r);
                }
                case ADMIN_SCHEDULE -> {
                    String r = buildAdminSchedule();
                    if (!r.isBlank()) results.add(r);
                }
                case ADMIN_TEACHER_COURSES -> {
                    String r = buildAdminTeacherCourses();
                    if (!r.isBlank()) results.add(r);
                }
                case ADMIN_ATTENDANCE -> {
                    String r = buildAdminAttendance();
                    if (!r.isBlank()) results.add(r);
                }
                case ADMIN_SCORES -> {
                    String r = buildAdminScores();
                    if (!r.isBlank()) results.add(r);
                }
                case ADMIN_STUDENT_QUALITY -> {
                    String r = buildAdminStudentQuality();
                    if (!r.isBlank()) results.add(r);
                }
                case ADMIN_TEACHER_LOAD -> {
                    String r = buildAdminTeacherLoad();
                    if (!r.isBlank()) results.add(r);
                }
                case ADMIN_RISK_LIST -> {
                    String r = buildAdminRiskList();
                    if (!r.isBlank()) results.add(r);
                }
            }
        }
        return results;
    }

    private String buildStudentProfile(User user) {
        Optional<Student> studentOpt = studentRepository.findByUserId(user.getId());
        if (studentOpt.isEmpty()) {
            return "";
        }
        Student s = studentOpt.get();
        return String.join("\n",
                "[TOOL:student.getProfile]",
                "- 姓名: " + safe(s.getName()),
                "- 学号: " + safe(s.getStudentNumber()),
                "- 班级: " + (s.getClazz() != null ? safe(s.getClazz().getName()) : "-"),
                "- GPA: " + (s.getGpa() == null ? "-" : s.getGpa().toPlainString()),
                "- 出勤率: " + (s.getAttendance() == null ? "-" : s.getAttendance().toPlainString()) + "%",
                "- 学籍状态: " + localizeStudentStatus(s.getStatus() == null ? null : s.getStatus().name())
        );
    }

    private String buildStudentScores(User user) {
        Optional<Student> studentOpt = studentRepository.findByUserId(user.getId());
        if (studentOpt.isEmpty()) {
            return "";
        }
        Student student = studentOpt.get();
        List<String> lines = new ArrayList<>();
        List<Score> scores = scoreRepository.findByStudentId(student.getId());
        scores.sort(Comparator.comparing(s -> s.getExam().getDate(), Comparator.nullsLast(Comparator.reverseOrder())));
        double avg = scores.stream().mapToDouble(Score::getScoreValue).average().orElse(0.0);
        lines.add("[TOOL:student.getScores] 共 " + scores.size() + " 条，平均分 " + String.format(Locale.ROOT, "%.2f", avg));
        scores.stream().limit(5).forEach(s ->
                lines.add("- " + s.getExam().getTitle() + ": " + String.format(Locale.ROOT, "%.1f", s.getScoreValue()))
        );
        return String.join("\n", lines);
    }

    private String buildAdminCourseStudents(String message) {
        List<Course> courses = courseRepository.findAll();
        if (courses.isEmpty()) {
            return "[TOOL:admin.getCourseStudents] 当前无课程数据";
        }
        String msg = message == null ? "" : message;
        Optional<Course> matched = courses.stream()
                .filter(c -> c.getName() != null && !c.getName().isBlank())
                .filter(c -> msg.contains(c.getName()))
                .max(Comparator.comparingInt(c -> c.getName().length()));

        if (matched.isEmpty()) {
            String available = courses.stream()
                    .map(Course::getName)
                    .filter(Objects::nonNull)
                    .limit(20)
                    .collect(Collectors.joining("、"));
            return "[TOOL:admin.getCourseStudents] 未识别到课程名，请在问题中包含完整课程名。可用课程示例：" + available;
        }

        Course course = matched.get();
        List<Enrollment> enrollments = enrollmentRepository.findByCourseId(course.getId());
        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:admin.getCourseStudents] 课程: " + safe(course.getName()));
        lines.add("- 选课人数: " + enrollments.size());
        enrollments.stream()
                .map(Enrollment::getStudent)
                .filter(Objects::nonNull)
                .map(s -> "- " + safe(s.getName()) + " | 学号: " + safe(s.getStudentNumber()))
                .distinct()
                .sorted()
                .forEach(lines::add);
        return String.join("\n", lines);
    }

    private String buildAdminClassStudents(String message) {
        List<Student> students = studentRepository.findAll();
        if (students.isEmpty()) {
            return "[TOOL:admin.getClassStudents] 当前无学生数据";
        }

        String msg = message == null ? "" : message;
        List<String> classNames = students.stream()
                .map(Student::getClazz)
                .filter(Objects::nonNull)
                .map(c -> c.getName())
                .filter(Objects::nonNull)
                .filter(name -> !name.isBlank())
                .distinct()
                .toList();

        Optional<String> matchedClass = classNames.stream()
                .filter(msg::contains)
                .max(Comparator.comparingInt(String::length));

        if (matchedClass.isEmpty()) {
            String available = classNames.stream().limit(20).collect(Collectors.joining("、"));
            return "[TOOL:admin.getClassStudents] 未识别到班级名，请在问题中包含完整班级名。可用班级示例：" + available;
        }

        String className = matchedClass.get();
        List<Student> classStudents = students.stream()
                .filter(s -> s.getClazz() != null && className.equals(s.getClazz().getName()))
                .sorted(Comparator.comparing(Student::getStudentNumber, Comparator.nullsLast(String::compareTo)))
                .toList();

        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:admin.getClassStudents] 班级: " + className);
        lines.add("- 学生人数: " + classStudents.size());
        classStudents.forEach(s -> lines.add("- " + safe(s.getName()) + " | 学号: " + safe(s.getStudentNumber())));
        return String.join("\n", lines);
    }

    private String buildStudentAttendance(User user) {
        Optional<Student> studentOpt = studentRepository.findByUserId(user.getId());
        if (studentOpt.isEmpty()) {
            return "";
        }
        Student student = studentOpt.get();
        int attendanceCount = attendanceRepository.findByStudentId(student.getId()).size();
        String attendanceRate = student.getAttendance() == null ? "0" : student.getAttendance().toPlainString();
        return String.join("\n",
                "[TOOL:student.getAttendance] 记录数 " + attendanceCount + "，当前出勤率 " + attendanceRate + "%",
                "- 学生: " + student.getName() + " (" + student.getStudentNumber() + ")"
        );
    }

    private String buildStudentSchedule(User user) {
        Optional<Student> studentOpt = studentRepository.findByUserId(user.getId());
        if (studentOpt.isEmpty()) {
            return "";
        }
        Student student = studentOpt.get();
        List<ScheduleItem> items = scheduleRepository.findByStudentId(student.getId());
        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:student.getSchedule] 本学期排课 " + items.size() + " 条");
        items.stream()
                .sorted(Comparator.comparing(ScheduleItem::getDayOfWeek).thenComparing(ScheduleItem::getStartTime))
                .limit(8)
                .forEach(i -> lines.add("- " + i.getDayOfWeek() + " " + i.getStartTime() + "-" + i.getEndTime()
                        + " " + i.getCourse().getName() + " @" + i.getClassroom().getName()));
        return String.join("\n", lines);
    }

    private String buildStudentCourses(User user) {
        Optional<Student> studentOpt = studentRepository.findByUserId(user.getId());
        if (studentOpt.isEmpty()) {
            return "";
        }
        Student student = studentOpt.get();
        List<Enrollment> enrollments = enrollmentRepository.findByStudentId(student.getId());
        int selectedCredits = enrollments.stream()
                .map(Enrollment::getCourse)
                .filter(Objects::nonNull)
                .map(Course::getCredits)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .sum();
        int totalCredits = student.getTotalCredits() == null ? 0 : student.getTotalCredits();
        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:student.getCourses] 已选课程 " + enrollments.size() + " 门");
        lines.add("- 当前选课学分合计: " + selectedCredits);
        lines.add("- 累计已修学分: " + totalCredits);
        enrollments.stream().limit(10).forEach(e -> {
            Course c = e.getCourse();
            lines.add("- " + safe(c != null ? c.getName() : null)
                    + " | 教师: " + (c != null && c.getTeacher() != null ? safe(c.getTeacher().getName()) : "-"));
        });
        return String.join("\n", lines);
    }

    private String buildStudentTeachers(User user) {
        Optional<Student> studentOpt = studentRepository.findByUserId(user.getId());
        if (studentOpt.isEmpty()) {
            return "";
        }
        Student student = studentOpt.get();
        List<Enrollment> enrollments = enrollmentRepository.findByStudentId(student.getId());
        List<String> teacherLines = enrollments.stream()
                .map(Enrollment::getCourse)
                .filter(Objects::nonNull)
                .filter(c -> c.getTeacher() != null)
                .map(c -> safe(c.getTeacher().getName()) + " | 课程: " + safe(c.getName()))
                .distinct()
                .sorted()
                .toList();

        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:student.getTeachers] 任课老师 " + teacherLines.size() + " 位");
        if (teacherLines.isEmpty()) {
            lines.add("- 当前未查询到任课老师信息");
        } else {
            teacherLines.stream().limit(12).forEach(t -> lines.add("- " + t));
        }
        return String.join("\n", lines);
    }

    private String buildStudentAssignments(User user) {
        Optional<Student> studentOpt = studentRepository.findByUserId(user.getId());
        if (studentOpt.isEmpty()) {
            return "";
        }
        Student student = studentOpt.get();
        List<String> courseIds = enrollmentRepository.findByStudentId(student.getId()).stream()
                .map(e -> e.getCourse().getId())
                .collect(Collectors.toList());
        if (courseIds.isEmpty()) {
            return "[TOOL:student.getAssignments] 当前未选课，暂无作业";
        }
        List<Assignment> assignments = assignmentRepository.findByCourseIdIn(courseIds);
        List<AssignmentSubmission> submissions = submissionRepository.findByStudentId(student.getId());
        long graded = submissions.stream()
                .filter(s -> s.getStatus() == AssignmentSubmission.SubmissionStatus.GRADED)
                .count();

        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:student.getAssignments] 可见作业 " + assignments.size() + " 条，已提交 " + submissions.size() + " 条，已批改 " + graded + " 条");
        assignments.stream().limit(8).forEach(a ->
                lines.add("- " + safe(a.getTitle()) + " | 课程: " + safe(a.getCourse() != null ? a.getCourse().getName() : null)
                        + " | 截止: " + (a.getDueDate() == null ? "-" : a.getDueDate().toString()))
        );
        return String.join("\n", lines);
    }

    private String buildStudentLeaves(User user) {
        Optional<Student> studentOpt = studentRepository.findByUserId(user.getId());
        if (studentOpt.isEmpty()) {
            return "";
        }
        Student student = studentOpt.get();
        List<com.smartsms.attendance.entity.LeaveRequest> leaves = leaveRequestRepository.findByStudentId(student.getId());
        long pending = leaves.stream().filter(l -> l.getStatus() == com.smartsms.attendance.entity.LeaveRequest.LeaveStatus.PENDING).count();
        long approved = leaves.stream().filter(l -> l.getStatus() == com.smartsms.attendance.entity.LeaveRequest.LeaveStatus.APPROVED).count();
        long rejected = leaves.stream().filter(l -> l.getStatus() == com.smartsms.attendance.entity.LeaveRequest.LeaveStatus.REJECTED).count();
        return String.join("\n",
                "[TOOL:student.getLeaves] 请假记录 " + leaves.size() + " 条",
                "- 待审批: " + pending,
                "- 已通过: " + approved,
                "- 已拒绝: " + rejected
        );
    }

    private String buildTeacherCourses(User user) {
        Optional<Teacher> teacherOpt = teacherRepository.findByUserId(user.getId());
        if (teacherOpt.isEmpty()) {
            return "";
        }
        Teacher teacher = teacherOpt.get();
        List<String> lines = new ArrayList<>();
        List<Course> courses = courseRepository.findByTeacherId(teacher.getId(), PageRequest.of(0, 500)).getContent();
        lines.add("[TOOL:teacher.getCourses] 当前授课课程 " + courses.size() + " 门");
        courses.forEach(c -> lines.add("- " + c.getName() + "（已选 " + c.getEnrolledCount() + "/" + c.getMaxCapacity() + "）"));
        return String.join("\n", lines);
    }

    private String buildTeacherProfile(User user) {
        Optional<Teacher> teacherOpt = teacherRepository.findByUserId(user.getId());
        if (teacherOpt.isEmpty()) {
            return "";
        }
        Teacher t = teacherOpt.get();
        return String.join("\n",
                "[TOOL:teacher.getProfile]",
                "- 姓名: " + safe(t.getName()),
                "- 工号: " + safe(t.getTeacherNumber()),
                "- 职称: " + safe(t.getTitle()),
                "- 院系: " + safe(t.getDepartment()),
                "- 状态: " + localizeTeacherStatus(t.getStatus() == null ? null : t.getStatus().name())
        );
    }

    private String buildTeacherScores(User user) {
        Optional<Teacher> teacherOpt = teacherRepository.findByUserId(user.getId());
        if (teacherOpt.isEmpty()) {
            return "";
        }
        Teacher teacher = teacherOpt.get();
        Set<String> teacherCourseIds = courseRepository.findByTeacherId(teacher.getId(), PageRequest.of(0, 200)).getContent()
                .stream()
                .map(Course::getId)
                .collect(Collectors.toSet());

        if (teacherCourseIds.isEmpty()) {
            return "[TOOL:teacher.getScores] 当前未查询到授课课程，暂无成绩数据";
        }

        List<Score> relatedScores = scoreRepository.findAll().stream()
                .filter(s -> s.getExam() != null
                        && s.getExam().getCourse() != null
                        && teacherCourseIds.contains(s.getExam().getCourse().getId()))
                .toList();

        if (relatedScores.isEmpty()) {
            return "[TOOL:teacher.getScores] 当前授课课程暂无已录入成绩";
        }

        double avg = relatedScores.stream().mapToDouble(Score::getScoreValue).average().orElse(0.0);
        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:teacher.getScores] 共 " + relatedScores.size() + " 条成绩，平均分 " + String.format(Locale.ROOT, "%.2f", avg));

        relatedScores.stream()
                .sorted(Comparator.comparing((Score s) -> s.getExam().getDate(), Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(s -> s.getExam().getTitle(), Comparator.nullsLast(String::compareTo)))
                .limit(20)
                .forEach(s -> lines.add("- " + safe(s.getStudent() != null ? s.getStudent().getName() : null)
                        + "(" + safe(s.getStudent() != null ? s.getStudent().getStudentNumber() : null) + ")"
                        + " | " + safe(s.getExam() != null ? s.getExam().getTitle() : null)
                        + " | 课程: " + safe(s.getExam() != null && s.getExam().getCourse() != null ? s.getExam().getCourse().getName() : null)
                        + " | 分数: " + String.format(Locale.ROOT, "%.1f", s.getScoreValue())));
        return String.join("\n", lines);
    }

    private String buildTeacherAttendance(User user) {
        Optional<Teacher> teacherOpt = teacherRepository.findByUserId(user.getId());
        if (teacherOpt.isEmpty()) {
            return "";
        }
        Teacher teacher = teacherOpt.get();
        List<Course> courses = courseRepository.findByTeacherId(teacher.getId(), PageRequest.of(0, 200)).getContent();
        if (courses.isEmpty()) {
            return "[TOOL:teacher.getAttendance] 当前未查询到授课课程，暂无考勤数据";
        }

        Set<String> studentIds = courses.stream()
                .flatMap(c -> enrollmentRepository.findByCourseId(c.getId()).stream())
                .map(Enrollment::getStudent)
                .filter(Objects::nonNull)
                .map(Student::getId)
                .collect(Collectors.toSet());
        if (studentIds.isEmpty()) {
            return "[TOOL:teacher.getAttendance] 当前授课课程暂无学生，暂无考勤数据";
        }

        List<com.smartsms.attendance.entity.Attendance> allAttendance = studentIds.stream()
                .flatMap(id -> attendanceRepository.findByStudentId(id).stream())
                .toList();
        if (allAttendance.isEmpty()) {
            return "[TOOL:teacher.getAttendance] 当前授课学生暂无考勤记录";
        }

        long present = allAttendance.stream().filter(a -> a.getStatus() == com.smartsms.attendance.entity.Attendance.AttendanceStatus.PRESENT).count();
        long late = allAttendance.stream().filter(a -> a.getStatus() == com.smartsms.attendance.entity.Attendance.AttendanceStatus.LATE).count();
        long absent = allAttendance.stream().filter(a -> a.getStatus() == com.smartsms.attendance.entity.Attendance.AttendanceStatus.ABSENT).count();
        long leave = allAttendance.stream().filter(a -> a.getStatus() == com.smartsms.attendance.entity.Attendance.AttendanceStatus.LEAVE).count();

        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:teacher.getAttendance] 覆盖学生 " + studentIds.size() + " 人，考勤记录 " + allAttendance.size() + " 条");
        lines.add("- 到课: " + present + " | 迟到: " + late + " | 缺勤: " + absent + " | 请假: " + leave);

        List<Student> students = studentRepository.findAll().stream()
                .filter(s -> studentIds.contains(s.getId()))
                .toList();
        students.stream()
                .sorted(Comparator.comparing(Student::getAttendance, Comparator.nullsLast(Comparator.reverseOrder())))
                .forEach(s -> lines.add("- " + safe(s.getName())
                        + "(" + safe(s.getStudentNumber()) + ") | 出勤率: "
                        + (s.getAttendance() == null ? "-" : s.getAttendance().toPlainString()) + "%"));
        return String.join("\n", lines);
    }

    private String buildTeacherSchedule(User user) {
        Optional<Teacher> teacherOpt = teacherRepository.findByUserId(user.getId());
        if (teacherOpt.isEmpty()) {
            return "";
        }
        Teacher teacher = teacherOpt.get();
        List<ScheduleItem> items = scheduleRepository.findByTeacherId(teacher.getId());
        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:teacher.getSchedule] 排课 " + items.size() + " 条");
        items.stream()
                .sorted(Comparator.comparing(ScheduleItem::getDayOfWeek).thenComparing(ScheduleItem::getStartTime))
                .forEach(i -> lines.add("- " + i.getDayOfWeek() + " " + i.getStartTime() + "-" + i.getEndTime()
                        + " " + i.getCourse().getName() + " @" + i.getClassroom().getName()));
        return String.join("\n", lines);
    }

    private String buildTeacherAssignments(User user) {
        Optional<Teacher> teacherOpt = teacherRepository.findByUserId(user.getId());
        if (teacherOpt.isEmpty()) {
            return "";
        }
        Teacher teacher = teacherOpt.get();
        List<Assignment> assignments = assignmentRepository.findByTeacherIdAndActiveTrue(teacher.getId());
        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:teacher.getAssignments] 活跃作业 " + assignments.size() + " 条");
        assignments.forEach(a -> {
            int submitCount = submissionRepository.findByAssignmentId(a.getId()).size();
            lines.add("- " + safe(a.getTitle()) + " | 课程: " + safe(a.getCourse() != null ? a.getCourse().getName() : null)
                    + " | 提交数: " + submitCount);
        });
        return String.join("\n", lines);
    }

    private String buildTeacherStudents(User user) {
        Optional<Teacher> teacherOpt = teacherRepository.findByUserId(user.getId());
        if (teacherOpt.isEmpty()) {
            return "";
        }
        Teacher teacher = teacherOpt.get();
        List<Course> courses = courseRepository.findByTeacherId(teacher.getId(), PageRequest.of(0, 500)).getContent();
        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:teacher.getStudents] 授课课程 " + courses.size() + " 门");
        for (Course c : courses) {
            List<Enrollment> enrollments = enrollmentRepository.findByCourseId(c.getId());
            lines.add("- " + safe(c.getName()) + " | 选课人数: " + enrollments.size());
            String names = enrollments.stream()
                    .map(Enrollment::getStudent)
                    .filter(Objects::nonNull)
                    .map(s -> safe(s.getName()) + "(" + safe(s.getStudentNumber()) + ")")
                    .distinct()
                    .sorted()
                    .collect(Collectors.joining("、"));
            if (names.isBlank()) {
                lines.add("  学生名单: 暂无");
            } else {
                lines.add("  学生名单: " + names);
            }
        }
        return String.join("\n", lines);
    }

    private String buildTeacherCourseStudents(User user, String message) {
        Optional<Teacher> teacherOpt = teacherRepository.findByUserId(user.getId());
        if (teacherOpt.isEmpty()) {
            return "";
        }
        Teacher teacher = teacherOpt.get();
        List<Course> courses = courseRepository.findByTeacherId(teacher.getId(), PageRequest.of(0, 500)).getContent();
        if (courses.isEmpty()) {
            return "[TOOL:teacher.getCourseStudents] 当前未查询到授课课程";
        }

        String msg = message == null ? "" : message;
        Optional<Course> matched = courses.stream()
                .filter(c -> c.getName() != null && !c.getName().isBlank())
                .filter(c -> msg.contains(c.getName()))
                .max(Comparator.comparingInt(c -> c.getName().length()));

        if (matched.isEmpty()) {
            String available = courses.stream()
                    .map(Course::getName)
                    .filter(Objects::nonNull)
                    .limit(20)
                    .collect(Collectors.joining("、"));
            return "[TOOL:teacher.getCourseStudents] 未识别到课程名，请在问题中包含完整课程名。可用课程示例：" + available;
        }

        Course course = matched.get();
        List<Enrollment> enrollments = enrollmentRepository.findByCourseId(course.getId());
        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:teacher.getCourseStudents] 课程: " + safe(course.getName()));
        lines.add("- 选课人数: " + enrollments.size());
        enrollments.stream()
                .map(Enrollment::getStudent)
                .filter(Objects::nonNull)
                .map(s -> "- " + safe(s.getName()) + " | 学号: " + safe(s.getStudentNumber()))
                .distinct()
                .sorted()
                .forEach(lines::add);
        return String.join("\n", lines);
    }

    private String buildTeacherClassStudents(User user, String message) {
        Optional<Teacher> teacherOpt = teacherRepository.findByUserId(user.getId());
        if (teacherOpt.isEmpty()) {
            return "";
        }
        Teacher teacher = teacherOpt.get();
        List<Course> courses = courseRepository.findByTeacherId(teacher.getId(), PageRequest.of(0, 500)).getContent();
        if (courses.isEmpty()) {
            return "[TOOL:teacher.getClassStudents] 当前未查询到授课课程";
        }

        List<Student> scopedStudents = courses.stream()
                .flatMap(c -> enrollmentRepository.findByCourseId(c.getId()).stream())
                .map(Enrollment::getStudent)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (scopedStudents.isEmpty()) {
            return "[TOOL:teacher.getClassStudents] 当前授课课程暂无学生";
        }

        String msg = message == null ? "" : message;
        List<String> classNames = scopedStudents.stream()
                .map(Student::getClazz)
                .filter(Objects::nonNull)
                .map(c -> c.getName())
                .filter(Objects::nonNull)
                .filter(n -> !n.isBlank())
                .distinct()
                .toList();

        Optional<String> matchedClass = classNames.stream()
                .filter(msg::contains)
                .max(Comparator.comparingInt(String::length));

        if (matchedClass.isEmpty()) {
            String available = classNames.stream().limit(20).collect(Collectors.joining("、"));
            return "[TOOL:teacher.getClassStudents] 未识别到班级名，请在问题中包含完整班级名。可用班级示例：" + available;
        }

        String className = matchedClass.get();
        List<Student> classStudents = scopedStudents.stream()
                .filter(s -> s.getClazz() != null && className.equals(s.getClazz().getName()))
                .sorted(Comparator.comparing(Student::getStudentNumber, Comparator.nullsLast(String::compareTo)))
                .toList();

        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:teacher.getClassStudents] 班级: " + className);
        lines.add("- 学生人数: " + classStudents.size());
        classStudents.forEach(s -> lines.add("- " + safe(s.getName()) + " | 学号: " + safe(s.getStudentNumber())));
        return String.join("\n", lines);
    }

    private String buildAdminOverview() {
        long studentCount = studentRepository.count();
        long teacherCount = teacherRepository.count();
        long courseCount = courseRepository.count();
        Double avgGpa = studentRepository.calculateAverageGpa();
        Double avgAttendance = studentRepository.calculateAverageAttendance();

        return String.join("\n",
                "[TOOL:admin.getOverview]",
                "- 学生总数: " + studentCount,
                "- 教师总数: " + teacherCount,
                "- 课程总数: " + courseCount,
                "- 平均 GPA: " + String.format(Locale.ROOT, "%.2f", avgGpa == null ? 0.0 : avgGpa),
                "- 平均出勤率: " + String.format(Locale.ROOT, "%.2f", avgAttendance == null ? 0.0 : avgAttendance) + "%"
        );
    }

    private String buildAdminProfile(User user) {
        return String.join("\n",
                "[TOOL:admin.getProfile]",
                "- 姓名: " + safe(user.getName()),
                "- 用户名: " + safe(user.getUsername()),
                "- 角色: " + (user.getRole() == null ? "-" : user.getRole().getValue()),
                "- 状态: " + safe(user.getStatus()),
                "- 邮箱: " + safe(user.getEmail())
        );
    }

    private String buildAdminClasses() {
        List<Clazz> classes = clazzRepository.findAll();
        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:admin.listClasses] 班级总数 " + classes.size());
        classes.forEach(c -> lines.add("- " + safe(c.getName())
                + " | 院系: " + safe(c.getDepartment())
                + " | 年级: " + (c.getYear() == null ? "-" : c.getYear())
                + " | 班主任: " + safe(c.getAdvisor() != null ? c.getAdvisor().getName() : null)
                + " | 人数: " + safeNum(c.getStudentCount())));
        return String.join("\n", lines);
    }

    private String buildAdminStudents() {
        List<Student> students = studentRepository.findAll();
        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:admin.listStudents] 学生总数 " + students.size());
        students.forEach(s ->
                lines.add("- " + safe(s.getName()) + " | 学号: " + safe(s.getStudentNumber()))
        );
        return String.join("\n", lines);
    }

    private String buildAdminTeachers() {
        List<Teacher> teachers = teacherRepository.findAll();
        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:admin.listTeachers] 教师总数 " + teachers.size());
        teachers.forEach(t ->
                lines.add("- " + safe(t.getName()) + " | 工号: " + safe(t.getTeacherNumber()))
        );
        return String.join("\n", lines);
    }

    private String buildAdminCourses() {
        List<Course> courses = courseRepository.findAll();
        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:admin.listCourses] 课程总数 " + courses.size());
        courses.forEach(c ->
                lines.add("- " + safe(c.getName()) + " | 已选: " + safeNum(c.getEnrolledCount()) + "/" + safeNum(c.getMaxCapacity()))
        );
        return String.join("\n", lines);
    }

    private String buildAdminClassrooms() {
        List<Classroom> rooms = classroomRepository.findAll();
        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:admin.listClassrooms] 教室总数 " + rooms.size());
        rooms.forEach(r -> lines.add("- " + safe(r.getName())
                + " | 容量: " + safeNum(r.getCapacity())
                + " | 类型: " + (r.getType() == null ? "-" : r.getType().getValue())
                + " | 状态: " + (r.getStatus() == null ? "-" : r.getStatus().getValue())
                + " | 位置: " + safe(r.getLocation())));
        return String.join("\n", lines);
    }

    private String buildAdminSchedule() {
        List<ScheduleItem> items = scheduleRepository.findAll();
        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:admin.getSchedule] 排课总数 " + items.size());
        items.stream()
                .sorted(Comparator.comparing(ScheduleItem::getDayOfWeek).thenComparing(ScheduleItem::getStartTime))
                .forEach(i -> lines.add("- " + i.getDayOfWeek() + " " + i.getStartTime() + "-" + i.getEndTime()
                        + " | 课程: " + safe(i.getCourse() != null ? i.getCourse().getName() : null)
                        + " | 教师: " + safe(i.getCourse() != null && i.getCourse().getTeacher() != null ? i.getCourse().getTeacher().getName() : null)
                        + " | 教室: " + safe(i.getClassroom() != null ? i.getClassroom().getName() : null)));
        return String.join("\n", lines);
    }

    private String buildAdminTeacherCourses() {
        List<Teacher> teachers = teacherRepository.findAll();
        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:admin.getTeacherCourses] 教师授课情况 " + teachers.size() + " 位教师");
        teachers.forEach(t -> {
            List<Course> courses = courseRepository.findByTeacherId(t.getId(), PageRequest.of(0, 500)).getContent();
            lines.add("- " + safe(t.getName()) + "(" + safe(t.getTeacherNumber()) + ")" + " | 授课门数: " + courses.size());
            courses.forEach(c -> lines.add("  课程: " + safe(c.getName())
                    + " | 已选: " + safeNum(c.getEnrolledCount()) + "/" + safeNum(c.getMaxCapacity())));
        });
        return String.join("\n", lines);
    }

    private String buildAdminAttendance() {
        List<Student> students = studentRepository.findAll();
        List<com.smartsms.attendance.entity.Attendance> records = attendanceRepository.findAll();
        if (students.isEmpty()) {
            return "[TOOL:admin.getAttendance] 当前无学生数据";
        }

        long present = records.stream().filter(a -> a.getStatus() == com.smartsms.attendance.entity.Attendance.AttendanceStatus.PRESENT).count();
        long late = records.stream().filter(a -> a.getStatus() == com.smartsms.attendance.entity.Attendance.AttendanceStatus.LATE).count();
        long absent = records.stream().filter(a -> a.getStatus() == com.smartsms.attendance.entity.Attendance.AttendanceStatus.ABSENT).count();
        long leave = records.stream().filter(a -> a.getStatus() == com.smartsms.attendance.entity.Attendance.AttendanceStatus.LEAVE).count();

        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:admin.getAttendance] 全局考勤概览");
        lines.add("- 学生总数: " + students.size());
        lines.add("- 考勤记录总数: " + records.size());
        lines.add("- 到课: " + present + " | 迟到: " + late + " | 缺勤: " + absent + " | 请假: " + leave);

        students.stream()
                .sorted(Comparator.comparing(Student::getAttendance, Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(30)
                .forEach(s -> lines.add("- " + safe(s.getName()) + "(" + safe(s.getStudentNumber()) + ")"
                        + " | 出勤率: " + (s.getAttendance() == null ? "-" : s.getAttendance().toPlainString()) + "%"));
        return String.join("\n", lines);
    }

    private String buildAdminScores() {
        List<Score> scores = scoreRepository.findAll();
        if (scores.isEmpty()) {
            return "[TOOL:admin.getScores] 当前无成绩数据";
        }

        double avg = scores.stream().mapToDouble(Score::getScoreValue).average().orElse(0.0);
        long pass = scores.stream().filter(s -> s.getScoreValue() >= 60.0).count();
        long fail = scores.size() - pass;

        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:admin.getScores] 全局成绩概览");
        lines.add("- 成绩总条数: " + scores.size());
        lines.add("- 平均分: " + String.format(Locale.ROOT, "%.2f", avg));
        lines.add("- 及格: " + pass + " | 不及格: " + fail);

        scores.stream()
                .sorted(Comparator.comparingDouble(Score::getScoreValue))
                .limit(30)
                .forEach(s -> lines.add("- " + safe(s.getStudent() != null ? s.getStudent().getName() : null)
                        + "(" + safe(s.getStudent() != null ? s.getStudent().getStudentNumber() : null) + ")"
                        + " | " + safe(s.getExam() != null ? s.getExam().getTitle() : null)
                        + " | 课程: " + safe(s.getExam() != null && s.getExam().getCourse() != null ? s.getExam().getCourse().getName() : null)
                        + " | 分数: " + String.format(Locale.ROOT, "%.1f", s.getScoreValue())));
        return String.join("\n", lines);
    }

    private String buildAdminStudentQuality() {
        List<Student> students = studentRepository.findAll();
        if (students.isEmpty()) {
            return "[TOOL:admin.getStudentQuality] 当前无学生数据";
        }

        long excellent = students.stream().filter(s -> s.getGpa() != null && s.getGpa().doubleValue() >= 3.5).count();
        long good = students.stream().filter(s -> s.getGpa() != null && s.getGpa().doubleValue() >= 3.0 && s.getGpa().doubleValue() < 3.5).count();
        long warning = students.stream().filter(s -> s.getGpa() != null && s.getGpa().doubleValue() < 2.0).count();
        long lowAttendance = students.stream().filter(s -> s.getAttendance() != null && s.getAttendance().doubleValue() < 70).count();

        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:admin.getStudentQuality] 学生质量分析");
        lines.add("- 学生总数: " + students.size());
        lines.add("- GPA≥3.5: " + excellent + " 人");
        lines.add("- 3.0≤GPA<3.5: " + good + " 人");
        lines.add("- GPA<2.0: " + warning + " 人");
        lines.add("- 出勤率<70%: " + lowAttendance + " 人");
        return String.join("\n", lines);
    }

    private String buildAdminTeacherLoad() {
        List<Teacher> teachers = teacherRepository.findAll();
        if (teachers.isEmpty()) {
            return "[TOOL:admin.getTeacherLoad] 当前无教师数据";
        }

        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:admin.getTeacherLoad] 教师工作量分析（前 20 位）");

        teachers.stream().limit(20).forEach(t -> {
            List<Course> courses = courseRepository.findByTeacherId(t.getId(), PageRequest.of(0, 200)).getContent();
            int courseCount = courses.size();
            int studentCount = courses.stream()
                    .mapToInt(c -> c.getEnrolledCount() == null ? 0 : c.getEnrolledCount())
                    .sum();
            int activeAssignmentCount = assignmentRepository.findByTeacherIdAndActiveTrue(t.getId()).size();
            lines.add("- " + safe(t.getName()) + " | 课程: " + courseCount + " | 覆盖学生: " + studentCount + " | 活跃作业: " + activeAssignmentCount);
        });
        return String.join("\n", lines);
    }

    private String buildAdminRiskList() {
        List<RiskStudentDto> risks = riskService.getAdminRiskStudents(30);
        if (risks.isEmpty()) {
            return "[TOOL:admin.getRiskList] 当前无学生数据";
        }

        List<String> lines = new ArrayList<>();
        lines.add("[TOOL:admin.getRiskList] 学业风险名单 " + risks.size() + " 人（前 30 人）");
        risks.forEach(s -> {
            String gpaText = s.gpa() == null ? "-" : String.format(Locale.ROOT, "%.2f", s.gpa());
            String attendanceText = s.attendance() == null ? "-" : String.format(Locale.ROOT, "%.2f", s.attendance());
            String tags = (s.tags() == null || s.tags().isEmpty()) ? "-" : String.join("、", s.tags());
            lines.add("- " + safe(s.name()) + "(" + safe(s.studentNumber()) + ")"
                    + " | GPA: " + gpaText
                    + " | 出勤: " + attendanceText + "%"
                    + " | 风险等级: " + safe(s.severity())
                    + " | 风险标签: " + tags);
        });
        return String.join("\n", lines);
    }

    private Set<Tool> resolveTools(Role role, String message) {
        Set<Tool> tools = new LinkedHashSet<>();
        if (role == null || message == null || message.isBlank()) {
            return tools;
        }

        // 1) Explicit keyword mapping (high precision).
        if (role == Role.STUDENT) {
            if (containsAny(message, "我是谁", "我的信息", "本人信息", "我自己", "个人信息", "档案", "资料", "学籍", "学号", "profile", "info")) {
                tools.add(Tool.STUDENT_PROFILE);
            }
            if (containsAny(message, "成绩", "gpa", "分数", "考试")) {
                tools.add(Tool.STUDENT_SCORES);
            }
            if (containsAny(message, "考勤", "出勤", "签到")) {
                tools.add(Tool.STUDENT_ATTENDANCE);
            }
            if (containsAny(message, "课表", "课程", "上课", "schedule", "排课", "上课安排", "课次")) {
                tools.add(Tool.STUDENT_SCHEDULE);
            }
            if (containsAny(message, "选课", "我的课程", "课程", "学分")) {
                tools.add(Tool.STUDENT_COURSES);
            }
            if (containsAny(message, "作业", "assignment")) {
                tools.add(Tool.STUDENT_ASSIGNMENTS);
            }
            if (containsAny(message, "请假", "假条", "leave")) {
                tools.add(Tool.STUDENT_LEAVES);
            }
            if (containsAny(message, "老师", "教师", "任课老师", "授课老师")) {
                tools.add(Tool.STUDENT_TEACHERS);
            }
        } else if (role == Role.TEACHER) {
            boolean asksTeacherCourseStudents = containsAny(message, "哪些学生", "学生名单", "选课学生", "课程学生")
                    && containsAny(message, "课程");
            boolean asksTeacherClassStudents = containsAny(message, "哪些学生", "学生名单", "班级学生", "班里学生")
                    && containsAny(message, "班级", "班");
            if (containsAny(message, "我是谁", "我的信息", "本人信息", "我自己", "个人信息", "档案", "profile", "info")) {
                tools.add(Tool.TEACHER_PROFILE);
            }
            if (containsAny(message, "课程", "授课", "班级", "任课", "带课", "我的学生")) {
                tools.add(Tool.TEACHER_COURSES);
            }
            if (containsAny(message, "成绩", "分数", "考试", "学生成绩")) {
                tools.add(Tool.TEACHER_SCORES);
            }
            if (containsAny(message, "考勤", "出勤", "签到", "学生考勤")) {
                tools.add(Tool.TEACHER_ATTENDANCE);
            }
            if (containsAny(message, "课表", "schedule", "上课", "排课", "上课安排", "课次")) {
                tools.add(Tool.TEACHER_SCHEDULE);
            }
            if (containsAny(message, "作业", "assignment")) {
                tools.add(Tool.TEACHER_ASSIGNMENTS);
            }
            if (asksTeacherClassStudents) {
                tools.add(Tool.TEACHER_CLASS_STUDENTS);
            } else if (asksTeacherCourseStudents) {
                tools.add(Tool.TEACHER_COURSE_STUDENTS);
            } else if (containsAny(message, "学生", "名单", "选课人数")) {
                tools.add(Tool.TEACHER_STUDENTS);
            }
            if (containsAny(message, "班级", "我的学生", "学生名单")) {
                tools.add(Tool.TEACHER_COURSES);
                tools.add(Tool.TEACHER_STUDENTS);
            }
        } else if (role == Role.ADMIN) {
            boolean asksCourseStudents = containsAny(message, "哪些学生", "学生名单", "选课学生", "课程学生")
                    && containsAny(message, "课程");
            boolean asksClassStudents = containsAny(message, "哪些学生", "学生名单", "班级学生", "班里学生")
                    && containsAny(message, "班级", "班");
            if (containsAny(message, "我是谁", "我的信息", "本人信息", "我自己", "个人信息", "账号信息", "profile", "info")) {
                tools.add(Tool.ADMIN_PROFILE);
            }
            if (containsAny(message, "统计", "总数", "概览", "看板", "dashboard", "全局", "系统")) {
                tools.add(Tool.ADMIN_OVERVIEW);
            }
            if (containsAny(message, "班级", "classes")) {
                tools.add(Tool.ADMIN_CLASSES);
            }
            if (containsAny(message, "考勤", "出勤", "签到")) {
                tools.add(Tool.ADMIN_ATTENDANCE);
            }
            if (containsAny(message, "成绩", "分数", "考试", "学生成绩")) {
                tools.add(Tool.ADMIN_SCORES);
            }
            if (asksClassStudents) {
                tools.add(Tool.ADMIN_CLASS_STUDENTS);
            } else if (asksCourseStudents) {
                tools.add(Tool.ADMIN_COURSE_STUDENTS);
            } else if (containsAny(message, "学生", "student")) {
                tools.add(Tool.ADMIN_STUDENTS);
            }
            if (containsAny(message, "教师", "老师", "teacher")) {
                tools.add(Tool.ADMIN_TEACHERS);
            }
            if (containsAny(message, "授课情况", "教师授课", "老师授课", "授课")) {
                tools.add(Tool.ADMIN_TEACHER_COURSES);
            }
            if (!asksCourseStudents && containsAny(message, "课程", "course")) {
                tools.add(Tool.ADMIN_COURSES);
            }
            if (containsAny(message, "教室", "classroom")) {
                tools.add(Tool.ADMIN_CLASSROOMS);
            }
            if (containsAny(message, "排课", "课表", "schedule")) {
                tools.add(Tool.ADMIN_SCHEDULE);
            }
            if (containsAny(message, "质量", "学业质量", "gpa分布", "出勤分布")) {
                tools.add(Tool.ADMIN_STUDENT_QUALITY);
            }
            if (containsAny(message, "工作量", "教师负载", "负载", "负担")) {
                tools.add(Tool.ADMIN_TEACHER_LOAD);
            }
            if (containsAny(message, "风险", "预警", "异常名单", "风险名单")) {
                tools.add(Tool.ADMIN_RISK_LIST);
            }
        }

        // 2) Intent-driven fallback (recall-first): avoid relying only on exact keywords.
        if (tools.isEmpty()) {
            QueryIntent intent = inferIntent(message);
            tools.addAll(mapIntentToTools(role, intent));
        }

        // 3) Data-question default fallback: still return role-scoped real data when user asks generic questions.
        if (tools.isEmpty() && isDataQuestion(message)) {
            tools.addAll(defaultToolsForRole(role));
        }

        return tools;
    }

    private QueryIntent inferIntent(String message) {
        if (message == null || message.isBlank()) {
            return QueryIntent.UNKNOWN;
        }

        if (containsAny(message, "你知道我是谁", "知道我是谁", "我是谁", "我的情况", "我的资料", "我的档案", "个人情况", "个人信息", "my profile", "my info")) {
            return QueryIntent.IDENTITY;
        }
        if (containsAny(message, "成绩", "gpa", "分数", "考试", "绩点")) {
            return QueryIntent.ACADEMIC;
        }
        if (containsAny(message, "考勤", "出勤", "签到", "打卡")) {
            return QueryIntent.ATTENDANCE;
        }
        if (containsAny(message, "课表", "上课时间", "什么时候上课", "schedule", "排课", "上课安排", "课次")) {
            return QueryIntent.SCHEDULE;
        }
        if (containsAny(message, "课程", "学分", "选课", "修读", "老师", "教师", "任课老师", "授课老师", "instructor", "teacher")) {
            return QueryIntent.COURSE;
        }
        if (containsAny(message, "作业", "assignment", "提交", "批改")) {
            return QueryIntent.ASSIGNMENT;
        }
        if (containsAny(message, "请假", "假条", "leave")) {
            return QueryIntent.LEAVE;
        }
        if (containsAny(message, "概览", "总览", "统计", "看板", "全局", "总体")) {
            return QueryIntent.OVERVIEW;
        }
        if (containsAny(message, "全部", "所有", "都有哪些", "列表", "清单")) {
            return QueryIntent.LIST_ALL;
        }
        return QueryIntent.UNKNOWN;
    }

    private Set<Tool> mapIntentToTools(Role role, QueryIntent intent) {
        Set<Tool> tools = new LinkedHashSet<>();
        if (role == null || intent == QueryIntent.UNKNOWN) {
            return tools;
        }
        if (role == Role.STUDENT) {
            switch (intent) {
                case IDENTITY -> tools.add(Tool.STUDENT_PROFILE);
                case ACADEMIC -> tools.add(Tool.STUDENT_SCORES);
                case ATTENDANCE -> tools.add(Tool.STUDENT_ATTENDANCE);
                case SCHEDULE -> tools.add(Tool.STUDENT_SCHEDULE);
                case COURSE -> {
                    tools.add(Tool.STUDENT_COURSES);
                    tools.add(Tool.STUDENT_TEACHERS);
                }
                case ASSIGNMENT -> tools.add(Tool.STUDENT_ASSIGNMENTS);
                case LEAVE -> tools.add(Tool.STUDENT_LEAVES);
                case LIST_ALL -> {
                    tools.add(Tool.STUDENT_PROFILE);
                    tools.add(Tool.STUDENT_COURSES);
                    tools.add(Tool.STUDENT_TEACHERS);
                    tools.add(Tool.STUDENT_SCHEDULE);
                    tools.add(Tool.STUDENT_SCORES);
                    tools.add(Tool.STUDENT_ATTENDANCE);
                }
                case OVERVIEW -> {
                    tools.add(Tool.STUDENT_PROFILE);
                    tools.add(Tool.STUDENT_SCORES);
                    tools.add(Tool.STUDENT_ATTENDANCE);
                    tools.add(Tool.STUDENT_COURSES);
                }
                default -> {
                }
            }
        } else if (role == Role.TEACHER) {
            switch (intent) {
                case IDENTITY -> tools.add(Tool.TEACHER_PROFILE);
                case COURSE -> tools.add(Tool.TEACHER_COURSES);
                case ACADEMIC -> tools.add(Tool.TEACHER_SCORES);
                case ATTENDANCE -> tools.add(Tool.TEACHER_ATTENDANCE);
                case SCHEDULE -> tools.add(Tool.TEACHER_SCHEDULE);
                case ASSIGNMENT -> tools.add(Tool.TEACHER_ASSIGNMENTS);
                case LIST_ALL, OVERVIEW -> {
                    tools.add(Tool.TEACHER_PROFILE);
                    tools.add(Tool.TEACHER_COURSES);
                    tools.add(Tool.TEACHER_SCORES);
                    tools.add(Tool.TEACHER_ATTENDANCE);
                    tools.add(Tool.TEACHER_SCHEDULE);
                    tools.add(Tool.TEACHER_STUDENTS);
                }
                default -> {
                }
            }
        } else if (role == Role.ADMIN) {
            switch (intent) {
                case IDENTITY -> tools.add(Tool.ADMIN_PROFILE);
                case OVERVIEW -> {
                    tools.add(Tool.ADMIN_OVERVIEW);
                    tools.add(Tool.ADMIN_CLASSES);
                    tools.add(Tool.ADMIN_CLASSROOMS);
                    tools.add(Tool.ADMIN_SCHEDULE);
                    tools.add(Tool.ADMIN_TEACHER_COURSES);
                    tools.add(Tool.ADMIN_ATTENDANCE);
                    tools.add(Tool.ADMIN_SCORES);
                    tools.add(Tool.ADMIN_STUDENT_QUALITY);
                    tools.add(Tool.ADMIN_TEACHER_LOAD);
                    tools.add(Tool.ADMIN_RISK_LIST);
                }
                case LIST_ALL -> {
                    tools.add(Tool.ADMIN_OVERVIEW);
                    tools.add(Tool.ADMIN_CLASSES);
                    tools.add(Tool.ADMIN_CLASSROOMS);
                    tools.add(Tool.ADMIN_SCHEDULE);
                    tools.add(Tool.ADMIN_TEACHER_COURSES);
                    tools.add(Tool.ADMIN_ATTENDANCE);
                    tools.add(Tool.ADMIN_SCORES);
                    tools.add(Tool.ADMIN_STUDENTS);
                    tools.add(Tool.ADMIN_TEACHERS);
                    tools.add(Tool.ADMIN_COURSES);
                    tools.add(Tool.ADMIN_STUDENT_QUALITY);
                    tools.add(Tool.ADMIN_TEACHER_LOAD);
                    tools.add(Tool.ADMIN_RISK_LIST);
                }
                case ATTENDANCE -> tools.add(Tool.ADMIN_ATTENDANCE);
                case ACADEMIC -> tools.add(Tool.ADMIN_SCORES);
                case COURSE -> {
                    tools.add(Tool.ADMIN_COURSES);
                    tools.add(Tool.ADMIN_TEACHER_COURSES);
                }
                case SCHEDULE -> tools.add(Tool.ADMIN_SCHEDULE);
                default -> {
                }
            }
        }
        return tools;
    }

    private Set<Tool> defaultToolsForRole(Role role) {
        Set<Tool> tools = new LinkedHashSet<>();
        if (role == null) {
            return tools;
        }
        switch (role) {
            case STUDENT -> {
                tools.add(Tool.STUDENT_PROFILE);
                tools.add(Tool.STUDENT_COURSES);
                tools.add(Tool.STUDENT_TEACHERS);
                tools.add(Tool.STUDENT_SCHEDULE);
            }
            case TEACHER -> {
                tools.add(Tool.TEACHER_PROFILE);
                tools.add(Tool.TEACHER_COURSES);
                tools.add(Tool.TEACHER_SCORES);
                tools.add(Tool.TEACHER_ATTENDANCE);
                tools.add(Tool.TEACHER_SCHEDULE);
                tools.add(Tool.TEACHER_STUDENTS);
            }
            case ADMIN -> {
                tools.add(Tool.ADMIN_OVERVIEW);
                tools.add(Tool.ADMIN_CLASSES);
                tools.add(Tool.ADMIN_CLASSROOMS);
                tools.add(Tool.ADMIN_SCHEDULE);
                tools.add(Tool.ADMIN_TEACHER_COURSES);
                tools.add(Tool.ADMIN_ATTENDANCE);
                tools.add(Tool.ADMIN_SCORES);
                tools.add(Tool.ADMIN_STUDENT_QUALITY);
                tools.add(Tool.ADMIN_TEACHER_LOAD);
                tools.add(Tool.ADMIN_RISK_LIST);
            }
        }
        return tools;
    }

    public boolean isConflictingWithFacts(String modelReply, String groundedFacts) {
        if (modelReply == null || modelReply.isBlank() || groundedFacts == null || groundedFacts.isBlank()) {
            return false;
        }
        String answer = modelReply.toLowerCase(Locale.ROOT);
        String facts = groundedFacts.toLowerCase(Locale.ROOT);

        boolean denyTeacher = containsAny(answer, "没有关于老师", "没有老师信息", "不知道老师", "无法提供老师");
        boolean denyClass = containsAny(answer, "没有班级", "不知道班级");
        boolean denyStudentNo = containsAny(answer, "没有学号", "不知道学号");
        boolean denyCourse = containsAny(answer, "没有课程", "不知道课程", "暂无课程");
        boolean denySchedule = containsAny(answer, "没有排课", "没有课表", "不知道课表", "暂无课表");
        boolean denyStudents = containsAny(answer, "没有学生", "没有学生信息", "不知道学生");

        boolean hasTeacherFact = facts.contains("教师:");
        boolean hasClassFact = facts.contains("班级:");
        boolean hasStudentNoFact = facts.contains("学号:");
        boolean hasCourseFact = facts.contains("课程:");
                // Teacher-courses tool outputs this title line
        boolean hasTeacherCourseFact = facts.contains("当前授课课程");
        boolean hasScheduleFact = facts.contains("排课");
        boolean hasStudentsFact = facts.contains("选课人数") || facts.contains("授课课程");

        return (denyTeacher && hasTeacherFact)
                || (denyClass && hasClassFact)
                || (denyStudentNo && hasStudentNoFact)
                || (denyCourse && (hasCourseFact || hasTeacherCourseFact))
                || (denySchedule && hasScheduleFact)
                || (denyStudents && hasStudentsFact);
    }

    private boolean isDataQuestion(String message) {
        return containsAny(message,
                "信息", "数据", "情况", "状态", "知道", "了解",
                "多少", "几条", "有哪些", "列表", "清单",
                "查询", "统计", "概览", "总览",
                "有吗", "没有吗", "还有呢", "那老师呢", "那班级呢",
                "do you know", "what is my", "show me");
    }

    private String safe(String v) {
        return v == null || v.isBlank() ? "-" : v;
    }

    private String safeNum(Integer v) {
        return v == null ? "-" : String.valueOf(v);
    }

    private boolean containsAny(String text, String... words) {
        String lower = text == null ? "" : text.toLowerCase(Locale.ROOT);
        for (String w : words) {
            if (lower.contains(w.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    private String cleanForUser(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        return text.replaceAll("\\[TOOL:[^\\]]+\\]\\s*", "").trim();
    }

    private String localizeStudentStatus(String status) {
        if (status == null || status.isBlank()) return "-";
        return switch (status) {
            case "ENROLLED" -> "在读";
            case "SUSPENDED" -> "休学";
            case "GRADUATED" -> "已毕业";
            case "DROPPED_OUT" -> "退学";
            default -> status;
        };
    }

    private String localizeTeacherStatus(String status) {
        if (status == null || status.isBlank()) return "-";
        return switch (status) {
            case "ACTIVE" -> "在职";
            case "ON_LEAVE" -> "休假";
            case "RETIRED" -> "退休";
            default -> status;
        };
    }
}
