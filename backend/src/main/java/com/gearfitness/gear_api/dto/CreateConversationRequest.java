package com.gearfitness.gear_api.dto;

import java.util.List;
import java.util.UUID;
import lombok.Data;

/**
 * Start (or, for a 1:1, find-or-create) a conversation. One other participant =
 * DIRECT; two or more = GROUP. {@code title} is optional and applies to groups.
 */
@Data
public class CreateConversationRequest {

  private List<UUID> participantIds;
  private String title;
}
