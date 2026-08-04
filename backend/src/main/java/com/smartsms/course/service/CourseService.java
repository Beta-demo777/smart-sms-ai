package com.smartsms.course.service;

import com.smartsms.common.exception.BadRequestException;
import com.smartsms.common.exception.ResourceNotFoundException;
import com.smartsms.course.dto.CourseDto;
import com.smartsms.course.dto.CreateCourseRequest;
import com.smartsms.course.dto.UpdateCourseRequest;
import com.smartsms.course.entity.Course;
import com.smartsms.course.entity.Enrollment;
import com.smartsms.course.repository.CourseRepository;
import com.smartsms.course.repository.EnrollmentRepository;
import com.smartsms.student.entity.Student;
import com.smartsms.student.repository.StudentRepository;
import com.smartsms.teacher.entity.Teacher;
import com.smartsms.teacher.repository.TeacherRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CourseService {

    private final CourseRepository courseRepository;
    private final TeacherRepository teacherRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final StudentRepository studentRepository;

    public CourseService(CourseRepository courseRepository, TeacherRepository teacherRepository,
                         EnrollmentRepository enrollmentRepository, StudentRepository studentRepository) {
        this.courseRepository = courseRepository;
        this.teacherRepository = teacherRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.studentRepository = studentRepository;
    }

    public Page<CourseDto> getAllCourses(Pageable pageable, String studentId) {
        return courseRepository.findAll(pageable).map(c -> toDto(c, studentId));
    }

    public Page<CourseDto> getCoursesByTeacher(String teacherId, Pageable pageable) {
        return courseRepository.findByTeacherId(teacherId, pageable).map(c -> toDto(c, null));
    }

    public Page<CourseDto> searchCourses(String keyword, Pageable pageable) {
        return courseRepository.searchByKeyword(keyword, pageable).map(c -> toDto(c, null));
    }

    public Page<CourseDto> getAvailableCourses(Pageable pageable) {
        return courseRepository.findAvailableCourses(pageable).map(c -> toDto(c, null));
    }

    public CourseDto getCourseById(String id, String studentId) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course", "id", id));
        return toDto(course, studentId);
    }

    public CourseDto createCourse(CreateCourseRequest request) {
        if (request.teacherId() == null || request.teacherId().trim().isEmpty()) {
            throw new BadRequestException("Teacher is required");
        }

        Course course = new Course();
        course.setName(request.name());
        Teacher teacher = teacherRepository.findById(request.teacherId())
                .orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", request.teacherId()));
        course.setTeacher(teacher);
        
        course.setCredits(request.credits());
        course.setMaxCapacity(request.maxCapacity());
        course.setSchedule(request.schedule());
        course.setLocation(request.location());

        return toDto(courseRepository.save(course), null);
    }

    public CourseDto updateCourse(String id, UpdateCourseRequest request) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course", "id", id));

        if (request.name() != null) course.setName(request.name());
        
        // If teacher is updating (handling empty string as "remove teacher" or nullable assignment)
        if (request.teacherId() != null) {
            if (request.teacherId().trim().isEmpty()) {
                course.setTeacher(null); // Explicitly remove teacher if empty string passed
            } else {
                Teacher teacher = teacherRepository.findById(request.teacherId())
                        .orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", request.teacherId()));
                course.setTeacher(teacher);
            }
        }
        
        if (request.credits() != null) course.setCredits(request.credits());
        if (request.maxCapacity() != null) course.setMaxCapacity(request.maxCapacity());
        if (request.schedule() != null) course.setSchedule(request.schedule());
        if (request.location() != null) course.setLocation(request.location());

        return toDto(courseRepository.save(course), null);
    }

    public void deleteCourse(String id) {
        if (!courseRepository.existsById(id)) {
            throw new ResourceNotFoundException("Course", "id", id);
        }
        courseRepository.deleteById(id);
    }

    public void enrollStudent(String courseId, String studentId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", "id", courseId));
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));

        if (enrollmentRepository.existsByStudentIdAndCourseId(studentId, courseId)) {
            throw new BadRequestException("Student already enrolled in this course");
        }
        if (course.getEnrolledCount() >= course.getMaxCapacity()) {
            throw new BadRequestException("Course is full");
        }

        Enrollment enrollment = new Enrollment();
        enrollment.setStudent(student);
        enrollment.setCourse(course);
        enrollmentRepository.save(enrollment);

        course.setEnrolledCount(course.getEnrolledCount() + 1);
        courseRepository.save(course);
    }

    public void unenrollStudent(String courseId, String studentId) {
        if (!enrollmentRepository.existsByStudentIdAndCourseId(studentId, courseId)) {
            throw new BadRequestException("Student is not enrolled in this course");
        }

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", "id", courseId));

        enrollmentRepository.deleteByStudentIdAndCourseId(studentId, courseId);
        course.setEnrolledCount(Math.max(0, course.getEnrolledCount() - 1));
        courseRepository.save(course);
    }


    public java.util.List<com.smartsms.student.dto.StudentDto> getEnrolledStudents(String courseId) {
        return enrollmentRepository.findByCourseId(courseId).stream()
            .map(enrollment -> {
                Student student = enrollment.getStudent();
                java.util.List<String> enrolledCourseIds = enrollmentRepository.findByStudentId(student.getId()).stream()
                    .map(e -> e.getCourse().getId())
                    .collect(java.util.stream.Collectors.toList());
                return new com.smartsms.student.dto.StudentDto(
                    student.getId(),
                    student.getStudentNumber(),
                    student.getName(),
                    student.getAge(),
                    student.getGender() != null ? student.getGender().name() : null,
                    student.getEmail(),
                    student.getClazz() != null ? student.getClazz().getName() : null,
                    student.getClazz() != null ? student.getClazz().getId() : null,
                    student.getEnrollmentDate() != null ? student.getEnrollmentDate().toString() : null,
                    student.getGpa(),
                    student.getAttendance(),
                    student.getStatus() != null ? student.getStatus().name() : null,
                    student.getAvatar(),
                    enrolledCourseIds
                );
            })
            .collect(java.util.stream.Collectors.toList());
    }

    private CourseDto toDto(Course course, String studentId) {
        Boolean isEnrolled = null;
        if (studentId != null) {
            isEnrolled = enrollmentRepository.existsByStudentIdAndCourseId(studentId, course.getId());
        }
        
        // Handle case where teacher might be deleted (teacher_id = NULL)
        String teacherName = course.getTeacher() != null ? course.getTeacher().getName() : "待分配";
        String teacherAvatar = course.getTeacher() != null ? course.getTeacher().getAvatar() : null;
        
        return new CourseDto(
                course.getId(),
                course.getName(),
                teacherName,
                teacherAvatar,
                course.getCredits(),
                course.getEnrolledCount(),
                course.getMaxCapacity(),
                course.getSchedule(),
                course.getLocation(),
                isEnrolled
        );
    }
}
