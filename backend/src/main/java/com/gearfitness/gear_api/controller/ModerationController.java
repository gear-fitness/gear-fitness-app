package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.ModerationItemDTO;
import com.gearfitness.gear_api.service.ModerationService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Dev/admin review surface for image moderation. These routes require a valid
 * JWT (they are not in permitAll()) AND the shared moderation secret, presented
 * in the X-Moderation-Secret header — there is no per-user role system, so the
 * secret is what gates reviewer access. The service checks it before acting.
 */
@RestController
@RequestMapping("/api/admin/moderation")
@RequiredArgsConstructor
public class ModerationController {

  private static final String SECRET_HEADER = "X-Moderation-Secret";

  private final ModerationService moderationService;

  /** GET /api/admin/moderation — flagged + errored items awaiting review. */
  @GetMapping
  public ResponseEntity<List<ModerationItemDTO>> listQueue(
    @RequestHeader(value = SECRET_HEADER, required = false) String secret
  ) {
    return ResponseEntity.ok(moderationService.listQueue(secret));
  }

  /** POST /api/admin/moderation/{id}/approve — un-hide the post. */
  @PostMapping("/{moderationId}/approve")
  public ResponseEntity<Void> approve(
    @RequestHeader(value = SECRET_HEADER, required = false) String secret,
    @PathVariable UUID moderationId
  ) {
    moderationService.approve(moderationId, secret);
    return ResponseEntity.noContent().build();
  }

  /** POST /api/admin/moderation/{id}/reject — confirm and remove the post. */
  @PostMapping("/{moderationId}/reject")
  public ResponseEntity<Void> reject(
    @RequestHeader(value = SECRET_HEADER, required = false) String secret,
    @PathVariable UUID moderationId
  ) {
    moderationService.reject(moderationId, secret);
    return ResponseEntity.noContent().build();
  }
}
