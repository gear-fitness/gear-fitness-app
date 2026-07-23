package com.gearfitness.gear_api.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationDTO {

  private UUID conversationId;
  private String type; // DIRECT | GROUP
  private String title; // group name; null for direct
  private String imageKey; // group avatar key; null for direct
  private UUID createdBy;
  private LocalDateTime createdAt;
  private LocalDateTime lastMessageAt;

  // The caller's own membership view of this conversation.
  private String myState; // ACCEPTED | PENDING
  private String myRole; // MEMBER | ADMIN
  private boolean muted;
  private long unreadCount;

  private List<ConversationParticipantDTO> participants;

  // Most recent message, for the inbox preview line. Null for an empty thread.
  private MessageDTO lastMessage;
}
