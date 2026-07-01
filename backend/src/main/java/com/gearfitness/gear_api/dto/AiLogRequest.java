package com.gearfitness.gear_api.dto;

import lombok.Data;

/**
 * Request to log food from natural-language text via AI (ULTRA tier). The text
 * is a single line the user typed in the Smart Journal, e.g. "2 eggs and toast".
 */
@Data
public class AiLogRequest {

  private String text;
  private String date; // YYYY-MM-DD, optional (defaults today)
  private String category; // visual card label, optional
}
