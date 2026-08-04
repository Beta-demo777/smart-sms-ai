package com.smartsms.common.config;

import com.smartsms.attendance.entity.LeaveRequest;
import com.smartsms.attendance.repository.LeaveRequestRepository;
import com.smartsms.classroom.entity.Classroom;
import com.smartsms.classroom.entity.ClassroomStatus;
import com.smartsms.classroom.entity.ClassroomType;
import com.smartsms.classroom.repository.ClassroomRepository;
import com.smartsms.clazz.entity.Clazz;
import com.smartsms.clazz.repository.ClazzRepository;
import com.smartsms.course.entity.Course;
import com.smartsms.course.repository.CourseRepository;
import com.smartsms.department.entity.Department;
import com.smartsms.department.entity.DepartmentStatus;
import com.smartsms.department.repository.DepartmentRepository;
import com.smartsms.schedule.entity.ScheduleItem;
import com.smartsms.schedule.repository.ScheduleRepository;
import com.smartsms.course.entity.Enrollment;
import com.smartsms.course.repository.EnrollmentRepository;
import com.smartsms.score.Exam;
import com.smartsms.score.ExamRepository;
import com.smartsms.score.Score;
import com.smartsms.score.ScoreRepository;
import com.smartsms.student.entity.Gender;
import com.smartsms.student.entity.Student;
import com.smartsms.student.repository.StudentRepository;
import com.smartsms.teacher.entity.Teacher;
import com.smartsms.teacher.repository.TeacherRepository;
import com.smartsms.user.entity.Role;
import com.smartsms.user.entity.User;
import com.smartsms.user.repository.UserRepository;
import com.smartsms.assignment.entity.Assignment;
import com.smartsms.assignment.repository.AssignmentRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;

