package com.smartsms.major.controller;

import com.smartsms.major.dto.MajorDto;
import com.smartsms.major.service.MajorService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/majors")
@RequiredArgsConstructor
public class MajorController {

    private final MajorService majorService;

    @GetMapping
    public ResponseEntity<Page<MajorDto>> getAllMajors(
            @PageableDefault(sort = "name", direction = Sort.Direction.ASC) Pageable pageable) {
        return ResponseEntity.ok(majorService.getAllMajors(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MajorDto> getMajorById(@PathVariable String id) {
        return ResponseEntity.ok(majorService.getMajorById(id));
    }

    @PostMapping
    public ResponseEntity<MajorDto> createMajor(@RequestBody MajorDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(majorService.createMajor(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MajorDto> updateMajor(@PathVariable String id, @RequestBody MajorDto dto) {
        return ResponseEntity.ok(majorService.updateMajor(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMajor(@PathVariable String id) {
        majorService.deleteMajor(id);
        return ResponseEntity.noContent().build();
    }
}
