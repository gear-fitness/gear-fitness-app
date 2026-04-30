package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.StreakInfoDTO;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.StreakService;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/streaks")
@RequiredArgsConstructor
public class StreakController {

  private final StreakService streakService;
  private final JwtService jwtService;

  @GetMapping("/info")
  public ResponseEntity<StreakInfoDTO> getStreakInfo(
    @RequestHeader("Authorization") String authHeader,
    @RequestParam(required = false) String localDate
  ) {
    String token = authHeader.substring(7);
    UUID userId = jwtService.extractUserId(token);
    return ResponseEntity.ok(
      streakService.getStreakInfo(userId, resolveToday(localDate))
    );
  }

  @PostMapping("/rest-day")
  public ResponseEntity<?> logRestDay(
    @RequestHeader("Authorization") String authHeader,
    @RequestParam(required = false) String localDate
  ) {
    try {
      String token = authHeader.substring(7);
      UUID userId = jwtService.extractUserId(token);
      return ResponseEntity.ok(
        streakService.logRestDay(userId, resolveToday(localDate))
      );
    } catch (IllegalStateException e) {
      return ResponseEntity.badRequest().body(e.getMessage());
    }
  }

  @PostMapping("/restore")
  public ResponseEntity<?> restoreStreak(
    @RequestHeader("Authorization") String authHeader,
    @RequestParam(required = false) String localDate
  ) {
    try {
      String token = authHeader.substring(7);
      UUID userId = jwtService.extractUserId(token);
      return ResponseEntity.ok(
        streakService.useRestoreToken(userId, resolveToday(localDate))
      );
    } catch (IllegalStateException e) {
      return ResponseEntity.badRequest().body(e.getMessage());
    }
  }

  private LocalDate resolveToday(String localDate) {
    return (localDate != null && !localDate.isBlank())
      ? LocalDate.parse(localDate)
      : LocalDate.now(ZoneOffset.UTC);
  }
}
