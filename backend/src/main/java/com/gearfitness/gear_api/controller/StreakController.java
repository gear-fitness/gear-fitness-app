package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.StreakInfoDTO;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.StreakService;
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
    @RequestHeader("Authorization") String authHeader
  ) {
    String token = authHeader.substring(7);
    UUID userId = jwtService.extractUserId(token);
    return ResponseEntity.ok(streakService.getStreakInfo(userId));
  }

  @PostMapping("/rest-day")
  public ResponseEntity<?> logRestDay(
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      String token = authHeader.substring(7);
      UUID userId = jwtService.extractUserId(token);
      return ResponseEntity.ok(streakService.logRestDay(userId));
    } catch (IllegalStateException e) {
      return ResponseEntity.badRequest().body(e.getMessage());
    }
  }

  @PostMapping("/restore")
  public ResponseEntity<?> restoreStreak(
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      String token = authHeader.substring(7);
      UUID userId = jwtService.extractUserId(token);
      return ResponseEntity.ok(streakService.useRestoreToken(userId));
    } catch (IllegalStateException e) {
      return ResponseEntity.badRequest().body(e.getMessage());
    }
  }
}
