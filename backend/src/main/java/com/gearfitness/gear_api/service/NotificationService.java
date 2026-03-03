package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.entity.Notification;
import com.gearfitness.gear_api.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public List<Notification> getNotificationsForUser(UUID userId) {
        return notificationRepository
                .findByRecipientUserUserIdOrderByCreatedAtDesc(userId);
    }

    public long getUnreadCount(UUID userId) {
        return notificationRepository
                .countByRecipientUserUserIdAndIsReadFalse(userId);
    }

    public void markAllAsRead(UUID userId) {
        List<Notification> notifications =
                notificationRepository
                        .findByRecipientUserUserIdOrderByCreatedAtDesc(userId);

        notifications.forEach(n -> n.setRead(true));

        notificationRepository.saveAll(notifications);
    }
}