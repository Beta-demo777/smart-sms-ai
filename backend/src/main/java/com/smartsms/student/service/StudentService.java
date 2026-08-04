package com.smartsms.student.service;

import com.smartsms.clazz.entity.Clazz;
import com.smartsms.clazz.repository.ClazzRepository;
import com.smartsms.common.exception.BadRequestException;
import com.smartsms.common.exception.ResourceNotFoundException;
import com.smartsms.student.dto.CreateStudentRequest;
import com.smartsms.student.dto.StudentDto;
import com.smartsms.student.dto.UpdateStudentRequest;
import com.smartsms.student.entity.Gender;
import com.smartsms.student.entity.Student;
import com.smartsms.student.entity.StudentStatus;
import com.smartsms.student.repository.StudentRepository;
import com.smartsms.common.util.AvatarUtil;
import org.springframework.data.domain.Page;
import com.smartsms.attendance.repository.AttendanceRepository;
import com.smartsms.attendance.repository.LeaveRequestRepository;
import com.smartsms.attendance.entity.Attendance;
import com.smartsms.attendance.entity.LeaveRequest;
import com.smartsms.score.ScoreRepository;
import com.smartsms.score.Score;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@Service
@Transactional
public class StudentService {

    private final StudentRepository studentRepository;
    private final ClazzRepository clazzRepository;
    private final com.smartsms.user.repository.UserRepository userRepository;
    private final com.smartsms.user.service.UserService userService;
    private final AttendanceRepository attendanceRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final ScoreRepository scoreRepository;
    private final com.smartsms.course.repository.EnrollmentRepository enrollmentRepository;

