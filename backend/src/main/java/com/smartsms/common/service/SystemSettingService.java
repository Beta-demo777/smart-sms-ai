package com.smartsms.common.service;

import com.smartsms.common.entity.SystemSetting;
import com.smartsms.common.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
@RequiredArgsConstructor
public class SystemSettingService {
    
    private final SystemSettingRepository systemSettingRepository;

    public List<SystemSetting> getAllSettings() {
        return systemSettingRepository.findAll();
    }
    
    public Optional<SystemSetting> getSetting(String key) {
        return systemSettingRepository.findByKey(key);
    }
    
    public SystemSetting updateSetting(String key, String value, String description) {
        SystemSetting setting = systemSettingRepository.findByKey(key)
                .orElse(new SystemSetting());
        
        setting.setKey(key);
        setting.setValue(value);
        if (description != null) {
            setting.setDescription(description);
        }
        
        return systemSettingRepository.save(setting);
    }
    
    public void deleteSetting(String key) {
        systemSettingRepository.findByKey(key)
                .ifPresent(systemSettingRepository::delete);
    }
}
