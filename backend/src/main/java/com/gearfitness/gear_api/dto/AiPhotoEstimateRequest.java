package com.gearfitness.gear_api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A meal photo for AI nutrition estimation. The client compresses to about
 * 1024px JPEG, uploads it directly to S3 via a presigned PUT, and sends only
 * the resulting object key here (keeping the request body tiny so it clears the
 * WAF). The server reads the object, analyzes it, and deletes it. note is
 * optional free-text context from the user ("2% milk, large bowl").
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiPhotoEstimateRequest {

  private String s3Key;
  private String note;
}
