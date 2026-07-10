package com.gearfitness.gear_api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A meal photo for AI nutrition estimation. The image travels inline as
 * base64 (the client compresses to about 1024px JPEG first); note is optional
 * free-text context from the user ("2% milk, large bowl").
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiPhotoEstimateRequest {

  private String imageBase64;
  private String mimeType;
  private String note;
}
