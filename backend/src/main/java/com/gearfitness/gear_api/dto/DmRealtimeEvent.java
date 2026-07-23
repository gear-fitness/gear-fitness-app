package com.gearfitness.gear_api.dto;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A single real-time event pushed to a user's {@code /user/{id}/queue/messages}
 * destination. One envelope for all event kinds; the client switches on
 * {@code type}. Unused fields are null for a given type.
 *
 * <ul>
 *   <li>{@code message}: {@code message} is set.</li>
 *   <li>{@code seen}: {@code userId} + {@code lastReadMessageId} are set.</li>
 *   <li>{@code typing}: {@code userId} + {@code username} + {@code typing} are set.</li>
 * </ul>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DmRealtimeEvent {

  private String type; // message | seen | typing | accepted | left
  private UUID conversationId;

  private MessageDTO message;

  private UUID userId;
  private String username;
  private UUID lastReadMessageId;
  private Boolean typing;
}
