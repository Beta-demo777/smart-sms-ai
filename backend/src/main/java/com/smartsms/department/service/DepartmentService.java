package com.smartsms.department.service;

import com.smartsms.common.exception.ResourceNotFoundException;
import com.smartsms.department.dto.DepartmentDto;
import com.smartsms.department.entity.Department;
import com.smartsms.department.entity.DepartmentStatus;
import com.smartsms.department.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    public Page<DepartmentDto> getAllDepartments(Pageable pageable) {
        return departmentRepository.findAll(pageable).map(this::toDto);
    }

    public DepartmentDto getDepartmentById(String id) {
        return departmentRepository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Department", "id", id));
    }

    @Transactional
    public DepartmentDto createDepartment(DepartmentDto dto) {
        if (departmentRepository.existsByName(dto.getName())) {
            throw new IllegalArgumentException("Department name already exists");
        }
        if (departmentRepository.existsByCode(dto.getCode())) {
            throw new IllegalArgumentException("Department code already exists");
        }

        Department department = new Department();
        updateDepartmentFromDto(department, dto);
        Department saved = departmentRepository.save(department);
        return toDto(saved);
    }

    @Transactional
    public DepartmentDto updateDepartment(String id, DepartmentDto dto) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", "id", id));

        if (!department.getName().equals(dto.getName()) && departmentRepository.existsByName(dto.getName())) {
            throw new IllegalArgumentException("Department name already exists");
        }
        if (!department.getCode().equals(dto.getCode()) && departmentRepository.existsByCode(dto.getCode())) {
            throw new IllegalArgumentException("Department code already exists");
        }

        updateDepartmentFromDto(department, dto);
        Department saved = departmentRepository.save(department);
        return toDto(saved);
    }

    @Transactional
    public void deleteDepartment(String id) {
        if (!departmentRepository.existsById(id)) {
            throw new ResourceNotFoundException("Department", "id", id);
        }
        departmentRepository.deleteById(id);
    }

    private DepartmentDto toDto(Department department) {
        return new DepartmentDto(
                department.getId(),
                department.getName(),
                department.getCode(),
                department.getDescription(),
                department.getManager(),
                department.getContactEmail(),
                department.getStatus().getValue(),
                department.getCreatedAt() != null ? department.getCreatedAt().toString() : null
        );
    }

    private void updateDepartmentFromDto(Department department, DepartmentDto dto) {
        department.setName(dto.getName());
        department.setCode(dto.getCode());
        department.setDescription(dto.getDescription());
        department.setManager(dto.getManager());
        department.setContactEmail(dto.getContactEmail());
        if (dto.getStatus() != null) {
            department.setStatus(DepartmentStatus.valueOf(
                dto.getStatus().equals("启用") ? "ACTIVE" : "INACTIVE"
            ));
        }
    }
}
