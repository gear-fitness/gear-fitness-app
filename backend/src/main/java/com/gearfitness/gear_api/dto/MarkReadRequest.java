package com.gearfitness.gear_api.dto;

import java.util.UUID;
import lombok.Data;

/**
 * Advance the caller's read pointer to (and including) this message.
 */
@Data
public class MarkReadRequest {

  private UUID lastReadMessageId;
}
