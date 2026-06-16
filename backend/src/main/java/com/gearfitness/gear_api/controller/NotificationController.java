package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.NotificationDTO;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.NotificationService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

  private final NotificationService notificationService;
  private final JwtService jwtService;

  @GetMapping
  public List<NotificationDTO> getNotifications(
    @RequestHeader("Authorization") String authHeader
  ) {
    String token = authHeader.substring(7);
    UUID userId = jwtService.extractUserId(token);

    return notificationService.getNotificationsForUser(userId);
  }

  @GetMapping("/unread-count")
  public long getUnreadCount(
    @RequestHeader("Authorization") String authHeader
  ) {
    String token = authHeader.substring(7);
    UUID userId = jwtService.extractUserId(token);

    return notificationService.getUnreadCount(userId);
  }

  @PostMapping("/mark-read")
  public void markAllAsRead(@RequestHeader("Authorization") String authHeader) {
    String token = authHeader.substring(7);
    UUID userId = jwtService.extractUserId(token);

    notificationService.markAllAsRead(userId);
  }

  @DeleteMapping("/{notificationId}")
  public void deleteNotification(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID notificationId
  ) {
    String token = authHeader.substring(7);
    UUID userId = jwtService.extractUserId(token);

    notificationService.deleteNotification(userId, notificationId);
  }

  @PostMapping("/token")
  public void registerToken(
    @RequestHeader("Authorization") String authHeader,
    @RequestBody Map<String, String> body
  ) {
    String token = authHeader.substring(7);
    UUID userId = jwtService.extractUserId(token);
    String pushToken = body.get("token");
    String timeZone = body.get("timeZone");

    notificationService.registerPushToken(userId, pushToken, timeZone);
  }

  @DeleteMapping("/token")
  public void unregisterToken(
    @RequestHeader("Authorization") String authHeader
  ) {
    String token = authHeader.substring(7);
    UUID userId = jwtService.extractUserId(token);

    notificationService.unregisterPushToken(userId);
  }
}
