package com.gearfitness.gear_api.dto;

import java.util.List;
import lombok.Data;

/**
 * Send a message. At least one of {@code content} or {@code mediaKeys} must be
 * present. {@code clientNonce} is an optional idempotency token echoed back so
 * the sender can reconcile its optimistic message.
 */
@Data
public class SendMessageRequest {

  private String content;
  private List<String> mediaKeys;
  private String clientNonce;
}
