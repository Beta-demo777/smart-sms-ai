package com.smartsms.clazz.service;

import com.smartsms.clazz.dto.ClazzDto;
import com.smartsms.clazz.dto.CreateClazzRequest;
import com.smartsms.clazz.dto.UpdateClazzRequest;
import com.smartsms.clazz.entity.Clazz;
import com.smartsms.clazz.entity.ClazzStatus;
import com.smartsms.clazz.repository.ClazzRepository;
import com.smartsms.common.exception.ResourceNotFoundException;
import com.smartsms.student.repository.StudentRepository;
import com.smartsms.teacher.entity.Teacher;
import com.smartsms.teacher.repository.TeacherRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ClazzService {

    private final ClazzRepository clazzRepository;
    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;

    public ClazzService(ClazzRepository clazzRepository, TeacherRepository teacherRepository, StudentRepository studentRepository) {
        this.clazzRepository = clazzRepository;
        this.teacherRepository = teacherRepository;
        this.studentRepository = studentRepository;
    }

    public Page<ClazzDto> getAllClasses(Pageable pageable) {
        return clazzRepository.findAll(pageable).map(this::toDto);
    }

    public Page<ClazzDto> getClassesByStatus(String status, Pageable pageable) {
        return clazzRepository.findByStatus(ClazzStatus.fromValue(status), pageable).map(this::toDto);
    }

    public Page<ClazzDto> searchClasses(String keyword, Pageable pageable) {
        return clazzRepository.searchByKeyword(keyword, pageable).map(this::toDto);
    }

    public ClazzDto getClassById(String id) {
        Clazz clazz = clazzRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Class", "id", id));
        return toDto(clazz);
    }

    public ClazzDto createClass(CreateClazzRequest request) {
        Clazz clazz = new Clazz();
        clazz.setName(request.name());
        clazz.setDepartment(request.department());
        clazz.setYear(request.year());
        clazz.setStatus(request.status() != null ? ClazzStatus.fromValue(request.status()) : ClazzStatus.ACTIVE);

        if (request.advisorId() != null) {
            Teacher advisor = teacherRepository.findById(request.advisorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", request.advisorId()));
            clazz.setAdvisor(advisor);
        }

        return toDto(clazzRepository.save(clazz));
    }

    public ClazzDto updateClass(String id, UpdateClazzRequest request) {
        Clazz clazz = clazzRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Class", "id", id));

        if (request.name() != null) clazz.setName(request.name());
        if (request.department() != null) clazz.setDepartment(request.department());
        if (request.year() != null) clazz.setYear(request.year());
        if (request.status() != null) clazz.setStatus(ClazzStatus.fromValue(request.status()));
        if (request.advisorId() != null) {
            Teacher advisor = teacherRepository.findById(request.advisorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", request.advisorId()));
            clazz.setAdvisor(advisor);
        }

        return toDto(clazzRepository.save(clazz));
    }

    public void deleteClass(String id) {
        if (!clazzRepository.existsById(id)) {
            throw new ResourceNotFoundException("Class", "id", id);
        }
        clazzRepository.deleteById(id);
    }

    private ClazzDto toDto(Clazz clazz) {
        int realtimeStudentCount = (int) studentRepository.countByClazzId(clazz.getId());
        return new ClazzDto(
                clazz.getId(),
                clazz.getName(),
                clazz.getDepartment(),
                clazz.getAdvisor() != null ? clazz.getAdvisor().getName() : null,
                realtimeStudentCount,
                clazz.getYear(),
                clazz.getStatus().getValue()
        );
    }
}
