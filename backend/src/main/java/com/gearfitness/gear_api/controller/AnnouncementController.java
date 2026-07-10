package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.AnnouncementDTO;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.AnnouncementService;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/announcements")
@RequiredArgsConstructor
public class AnnouncementController {

  private final AnnouncementService announcementService;
  private final JwtService jwtService;

  /**
   * GET /api/announcements/pending?appVersion=1.0.0
   * The newest announcement this user should see, or 204 when there is none.
   * appVersion is optional; when absent, version bounds are not enforced.
   */
  @GetMapping("/pending")
  public ResponseEntity<AnnouncementDTO> getPending(
    @RequestHeader("Authorization") String authHeader,
    @RequestParam(required = false) String appVersion
  ) {
    String token = authHeader.substring(7);
    UUID userId = jwtService.extractUserId(token);

    try {
      return announcementService
        .getPendingFor(userId, appVersion)
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.noContent().build());
    } catch (ResponseStatusException e) {
      // Map to the intended status here: a thrown ResponseStatusException
      // re-dispatches to /error, which the security chain turns into a 401.
      return ResponseEntity.status(e.getStatusCode()).build();
    }
  }

  /**
   * POST /api/announcements/{announcementId}/events
   * Body: { "type": "IMPRESSION" | "CTA" | "DISMISS" }
   * Idempotent per (announcement, user, type).
   */
  @PostMapping("/{announcementId}/events")
  public ResponseEntity<Void> recordEvent(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID announcementId,
    @RequestBody Map<String, String> body
  ) {
    String token = authHeader.substring(7);
    UUID userId = jwtService.extractUserId(token);

    try {
      announcementService.recordEvent(userId, announcementId, body.get("type"));
      return ResponseEntity.ok().build();
    } catch (ResponseStatusException e) {
      return ResponseEntity.status(e.getStatusCode()).build();
    }
  }
}
