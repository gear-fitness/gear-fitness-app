package com.gearfitness.gear_api.dto;

import lombok.Data;

/**
 * Rename a group and/or set its avatar. A null field is left unchanged; a blank
 * string clears it.
 */
@Data
public class UpdateConversationRequest {

  private String title;
  private String imageKey;
}
