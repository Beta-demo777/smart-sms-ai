package com.smartsms.attendance.service;

import com.smartsms.attendance.entity.LeaveRequest;
import com.smartsms.attendance.repository.LeaveRequestRepository;
import com.smartsms.common.exception.ResourceNotFoundException;
import com.smartsms.student.entity.Student;
import com.smartsms.student.repository.StudentRepository;
import com.smartsms.teacher.entity.Teacher;
import com.smartsms.teacher.repository.TeacherRepository;
import com.smartsms.teacher.entity.TeacherStatus;
import com.smartsms.user.entity.Role;
import com.smartsms.user.entity.User;
import com.smartsms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;
import com.smartsms.attendance.entity.Attendance;
import lombok.extern.slf4j.Slf4j;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class LeaveService {
    private final LeaveRequestRepository leaveRequestRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
    private final UserRepository userRepository;
    private final AttendanceService attendanceService;

    private Student resolveStudent(String id) {
        log.debug("Resolving student for ID: {}", id);
        return studentRepository.findById(id)
                .orElseGet(() -> {
                    log.debug("Student not found by primary ID, trying by userId: {}", id);
                    return studentRepository.findByUserId(id)
                            .orElseThrow(() -> {
                                log.warn("Student not found with id/userId: {}", id);
                                return new ResourceNotFoundException("Student", "id/userId", id);
                            });
                });
    }

    private Teacher resolveTeacher(String id) {
        log.debug("Resolving teacher for ID: {}", id);
        return teacherRepository.findById(id)
                .orElseGet(() -> {
                    log.debug("Teacher not found by primary ID, trying by userId: {}", id);
                    return teacherRepository.findByUserId(id)
                            .orElseGet(() -> {
                                // Fallback: If it's an admin, they might not have a teacher profile yet
                                User user = userRepository.findById(id)
                                        .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
                                
                                if (user.getRole() == Role.ADMIN) {
                                    log.info("Creating on-the-fly teacher profile for admin: {}", user.getUsername());
                                    Teacher adminTeacher = new Teacher();
                                    adminTeacher.setUser(user);
                                    adminTeacher.setName(user.getName());
                                    adminTeacher.setTeacherNumber(user.getUsername());
                                    adminTeacher.setEmail(user.getEmail());
                                    adminTeacher.setStatus(TeacherStatus.ACTIVE);
                                    adminTeacher.setJoinDate(java.time.LocalDate.now());
                                    adminTeacher.setAvatar(user.getAvatar());
                                    return teacherRepository.save(adminTeacher);
                                }
                                
                                log.warn("Teacher not found with id/userId: {}", id);
                                throw new ResourceNotFoundException("Teacher", "id/userId", id);
                            });
                });
    }

    public LeaveRequest submitRequest(String studentId, LeaveRequest.LeaveType type, LocalDate start, LocalDate end, String reason) {
        Student student = resolveStudent(studentId);

        LeaveRequest request = new LeaveRequest();
        request.setStudent(student);
        request.setType(type);
        request.setStartDate(start);
        request.setEndDate(end);
        request.setReason(reason);
        request.setStatus(LeaveRequest.LeaveStatus.PENDING);

        return leaveRequestRepository.save(request);
    }

    public LeaveRequest approveRequest(String requestId, String reviewerId, LeaveRequest.LeaveStatus status, String comment) {
        LeaveRequest request = leaveRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveRequest", "id", requestId));
        
        Teacher reviewer = resolveTeacher(reviewerId);

        request.setStatus(status);
        request.setReviewer(reviewer);
        request.setReviewComment(comment);

        LeaveRequest saved = leaveRequestRepository.save(request);

        // If approved, automatically record attendance for the leave days
        if (status == LeaveRequest.LeaveStatus.APPROVED) {
            LocalDate current = request.getStartDate();
            while (!current.isAfter(request.getEndDate())) {
                attendanceService.checkIn(
                        request.getStudent().getId(),
                        Attendance.AttendanceStatus.LEAVE,
                        buildApprovedLeaveAttendanceNote(request),
                        current
                );
                current = current.plusDays(1);
            }
        }

        return saved;
    }

    public List<LeaveRequest> getPendingRequests() {
        return leaveRequestRepository.findByStatus(LeaveRequest.LeaveStatus.PENDING);
    }
    
    public List<LeaveRequest> getStudentRequests(String studentId) {
        Student student = resolveStudent(studentId);
        return leaveRequestRepository.findByStudentId(student.getId());
    }

    public List<LeaveRequest> getReviewerRequests(String reviewerId) {
        Teacher teacher = resolveTeacher(reviewerId);
        return leaveRequestRepository.findByReviewerId(teacher.getId());
    }

    public List<LeaveRequest> getAllRequests() {
        return leaveRequestRepository.findAll();
    }

    private String buildApprovedLeaveAttendanceNote(LeaveRequest request) {
        String type = switch (request.getType()) {
            case SICK -> "病假";
            case PERSONAL -> "事假";
            case OTHER -> "其他";
        };
        String reason = request.getReason() == null ? "" : request.getReason().replaceAll("\\s+", " ").trim();
        if (reason.length() > 120) {
            reason = reason.substring(0, 120) + "...";
        }
        return "请假已批准｜类型：" + type + "｜事由：" + reason;
    }
}
