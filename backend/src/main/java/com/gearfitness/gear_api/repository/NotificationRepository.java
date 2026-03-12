package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findByRecipient_UserIdOrderByCreatedAtDesc(UUID userId);

    long countByRecipient_UserIdAndIsReadFalse(UUID userId);
}