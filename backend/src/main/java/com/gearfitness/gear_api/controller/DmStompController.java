package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.ConversationParticipantRepository;
import com.gearfitness.gear_api.service.DirectMessageEventPublisher;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

/**
 * Inbound STOMP handlers for direct messaging. Currently just typing indicators:
 * clients publish to {@code /app/conversation.{id}.typing}, and the event is
 * relayed to the conversation's other active participants. Everything else
 * (send/read/react) goes over REST and is broadcast from the service layer.
 */
@Controller
@RequiredArgsConstructor
public class DmStompController {

  private final ConversationParticipantRepository participantRepository;
  private final AppUserRepository appUserRepository;
  private final DirectMessageEventPublisher eventPublisher;

  @MessageMapping("/conversation.{conversationId}.typing")
  public void typing(
    @DestinationVariable UUID conversationId,
    @Payload TypingMessage payload,
    Principal principal
  ) {
    if (principal == null) {
      return;
    }
    UUID userId = UUID.fromString(principal.getName());

    // Only relay for a genuine active member of this conversation.
    boolean isActiveMember = participantRepository
      .findByConversation_ConversationIdAndUser_UserId(conversationId, userId)
      .filter(p -> p.getLeftAt() == null)
      .isPresent();
    if (!isActiveMember) {
      return;
    }

    String username = appUserRepository
      .findById(userId)
      .map(AppUser::getUsername)
      .orElse("");

    List<UUID> recipients = participantRepository
      .findActiveParticipantUserIds(conversationId)
      .stream()
      .filter(id -> !id.equals(userId))
      .toList();

    eventPublisher.typing(
      recipients,
      conversationId,
      userId,
      username,
      payload.isTyping()
    );
  }

  @Data
  public static class TypingMessage {

    private boolean typing;
  }
}
