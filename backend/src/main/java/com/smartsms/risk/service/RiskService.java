package com.smartsms.risk.service;

import com.smartsms.attendance.entity.Attendance;
import com.smartsms.attendance.repository.AttendanceRepository;
import com.smartsms.course.entity.Course;
import com.smartsms.course.entity.Enrollment;
import com.smartsms.course.repository.CourseRepository;
import com.smartsms.course.repository.EnrollmentRepository;
import com.smartsms.risk.dto.RiskStudentDto;
import com.smartsms.score.Score;
import com.smartsms.score.ScoreRepository;
import com.smartsms.student.entity.Student;
import com.smartsms.student.repository.StudentRepository;
import com.smartsms.teacher.entity.Teacher;
import com.smartsms.teacher.repository.TeacherRepository;
import com.smartsms.user.entity.User;
import com.smartsms.user.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Service
public class RiskService {

    private static final double ATTENDANCE_THRESHOLD = 80.0;
    private static final double HIGH_ATTENDANCE_RISK = 70.0;
    private static final double GPA_THRESHOLD = 2.0;
    private static final double HIGH_GPA_RISK = 1.8;
    private static final double LOW_SCORE_THRESHOLD = 60.0;

    private final StudentRepository studentRepository;
    private final ScoreRepository scoreRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AttendanceRepository attendanceRepository;
    private final UserRepository userRepository;
    private final TeacherRepository teacherRepository;

    public RiskService(StudentRepository studentRepository,
                       ScoreRepository scoreRepository,
                       CourseRepository courseRepository,
                       EnrollmentRepository enrollmentRepository,
                       AttendanceRepository attendanceRepository,
                       UserRepository userRepository,
                       TeacherRepository teacherRepository) {
        this.studentRepository = studentRepository;
        this.scoreRepository = scoreRepository;
        this.courseRepository = courseRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.attendanceRepository = attendanceRepository;
        this.userRepository = userRepository;
        this.teacherRepository = teacherRepository;
    }

    public List<RiskStudentDto> getAdminRiskStudents(int limit) {
        return buildRiskStudents(studentRepository.findAll(), limit);
    }

    public List<RiskStudentDto> getTeacherRiskStudents(String teacherId, int limit) {
        if (teacherId == null || teacherId.isBlank()) {
            return List.of();
        }
        List<Course> courses = courseRepository.findByTeacherId(teacherId, PageRequest.of(0, 500)).getContent();
        if (courses.isEmpty()) {
            return List.of();
        }

        Map<String, Student> studentsById = new LinkedHashMap<>();
        for (Course course : courses) {
            List<Enrollment> enrollments = enrollmentRepository.findByCourseId(course.getId());
            for (Enrollment enrollment : enrollments) {
                Student student = enrollment.getStudent();
                if (student == null || student.getId() == null) continue;
                studentsById.putIfAbsent(student.getId(), student);
            }
        }
        return buildRiskStudents(new ArrayList<>(studentsById.values()), limit);
    }

