package cat.montsec.hostal.cms.controller;

import cat.montsec.hostal.cms.service.SiteConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/cms")
@RequiredArgsConstructor
public class SiteConfigController {

    private final SiteConfigService siteConfigService;

    @GetMapping
    public ResponseEntity<Map<String, String>> getAllConfigs() {
        return ResponseEntity.ok(siteConfigService.getAllConfigs());
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping
    public ResponseEntity<Void> updateConfigs(@RequestBody Map<String, String> configs) {
        siteConfigService.updateConfigs(configs);
        return ResponseEntity.ok().build();
    }
}