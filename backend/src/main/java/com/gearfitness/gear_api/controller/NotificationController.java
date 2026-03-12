package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.NotificationDTO;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final JwtService jwtService;

    @GetMapping
    public List<NotificationDTO> getNotifications(
            @RequestHeader("Authorization") String authHeader) {

        String token = authHeader.substring(7);
        UUID userId = jwtService.extractUserId(token);

        return notificationService.getNotificationsForUser(userId);
    }

    @GetMapping("/unread-count")
    public long getUnreadCount(
            @RequestHeader("Authorization") String authHeader) {

        String token = authHeader.substring(7);
        UUID userId = jwtService.extractUserId(token);

        return notificationService.getUnreadCount(userId);
    }

    @PostMapping("/mark-read")
    public void markAllAsRead(
            @RequestHeader("Authorization") String authHeader) {

        String token = authHeader.substring(7);
        UUID userId = jwtService.extractUserId(token);

        notificationService.markAllAsRead(userId);
    }
}