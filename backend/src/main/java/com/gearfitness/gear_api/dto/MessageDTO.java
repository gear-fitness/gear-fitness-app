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
public class MessageDTO {

  private UUID messageId;
  private UUID conversationId;

  private UUID senderId;
  private String senderUsername;
  private String senderProfilePictureUrl;

  private String content;
  // Bare S3 keys; the client resolves them to presigned GET URLs (same as posts).
  private List<String> mediaKeys;

  private LocalDateTime createdAt;
  private LocalDateTime editedAt;
  private boolean deleted;

  // Echoed back so the sender can reconcile the optimistic message it rendered.
  private String clientNonce;
}
