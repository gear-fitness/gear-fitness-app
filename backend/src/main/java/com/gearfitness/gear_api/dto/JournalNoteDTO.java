package com.gearfitness.gear_api.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gearfitness.gear_api.entity.NutritionJournalNote;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One day's journal note. Content is the client-owned lines blob; updatedAt is
 * the client's sync point for last-write-wins reconciliation.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class JournalNoteDTO {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  private String date;
  private JsonNode content;
  private String updatedAt;

  public static JournalNoteDTO from(NutritionJournalNote note) {
    return new JournalNoteDTO(
      note.getLogDate().toString(),
      parseJson(note.getContent()),
      note.getUpdatedAt().toString()
    );
  }

  // The column is jsonb, so stored values are always parseable.
  private static JsonNode parseJson(String raw) {
    if (raw == null) return null;
    try {
      return MAPPER.readTree(raw);
    } catch (Exception ex) {
      return null;
    }
  }
}
