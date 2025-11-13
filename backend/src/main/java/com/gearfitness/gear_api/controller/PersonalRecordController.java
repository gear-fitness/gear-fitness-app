package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.PersonalRecordDTO;
import com.gearfitness.gear_api.service.PersonalRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/personal-records")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PersonalRecordController {

    private final PersonalRecordService personalRecordService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<PersonalRecordDTO>> getUserPRs(@PathVariable UUID userId) {
        List<PersonalRecordDTO> prs = personalRecordService.getBigThreePRs(userId);
        return ResponseEntity.ok(prs);
    }
}