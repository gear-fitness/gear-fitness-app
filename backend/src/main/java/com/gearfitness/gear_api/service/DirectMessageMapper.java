package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.ConversationParticipantDTO;
import com.gearfitness.gear_api.dto.MessageDTO;
import com.gearfitness.gear_api.entity.ConversationParticipant;
import com.gearfitness.gear_api.entity.Message;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Maps direct-message entities to their DTOs. Collections (media) are resolved
 * through the entity relationships, so callers must map inside an open
 * transaction (open-in-view is disabled). A soft-deleted message is rendered as
 * a tombstone: its content and media are stripped and {@code deleted} is set.
 */
@Component
public class DirectMessageMapper {

  public MessageDTO toMessageDto(Message message) {
    boolean deleted = message.getDeletedAt() != null;

    List<String> mediaKeys = deleted
      ? List.of()
      : message
        .getMedia()
        .stream()
        .map(m -> m.getS3Key())
        .toList();

    return MessageDTO.builder()
      .messageId(message.getMessageId())
      .conversationId(message.getConversation().getConversationId())
      .senderId(message.getSender().getUserId())
      .senderUsername(message.getSender().getUsername())
      .senderProfilePictureUrl(message.getSender().getProfilePictureUrl())
      .content(deleted ? null : message.getContent())
      .mediaKeys(mediaKeys)
      .createdAt(message.getCreatedAt())
      .editedAt(message.getEditedAt())
      .deleted(deleted)
      .clientNonce(message.getClientNonce())
      .build();
  }

  public ConversationParticipantDTO toParticipantDto(
    ConversationParticipant participant
  ) {
    return ConversationParticipantDTO.builder()
      .userId(participant.getUser().getUserId())
      .username(participant.getUser().getUsername())
      .displayName(participant.getUser().getDisplayName())
      .profilePictureUrl(participant.getUser().getProfilePictureUrl())
      .role(participant.getRole().name())
      .state(participant.getState().name())
      .lastReadMessageId(participant.getLastReadMessageId())
      .build();
  }
}