    public StudentService(StudentRepository studentRepository, 
                          ClazzRepository clazzRepository,
                          com.smartsms.user.repository.UserRepository userRepository,
                          com.smartsms.user.service.UserService userService,
                          AttendanceRepository attendanceRepository,
                          LeaveRequestRepository leaveRequestRepository,
                          ScoreRepository scoreRepository,
                          com.smartsms.course.repository.EnrollmentRepository enrollmentRepository) {
        this.studentRepository = studentRepository;
        this.clazzRepository = clazzRepository;
        this.userRepository = userRepository;
        this.userService = userService;
        this.attendanceRepository = attendanceRepository;
        this.leaveRequestRepository = leaveRequestRepository;
        this.scoreRepository = scoreRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    public Page<StudentDto> getAllStudents(Pageable pageable) {
        return studentRepository.findAll(pageable).map(this::toDto);
    }

    public Page<StudentDto> getStudentsByStatus(String status, Pageable pageable) {
        return studentRepository.findByStatus(StudentStatus.fromValue(status), pageable).map(this::toDto);
    }

    public Page<StudentDto> getStudentsByClass(String classId, Pageable pageable) {
        return studentRepository.findByClazzId(classId, pageable).map(this::toDto);
    }

    public Page<StudentDto> searchStudents(String keyword, Pageable pageable) {
        return studentRepository.searchByKeyword(keyword, pageable).map(this::toDto);
    }

    public com.smartsms.student.dto.StudentStatsDto getStudentStats() {
        List<Student> enrolledStudents = studentRepository.findByStatus(StudentStatus.ENROLLED);
        long total = enrolledStudents.size();
        Double avgGpa = studentRepository.calculateAverageGpa();
        Double avgAttendance = calculateRealtimeAverageAttendance(enrolledStudents);
        return new com.smartsms.student.dto.StudentStatsDto(
            total,
            avgGpa != null ? avgGpa : 0.0,
            avgAttendance != null ? (int) Math.round(avgAttendance) : 0
        );
    }

    public StudentDto getStudentById(String id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));
        return toDto(student);
    }

    private Double calculateRealtimeAverageAttendance(List<Student> enrolledStudents) {
        if (enrolledStudents == null || enrolledStudents.isEmpty()) {
            return 0.0;
        }

        Map<String, long[]> counters = new HashMap<>();
        List<Attendance> records = attendanceRepository.findAll();
        for (Attendance record : records) {
            if (record == null || record.getStudent() == null || record.getStudent().getId() == null) continue;
            String studentId = record.getStudent().getId();
            long[] counter = counters.computeIfAbsent(studentId, k -> new long[2]);
            counter[0] += 1; // total
            if (record.getStatus() == Attendance.AttendanceStatus.PRESENT
                    || record.getStatus() == Attendance.AttendanceStatus.LATE
                    || record.getStatus() == Attendance.AttendanceStatus.LEAVE) {
                counter[1] += 1; // effective attendance
            }
        }

        double sum = 0.0;
        for (Student student : enrolledStudents) {
            if (student == null || student.getId() == null) continue;
            long[] counter = counters.get(student.getId());
            if (counter == null || counter[0] == 0) {
                sum += 100.0;
            } else {
                sum += (counter[1] * 100.0) / counter[0];
            }
        }
        return sum / enrolledStudents.size();
    }

    public StudentDto createStudent(CreateStudentRequest request) {
        if (request.studentNumber() != null && !request.studentNumber().isBlank() && studentRepository.existsByStudentNumber(request.studentNumber())) {
            throw new BadRequestException("Student number already exists: " + request.studentNumber());
        }
        if (request.email() != null && !request.email().isBlank() && studentRepository.existsByEmail(request.email())) {
            throw new BadRequestException("Email already exists: " + request.email());
        }

        Student student = new Student();
        student.setName(request.name());
        student.setStudentNumber(request.studentNumber());
        student.setAge(request.age());
        student.setGender(Gender.fromValue(request.gender()));
        student.setEmail(request.email());
        student.setEnrollmentDate(request.enrollmentDate() != null ? request.enrollmentDate() : LocalDate.now());
        student.setGpa(request.gpa());
        student.setAttendance(request.attendance());
        student.setStatus(request.status() != null ? StudentStatus.fromValue(request.status()) : StudentStatus.ENROLLED);
        String studentAvatar = (request.avatar() == null || request.avatar().isBlank())
                ? AvatarUtil.defaultAvatar(request.studentNumber() != null ? request.studentNumber() : request.name())
                : request.avatar();
        student.setAvatar(studentAvatar);

        if (request.classId() != null && !request.classId().isBlank()) {
            Clazz clazz = clazzRepository.findById(request.classId())
                    .orElseThrow(() -> new ResourceNotFoundException("Class", "id", request.classId()));
            student.setClazz(clazz);
            
            // Increment class student count
            clazz.setStudentCount(clazz.getStudentCount() + 1);
            clazzRepository.save(clazz);
        }

        // Create associated user account
        com.smartsms.user.entity.User user = new com.smartsms.user.entity.User();
        user.setName(request.name());
        user.setUsername(request.studentNumber());
        user.setEmail(request.email());
        user.setPassword(userService.encodePassword("123456")); // Default password
        user.setRole(com.smartsms.user.entity.Role.STUDENT);
        user.setAvatar(studentAvatar);
        user.setStatus("active");
        user = userRepository.save(user);
        
        student.setUser(user);

        return toDto(studentRepository.save(student));
    }

    public StudentDto updateStudent(String id, UpdateStudentRequest request) {
        System.out.println("=== UPDATE STUDENT DEBUG ===");
        System.out.println("Student ID: " + id);
        System.out.println("Request classId: " + request.classId());
        
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));
        
        System.out.println("Current student class_id in DB: " + (student.getClazz() != null ? student.getClazz().getId() : "null"));

        if (request.name() != null) student.setName(request.name());
        if (request.studentNumber() != null && !request.studentNumber().isBlank() && !request.studentNumber().equals(student.getStudentNumber())) {
            if (studentRepository.existsByStudentNumber(request.studentNumber())) {
                throw new BadRequestException("Student number already exists: " + request.studentNumber());
            }
            student.setStudentNumber(request.studentNumber());
            // Sync with associated user if exists
            if (student.getUser() != null) {
                student.getUser().setUsername(request.studentNumber());
            }
        }
        if (request.age() != null) student.setAge(request.age());
        if (request.gender() != null) student.setGender(Gender.fromValue(request.gender()));
        if (request.email() != null && !request.email().isBlank() && !request.email().equals(student.getEmail())) {
            if (studentRepository.existsByEmail(request.email())) {
                throw new BadRequestException("Email already exists: " + request.email());
            }
            student.setEmail(request.email());
        }
        if (request.enrollmentDate() != null) student.setEnrollmentDate(request.enrollmentDate());
        if (request.gpa() != null) student.setGpa(request.gpa());
        if (request.attendance() != null) student.setAttendance(request.attendance());
        if (request.status() != null) student.setStatus(StudentStatus.fromValue(request.status()));
        if (request.avatar() != null) student.setAvatar(request.avatar());
        if (request.classId() != null && !request.classId().isBlank()) {
            // Handle class change
            Clazz oldClazz = student.getClazz();
            Clazz newClazz = clazzRepository.findById(request.classId())
                    .orElseThrow(() -> new ResourceNotFoundException("Class", "id", request.classId()));
            
            System.out.println("DEBUG: Updating student class - Old: " + (oldClazz != null ? oldClazz.getId() : "null") + ", New: " + newClazz.getId());
            
            if (oldClazz == null || !oldClazz.getId().equals(newClazz.getId())) {
                // Decrement old class count
                if (oldClazz != null) {
                    oldClazz.setStudentCount(Math.max(0, oldClazz.getStudentCount() - 1));
                    clazzRepository.save(oldClazz);
                    System.out.println("DEBUG: Decremented old class " + oldClazz.getId() + " count to " + oldClazz.getStudentCount());
                }
                
                // Increment new class count
                newClazz.setStudentCount(newClazz.getStudentCount() + 1);
                clazzRepository.save(newClazz);
                System.out.println("DEBUG: Incremented new class " + newClazz.getId() + " count to " + newClazz.getStudentCount());
                
                student.setClazz(newClazz);
            }
        } else if (request.classId() != null && request.classId().isBlank()) {
            // Handle removing class assignment
            System.out.println("DEBUG: Removing class assignment from student");
            Clazz oldClazz = student.getClazz();
            if (oldClazz != null) {
                oldClazz.setStudentCount(Math.max(0, oldClazz.getStudentCount() - 1));
                clazzRepository.save(oldClazz);
            }
            student.setClazz(null);
        }

        // Sync with associated user
        if (student.getUser() != null) {
            com.smartsms.user.entity.User user = student.getUser();
            if (request.name() != null) user.setName(request.name());
            if (request.studentNumber() != null) user.setUsername(request.studentNumber());
            if (request.email() != null) user.setEmail(request.email());
            if (request.avatar() != null) user.setAvatar(request.avatar());
            userRepository.save(user);
        }

        return toDto(studentRepository.save(student));
    }

    public void deleteStudent(String id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));
        
        // Decrement class student count
        if (student.getClazz() != null) {
            Clazz clazz = student.getClazz();
            clazz.setStudentCount(Math.max(0, clazz.getStudentCount() - 1));
            clazzRepository.save(clazz);
        }
        
        // Delete related entities to prevent foreign key constraints
        // Delete scores
        List<Score> scores = scoreRepository.findByStudentId(id);
        if (!scores.isEmpty()) {
            scoreRepository.deleteAll(scores);
        }
        
        // Delete attendance records
        List<Attendance> attendanceList = attendanceRepository.findByStudentId(id);
        if (!attendanceList.isEmpty()) {
            attendanceRepository.deleteAll(attendanceList);
        }
        
        // Delete leave requests
        List<LeaveRequest> leaveRequests = leaveRequestRepository.findByStudentId(id);
        if (!leaveRequests.isEmpty()) {
            leaveRequestRepository.deleteAll(leaveRequests);
        }
        
        // Delete associated user account
        if (student.getUser() != null) {
            userRepository.delete(student.getUser());
        }
        
        studentRepository.delete(student);
    }

    private StudentDto toDto(Student student) {
        List<String> enrolledCourseIds = enrollmentRepository.findByStudentId(student.getId()).stream()
                .map(enrollment -> enrollment.getCourse().getId())
                .collect(java.util.stream.Collectors.toList());

        return new StudentDto(
                student.getId(),
                student.getStudentNumber(),
                student.getName(),
                student.getAge(),
                student.getGender().getValue(),
                student.getEmail(),
                student.getClazz() != null ? student.getClazz().getName() : null,
                student.getClazz() != null ? student.getClazz().getId() : null,
                student.getEnrollmentDate().toString(),
                student.getGpa(),
                student.getAttendance(),
                student.getStatus().getValue(),
                student.getAvatar(),
                enrolledCourseIds
        );
    }
}