@Component
@Profile("dev")
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final TeacherRepository teacherRepository;
    private final ClazzRepository clazzRepository;
    private final StudentRepository studentRepository;
    private final CourseRepository courseRepository;
    private final DepartmentRepository departmentRepository;
    private final ClassroomRepository classroomRepository;
    private final ScheduleRepository scheduleRepository;
    private final ExamRepository examRepository;
    private final ScoreRepository scoreRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final AssignmentRepository assignmentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final PasswordEncoder passwordEncoder;

    private final Random random = new Random();

    public DataSeeder(UserRepository userRepository, TeacherRepository teacherRepository,
                      ClazzRepository clazzRepository, StudentRepository studentRepository,
                      CourseRepository courseRepository, DepartmentRepository departmentRepository,
                      ClassroomRepository classroomRepository, ScheduleRepository scheduleRepository,
                      ExamRepository examRepository, ScoreRepository scoreRepository,
                      LeaveRequestRepository leaveRequestRepository, AssignmentRepository assignmentRepository,
                      EnrollmentRepository enrollmentRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.teacherRepository = teacherRepository;
        this.clazzRepository = clazzRepository;
        this.studentRepository = studentRepository;
        this.courseRepository = courseRepository;
        this.departmentRepository = departmentRepository;
        this.classroomRepository = classroomRepository;
        this.scheduleRepository = scheduleRepository;
        this.examRepository = examRepository;
        this.scoreRepository = scoreRepository;
        this.leaveRequestRepository = leaveRequestRepository;
        this.assignmentRepository = assignmentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0) {
            seedAssignmentsIfMissing();
            seedEnrollmentsIfMissing();
            seedScheduleIfMissing();
            System.out.println("Database already seeded. Checking/Seeding missing parts...");
            return;
        }

        System.out.println("Seeding database with EXTENDED mock data...");
        String defaultPassword = passwordEncoder.encode("123456");

        // 1. Create Admin
        User admin = new User("系统管理员", "admin", "admin@school.edu", defaultPassword, Role.ADMIN);
        admin.setAvatar("https://api.dicebear.com/7.x/avataaars/svg?seed=admin");
        admin = userRepository.save(admin);

        // Associate admin with a teacher record so they can approve leaves
        Teacher adminTeacher = new Teacher();
        adminTeacher.setName("系统管理员");
        adminTeacher.setTeacherNumber("ADMIN001");
        adminTeacher.setDepartment("管理部");
        adminTeacher.setEmail(admin.getEmail());
        adminTeacher.setTitle("高级管理员");
        adminTeacher.setJoinDate(LocalDate.now().minusYears(5));
        adminTeacher.setUser(admin);
        teacherRepository.save(adminTeacher);

        // 2. Create Departments
        List<Department> departments = new ArrayList<>();
        String[] deptNames = {"计算机科学系", "软件工程系", "人工智能系", "数学系", "物理学系"};
        String[] deptCodes = {"CS", "SE", "AI", "MATH", "PHY"};
        for (int i = 0; i < deptNames.length; i++) {
            Department dept = new Department();
            dept.setName(deptNames[i]);
            dept.setCode(deptCodes[i]);
            dept.setDescription(deptNames[i] + "的详细介绍...");
            dept.setContactEmail("contact_" + deptCodes[i].toLowerCase() + "@school.edu");
            dept.setStatus(DepartmentStatus.ACTIVE);
            departments.add(departmentRepository.save(dept));
        }

        // 3. Create Teachers
        List<Teacher> teachers = new ArrayList<>();
        String[] teacherNames = {"张伟", "王芳", "李娜", "刘强", "陈明"};
        for (int i = 0; i < 5; i++) {
            String tNum = "T202400" + (i + 1);
            User tUser = new User(teacherNames[i], tNum, "t" + (i + 1) + "@school.edu", defaultPassword, Role.TEACHER);
            tUser.setAvatar("https://api.dicebear.com/7.x/avataaars/svg?seed=" + teacherNames[i]);
            tUser = userRepository.save(tUser);

            Teacher teacher = new Teacher();
            teacher.setName(teacherNames[i]);
            teacher.setTeacherNumber(tNum);
            teacher.setDepartment(departments.get(i).getName());
            teacher.setEmail(tUser.getEmail());
            teacher.setTitle(i % 2 == 0 ? "教授" : "副教授");
            teacher.setJoinDate(LocalDate.now().minusYears(random.nextInt(10) + 1));
            teacher.setAvatar(tUser.getAvatar());
            teacher.setUser(tUser);
            teachers.add(teacherRepository.save(teacher));
        }

        // Assign a Head of Department using the generated teachers
        for (int i = 0; i < departments.size(); i++) {
            Department dept = departments.get(i);
            dept.setManager(teachers.get(i).getName());
            departmentRepository.save(dept);
        }

        // 4. Create Classes
        List<Clazz> classes = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            Clazz clazz = new Clazz();
            clazz.setName("计算机科学与技术-" + i + "班");
            clazz.setDepartment(departments.get(0).getName());
            clazz.setYear(2023);
            clazz.setAdvisor(teachers.get(i % teachers.size()));
            classes.add(clazzRepository.save(clazz));
        }

        // 5. Create Students
        List<Student> students = new ArrayList<>();
        String[] lastNames = {"赵", "钱", "孙", "李", "周", "吴", "郑", "王", "冯", "陈", "褚", "卫"};
        String[] firstNames = {"天宇", "浩然", "子涵", "紫轩", "静安", "博文", "嘉伦", "诗涵", "梦琪", "佳琦"};

        for (int i = 1; i <= 20; i++) {
            String sName = lastNames[random.nextInt(lastNames.length)] + firstNames[random.nextInt(firstNames.length)];
            String sNum = "20230" + String.format("%03d", i);
            User sUser = new User(sName, sNum, "s" + i + "@student.edu", defaultPassword, Role.STUDENT);
            sUser.setAvatar("https://api.dicebear.com/7.x/avataaars/svg?seed=" + sName);
            sUser = userRepository.save(sUser);

            Student student = new Student();
            student.setName(sName);
            student.setStudentNumber(sNum);
            student.setAge(18 + random.nextInt(3));
            student.setGender(random.nextBoolean() ? Gender.MALE : Gender.FEMALE);
            student.setEmail(sUser.getEmail());
            student.setClazz(classes.get(i % classes.size()));
            student.setEnrollmentDate(LocalDate.of(2023, 9, 1));
            student.setGpa(java.math.BigDecimal.valueOf(2.5 + random.nextDouble() * 1.5));
            student.setAttendance(java.math.BigDecimal.valueOf(85.0 + random.nextDouble() * 15.0));
            student.setAvatar(sUser.getAvatar());
            student.setUser(sUser);
            
            Clazz cls = classes.get(i % classes.size());
            cls.setStudentCount(cls.getStudentCount() + 1);
            
            students.add(studentRepository.save(student));
        }
        clazzRepository.saveAll(classes);

        // 6. Create Classrooms
        List<Classroom> classrooms = new ArrayList<>();
        String[] buildingPrefixes = {"教学楼A", "教学楼B", "理科楼", "实验楼"};
        for (int i = 0; i < 5; i++) {
            Classroom room = new Classroom();
            room.setName(buildingPrefixes[random.nextInt(buildingPrefixes.length)] + "-" + (100 + i));
            room.setCapacity(30 + random.nextInt(70));
            room.setType(ClassroomType.values()[random.nextInt(ClassroomType.values().length)]);
            room.setStatus(ClassroomStatus.AVAILABLE);
            room.setLocation("校区核心区");
            room.setEquipment(Arrays.asList("投影仪", "黑板", "空调"));
            classrooms.add(classroomRepository.save(room));
        }

        // 7. Create Courses
        List<Course> courses = new ArrayList<>();
        String[] courseNames = {"数据结构", "操作系统", "计算机网络", "高等数学", "人工智能导论"};
        for (int i = 0; i < courseNames.length; i++) {
            Course course = new Course();
            course.setName(courseNames[i]);
            course.setTeacher(teachers.get(i % teachers.size()));
            course.setCredits(3 + random.nextInt(2));
            course.setMaxCapacity(40 + random.nextInt(20));
            course.setLocation(classrooms.get(random.nextInt(classrooms.size())).getName());
            course.setSchedule("周" + (1 + random.nextInt(5)) + " 08:00-09:40");
            courses.add(courseRepository.save(course));
        }

        // 8. Create ScheduleItems
        for (int i = 0; i < courses.size(); i++) {
            Course course = courses.get(i);
            ScheduleItem item = new ScheduleItem();
            item.setCourse(course);
            item.setClassroom(classrooms.get(i % classrooms.size()));
            item.setDayOfWeek(DayOfWeek.values()[random.nextInt(5)]); // Monday - Friday
            item.setStartTime(LocalTime.of(8 + (i * 2), 0));
            item.setEndTime(LocalTime.of(9 + (i * 2), 40));
            item.setSemester("2023-FALL");
            scheduleRepository.save(item);
        }

        // 9. Create Exams and Scores
        for (Course course : courses) {
            Exam exam = new Exam();
            exam.setTitle(course.getName() + " 期末考试");
            exam.setCourse(course);
            exam.setDate(LocalDate.now().plusDays(random.nextInt(30)));
            exam.setMaxScore(100.0);
            exam.setDescription("本学期核心考察内容...");
            exam = examRepository.save(exam);

            // Assign random scores to some students
            for (Student student : students) {
                // Assuming all students take all courses in this mock
                Double randomScore = 50.0 + random.nextInt(51); // 50-100
                Score score = new Score();
                score.setExam(exam);
                score.setStudent(student);
                score.setScoreValue(randomScore);
                score.setFeedback(randomScore > 85 ? "表现优异，继续保持！" : "仍需努力，多做练习！");
                scoreRepository.save(score);

                // Ensure Enrollment exists for this score
                if (!enrollmentRepository.existsByStudentIdAndCourseId(student.getId(), course.getId())) {
                    Enrollment enrollment = new Enrollment();
                    enrollment.setStudent(student);
                    enrollment.setCourse(course);
                    enrollmentRepository.save(enrollment);
                    
                    course.setEnrolledCount((course.getEnrolledCount() == null ? 0 : course.getEnrolledCount()) + 1);
                    courseRepository.save(course);
                }
            }
        }

        // 10. Create Leave Requests
        for (int i = 0; i < 5; i++) {
            Student student = students.get(random.nextInt(students.size()));
            LeaveRequest request = new LeaveRequest();
            request.setStudent(student);
            request.setType(LeaveRequest.LeaveType.values()[random.nextInt(LeaveRequest.LeaveType.values().length)]);
            request.setStartDate(LocalDate.now().minusDays(random.nextInt(10)));
            request.setEndDate(request.getStartDate().plusDays(1 + random.nextInt(3)));
            request.setReason("个人原因申请请假。");
            request.setStatus(LeaveRequest.LeaveStatus.values()[random.nextInt(LeaveRequest.LeaveStatus.values().length)]);
            if (request.getStatus() != LeaveRequest.LeaveStatus.PENDING) {
                request.setReviewer(teachers.get(0));
                request.setReviewComment(request.getStatus() == LeaveRequest.LeaveStatus.APPROVED ? "同意" : "情况不属实，驳回");
            }
            leaveRequestRepository.save(request);
        }

        System.out.println("✅ EXTENDED Mock data generation completed!");
    }

    private void seedAssignmentsIfMissing() {
        if (assignmentRepository.count() > 0) return;
        System.out.println("Seeding partial assignment data...");
        List<Course> courses = courseRepository.findAll();
        for (Course course : courses) {
            Assignment a = Assignment.builder()
                    .title(course.getName() + " 课后作业")
                    .description("请按时完成 " + course.getName() + " 的相关练习，并在线提交报告副本。")
                    .dueDate(LocalDateTime.now().plusDays(7))
                    .course(course)
                    .teacher(course.getTeacher())
                    .active(true)
                    .build();
            assignmentRepository.save(a);
        }
    }

    private void seedEnrollmentsIfMissing() {
        if (enrollmentRepository.count() > 0) return;
        System.out.println("Seeding partial enrollment data based on existing scores...");
        List<Score> scores = scoreRepository.findAll();
        for (Score score : scores) {
            if (score.getStudent() == null || score.getExam() == null || score.getExam().getCourse() == null) continue;
            Student student = score.getStudent();
            Course course = score.getExam().getCourse();
            if (!enrollmentRepository.existsByStudentIdAndCourseId(student.getId(), course.getId())) {
                Enrollment enrollment = new Enrollment();
                enrollment.setStudent(student);
                enrollment.setCourse(course);
                enrollmentRepository.save(enrollment);
                
                course.setEnrolledCount((course.getEnrolledCount() == null ? 0 : course.getEnrolledCount()) + 1);
                courseRepository.save(course);
            }
        }
    }

    private void seedScheduleIfMissing() {
        if (scheduleRepository.count() >= 10) return; // Basic check

        System.out.println("Checking specialized schedule data...");
        List<Course> courses = courseRepository.findAll();
        List<Classroom> classrooms = classroomRepository.findAll();

        if (courses.isEmpty() || classrooms.isEmpty()) return;

        boolean hasSat = scheduleRepository.findAll().stream()
                .anyMatch(s -> s.getDayOfWeek() == java.time.DayOfWeek.SATURDAY);

        if (!hasSat) {
            ScheduleItem satClass = new ScheduleItem();
            satClass.setCourse(courses.get(0)); // 数据结构
            satClass.setClassroom(classrooms.get(0));
            satClass.setDayOfWeek(java.time.DayOfWeek.SATURDAY);
            satClass.setStartTime(java.time.LocalTime.of(9, 0));
            satClass.setEndTime(java.time.LocalTime.of(10, 40));
            satClass.setSemester("2023-FALL");
            scheduleRepository.save(satClass);
            System.out.println("✅ Saturday verification class seeded!");
        }
    }
}
