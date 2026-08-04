package com.smartsms.major.service;

import com.smartsms.common.exception.ResourceNotFoundException;
import com.smartsms.department.entity.Department;
import com.smartsms.department.repository.DepartmentRepository;
import com.smartsms.major.dto.MajorDto;
import com.smartsms.major.entity.Major;
import com.smartsms.major.entity.MajorStatus;
import com.smartsms.major.repository.MajorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MajorService {

    private final MajorRepository majorRepository;
    private final DepartmentRepository departmentRepository;

    public Page<MajorDto> getAllMajors(Pageable pageable) {
        return majorRepository.findAll(pageable).map(this::toDto);
    }

    public MajorDto getMajorById(String id) {
        return majorRepository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Major", "id", id));
    }

    @Transactional
    public MajorDto createMajor(MajorDto dto) {
        if (majorRepository.existsByName(dto.getName())) {
            throw new IllegalArgumentException("Major name already exists");
        }
        if (majorRepository.existsByCode(dto.getCode())) {
            throw new IllegalArgumentException("Major code already exists");
        }

        Major major = new Major();
        updateMajorFromDto(major, dto);
        Major saved = majorRepository.save(major);
        return toDto(saved);
    }

    @Transactional
    public MajorDto updateMajor(String id, MajorDto dto) {
        Major major = majorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Major", "id", id));

        if (!major.getName().equals(dto.getName()) && majorRepository.existsByName(dto.getName())) {
            throw new IllegalArgumentException("Major name already exists");
        }
        if (!major.getCode().equals(dto.getCode()) && majorRepository.existsByCode(dto.getCode())) {
            throw new IllegalArgumentException("Major code already exists");
        }

        updateMajorFromDto(major, dto);
        Major saved = majorRepository.save(major);
        return toDto(saved);
    }

    @Transactional
    public void deleteMajor(String id) {
        if (!majorRepository.existsById(id)) {
            throw new ResourceNotFoundException("Major", "id", id);
        }
        majorRepository.deleteById(id);
    }

    private MajorDto toDto(Major major) {
        return new MajorDto(
                major.getId(),
                major.getName(),
                major.getCode(),
                major.getDepartment() != null ? major.getDepartment().getId() : null,
                major.getDepartment() != null ? major.getDepartment().getName() : null,
                major.getDescription(),
                major.getHead(),
                major.getStatus().getValue(),
                major.getCreatedAt() != null ? major.getCreatedAt().toString() : null
        );
    }

    private void updateMajorFromDto(Major major, MajorDto dto) {
        if (dto.getDepartmentId() == null || dto.getDepartmentId().isBlank()) {
            throw new IllegalArgumentException("Department is required");
        }

        Department department = departmentRepository.findById(dto.getDepartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Department", "id", dto.getDepartmentId()));

        major.setName(dto.getName());
        major.setCode(dto.getCode());
        major.setDepartment(department);
        major.setDescription(dto.getDescription());
        major.setHead(dto.getHead());

        if (dto.getStatus() != null) {
            major.setStatus("启用".equals(dto.getStatus()) ? MajorStatus.ACTIVE : MajorStatus.INACTIVE);
        }
    }
}
