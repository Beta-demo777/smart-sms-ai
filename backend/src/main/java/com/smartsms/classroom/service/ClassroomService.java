package com.smartsms.classroom.service;

import com.smartsms.classroom.dto.ClassroomDto;
import com.smartsms.classroom.dto.CreateClassroomRequest;
import com.smartsms.classroom.dto.UpdateClassroomRequest;
import com.smartsms.classroom.entity.Classroom;
import com.smartsms.classroom.entity.ClassroomStatus;
import com.smartsms.classroom.entity.ClassroomType;
import com.smartsms.classroom.repository.ClassroomRepository;
import com.smartsms.common.exception.ResourceNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ClassroomService {

    private final ClassroomRepository classroomRepository;

    public ClassroomService(ClassroomRepository classroomRepository) {
        this.classroomRepository = classroomRepository;
    }

    public Page<ClassroomDto> getAllClassrooms(Pageable pageable) {
        return classroomRepository.findAll(pageable).map(this::toDto);
    }

    public Page<ClassroomDto> getClassroomsByStatus(String status, Pageable pageable) {
        return classroomRepository.findByStatus(ClassroomStatus.fromValue(status), pageable).map(this::toDto);
    }

    public Page<ClassroomDto> getClassroomsByType(String type, Pageable pageable) {
        return classroomRepository.findByType(ClassroomType.fromValue(type), pageable).map(this::toDto);
    }

    public Page<ClassroomDto> searchClassrooms(String keyword, Pageable pageable) {
        return classroomRepository.searchByKeyword(keyword, pageable).map(this::toDto);
    }

    public ClassroomDto getClassroomById(String id) {
        Classroom classroom = classroomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom", "id", id));
        return toDto(classroom);
    }

    public ClassroomDto createClassroom(CreateClassroomRequest request) {
        Classroom classroom = new Classroom();
        classroom.setName(request.name());
        classroom.setCapacity(request.capacity());
        classroom.setType(ClassroomType.fromValue(request.type()));
        classroom.setStatus(request.status() != null ? ClassroomStatus.fromValue(request.status()) : ClassroomStatus.AVAILABLE);
        classroom.setLocation(request.location());
        if (request.equipment() != null) {
            classroom.setEquipment(request.equipment());
        }

        return toDto(classroomRepository.save(classroom));
    }

    public ClassroomDto updateClassroom(String id, UpdateClassroomRequest request) {
        Classroom classroom = classroomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom", "id", id));

        if (request.name() != null) classroom.setName(request.name());
        if (request.capacity() != null) classroom.setCapacity(request.capacity());
        if (request.type() != null) classroom.setType(ClassroomType.fromValue(request.type()));
        if (request.status() != null) classroom.setStatus(ClassroomStatus.fromValue(request.status()));
        if (request.location() != null) classroom.setLocation(request.location());
        if (request.equipment() != null) classroom.setEquipment(request.equipment());

        return toDto(classroomRepository.save(classroom));
    }

    public void deleteClassroom(String id) {
        if (!classroomRepository.existsById(id)) {
            throw new ResourceNotFoundException("Classroom", "id", id);
        }
        classroomRepository.deleteById(id);
    }

    private ClassroomDto toDto(Classroom classroom) {
        return new ClassroomDto(
                classroom.getId(),
                classroom.getName(),
                classroom.getCapacity(),
                classroom.getType().getValue(),
                classroom.getStatus().getValue(),
                classroom.getLocation(),
                classroom.getEquipment()
        );
    }
}
