package com.gearfitness.gear_api.dto;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationParticipantDTO {

  private UUID userId;
  private String username;
  private String displayName;
  private String profilePictureUrl;
  private String role;
  private String state;

  // Read pointer, so the thread can render "Seen" for other participants.
  private UUID lastReadMessageId;
}
