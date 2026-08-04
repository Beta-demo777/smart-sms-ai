package com.smartsms.common.controller;

import com.smartsms.common.service.StorageService;
import com.smartsms.activity.service.ActivityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.Map;

@RestController
@RequestMapping("/files")
@Tag(name = "Files", description = "文件上传与访问接口")
public class FileController {

    private final StorageService storageService;
    private final ActivityService activityService;

    public FileController(StorageService storageService, ActivityService activityService) {
        this.storageService = storageService;
        this.activityService = activityService;
    }

    @PostMapping("/upload")
    @Operation(summary = "上传文件", description = "上传单个文件并返回访问URL")
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file,
                                                          Authentication authentication) {
        String filename = storageService.store(file);
        
        String fileDownloadUri = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/files/")
                .path(filename)
                .toUriString();

        String username = authentication != null && authentication.isAuthenticated() ? authentication.getName() : "anonymous";
        activityService.logActivity(username, "FILE_UPLOAD", "filename=" + filename, "system", "success");

        return ResponseEntity.ok(Map.of(
                "filename", filename,
                "url", fileDownloadUri
        ));
    }

    @GetMapping("/{filename:.+}")
    @Operation(summary = "访问文件", description = "根据文件名获取文件内容")
    public ResponseEntity<Resource> getFile(@PathVariable String filename) {
        Resource file = storageService.loadAsResource(filename);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getFilename() + "\"")
                .body(file);
    }
}