    public List<RiskStudentDto> getRiskStudentsByUsername(String username, boolean admin, int limit) {
        if (admin) {
            return getAdminRiskStudents(limit);
        }
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return List.of();
        }
        Optional<Teacher> teacherOpt = teacherRepository.findByUserId(userOpt.get().getId());
        if (teacherOpt.isEmpty()) {
            return List.of();
        }
        return getTeacherRiskStudents(teacherOpt.get().getId(), limit);
    }

    private List<RiskStudentDto> buildRiskStudents(List<Student> students, int limit) {
        if (students == null || students.isEmpty()) {
            return List.of();
        }

        Set<String> scopedStudentIds = students.stream()
                .map(Student::getId)
                .filter(Objects::nonNull)
                .collect(LinkedHashSet::new, Set::add, Set::addAll);
        Map<String, Double> attendanceMap = buildAttendanceRateMap(scopedStudentIds);

        Set<String> lowScoreStudentIds = scoreRepository.findAll().stream()
                .filter(score -> score.getScoreValue() != null && score.getScoreValue() < LOW_SCORE_THRESHOLD)
                .map(Score::getStudent)
                .filter(Objects::nonNull)
                .map(Student::getId)
                .filter(Objects::nonNull)
                .filter(scopedStudentIds::contains)
                .collect(LinkedHashSet::new, Set::add, Set::addAll);

        List<RiskStudentDto> result = students.stream()
                .map(student -> toRiskStudent(student, lowScoreStudentIds, attendanceMap))
                .filter(Objects::nonNull)
                .sorted(
                        Comparator
                                .comparingInt((RiskStudentDto dto) -> severityRank(dto.severity()))
                                .thenComparing(dto -> dto.attendance() == null ? Double.MAX_VALUE : dto.attendance())
                                .thenComparing(dto -> dto.gpa() == null ? Double.MAX_VALUE : dto.gpa())
                )
                .toList();

        if (limit <= 0 || limit >= result.size()) {
            return result;
        }
        return result.subList(0, limit);
    }

    private RiskStudentDto toRiskStudent(Student student, Set<String> lowScoreStudentIds, Map<String, Double> attendanceMap) {
        if (student == null) return null;
        Double attendance = attendanceMap.getOrDefault(student.getId(), toDouble(student.getAttendance()));
        Double gpa = toDouble(student.getGpa());

        List<String> tags = new ArrayList<>();
        if (attendance != null && attendance < ATTENDANCE_THRESHOLD) tags.add("低出勤");
        if (gpa != null && gpa < GPA_THRESHOLD) tags.add("低GPA");
        if (student.getId() != null && lowScoreStudentIds.contains(student.getId())) tags.add("低分科目");

        if (tags.isEmpty()) {
            return null;
        }

        String severity = "MEDIUM";
        if (tags.size() >= 2
                || (attendance != null && attendance < HIGH_ATTENDANCE_RISK)
                || (gpa != null && gpa < HIGH_GPA_RISK)) {
            severity = "HIGH";
        }

        return new RiskStudentDto(
                student.getId(),
                safe(student.getName()),
                safe(student.getStudentNumber()),
                student.getClazz() != null ? safe(student.getClazz().getName()) : "-",
                gpa,
                attendance,
                severity,
                tags
        );
    }

    private int severityRank(String severity) {
        if ("HIGH".equalsIgnoreCase(severity)) return 0;
        if ("MEDIUM".equalsIgnoreCase(severity)) return 1;
        return 2;
    }

    private Double toDouble(BigDecimal value) {
        return value == null ? null : value.doubleValue();
    }

    private String safe(String value) {
        return value == null ? "-" : value;
    }

    private Map<String, Double> buildAttendanceRateMap(Set<String> scopedStudentIds) {
        if (scopedStudentIds == null || scopedStudentIds.isEmpty()) {
            return Map.of();
        }
        List<Attendance> records = attendanceRepository.findByStudentIdIn(scopedStudentIds);
        Map<String, long[]> counters = new HashMap<>();
        for (Attendance record : records) {
            if (record == null || record.getStudent() == null || record.getStudent().getId() == null) continue;
            String studentId = record.getStudent().getId();
            long[] counter = counters.computeIfAbsent(studentId, k -> new long[2]);
            counter[0] += 1; // total records
            if (record.getStatus() == Attendance.AttendanceStatus.PRESENT
                    || record.getStatus() == Attendance.AttendanceStatus.LATE
                    || record.getStatus() == Attendance.AttendanceStatus.LEAVE) {
                counter[1] += 1; // effective attendance
            }
        }

        Map<String, Double> result = new HashMap<>();
        for (String studentId : scopedStudentIds) {
            long[] counter = counters.get(studentId);
            if (counter == null || counter[0] == 0) {
                result.put(studentId, 100.0);
                continue;
            }
            result.put(studentId, (counter[1] * 100.0) / counter[0]);
        }
        return result;
    }
}
