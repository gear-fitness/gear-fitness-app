package com.gearfitness.gear_api.dto;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;

/**
 * Upsert one day's journal note. An empty/absent content deletes the note.
 * ifAbsent makes the write create-if-absent (no overwrite), which the client's
 * one-time local-to-server migration uses to stay idempotent across devices.
 */
@Data
public class JournalUpsertRequest {

  private String date; // YYYY-MM-DD
  private JsonNode content;
  private Boolean ifAbsent;
}
