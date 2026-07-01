package com.gearfitness.gear_api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Thin HTTP client for Perplexity's OpenAI-compatible chat completions endpoint.
 * A single call to Sonar both parses the natural-language food text AND resolves
 * nutrition, returning macros per food plus the source URLs it cited.
 *
 * Mirrors the raw {@link HttpClient} pattern used by ExpoPushService rather than
 * pulling in an SDK, since Perplexity speaks plain REST/JSON.
 */
@Service
@Slf4j
public class PerplexityClient {

  private static final String ENDPOINT = "https://api.perplexity.ai/chat/completions";

  private static final String SYSTEM_PROMPT =
    """
    You are a nutrition parser. The user describes food they ate in natural \
    language. Break it into individual food items and, for each, estimate the \
    nutrition for the amount described (quantities are already factored in).

    Respond with ONLY a JSON object, no prose and no markdown fences:
    {
      "items": [
        {"description": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}
      ],
      "reasoning": string,
      "confidence": number
    }

    - items: one element per distinct food. calories in kcal, macros in grams, \
    all already scaled to the amount eaten. description is a short human label, \
    e.g. "2 scrambled eggs". If the input contains no recognizable food, use [].
    - reasoning: 1-2 short, friendly sentences in plain everyday language that \
    anyone can instantly understand. Simply explain how you came up with the \
    numbers — like the portion size you assumed or how the food was made. Do NOT \
    use jargon, technical wording, or mention sources, brands, databases, or \
    citations. Write it the way you'd casually explain it to a friend.
    - confidence: an integer 0-100 for how sure you are of the estimate — high \
    when you found official/published nutrition data, lower when you had to guess \
    portion sizes or preparation.
    """;

  private final HttpClient httpClient = HttpClient.newHttpClient();
  private final ObjectMapper mapper = new ObjectMapper();
  private final String apiKey;
  private final String model;

  public PerplexityClient(
    @Value("${perplexity.api.key}") String apiKey,
    @Value("${perplexity.model:sonar}") String model
  ) {
    this.apiKey = apiKey;
    this.model = model;
  }

  /** One parsed food item with macros already scaled to the amount eaten. */
  public record ParsedFood(
    String description,
    double calories,
    double proteinG,
    double carbsG,
    double fatG
  ) {}

  /**
   * Sonar's parsed foods, its short reasoning for the estimate, a 0-100
   * confidence score, and the source URLs it cited.
   */
  public record PerplexityResult(
    List<ParsedFood> foods,
    String reasoning,
    int confidence,
    List<String> citations
  ) {}

  public PerplexityResult parse(String userText) {
    try {
      ObjectNode payload = mapper.createObjectNode();
      payload.put("model", model);
      payload.put("return_citations", true);
      ArrayNode messages = payload.putArray("messages");
      ObjectNode sys = messages.addObject();
      sys.put("role", "system");
      sys.put("content", SYSTEM_PROMPT);
      ObjectNode user = messages.addObject();
      user.put("role", "user");
      user.put("content", userText);

      HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(ENDPOINT))
        .header("Authorization", "Bearer " + apiKey)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .POST(
          HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(payload))
        )
        .build();

      HttpResponse<String> response = httpClient.send(
        request,
        HttpResponse.BodyHandlers.ofString()
      );

      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        log.error(
          "Perplexity call failed ({}): {}",
          response.statusCode(),
          response.body()
        );
        throw new IllegalStateException("Perplexity request failed");
      }

      JsonNode root = mapper.readTree(response.body());
      String content = root
        .path("choices")
        .path(0)
        .path("message")
        .path("content")
        .asText("");

      JsonNode parsed = mapper.readTree(stripFences(content));
      return new PerplexityResult(
        parseFoods(parsed),
        parseReasoning(parsed),
        parseConfidence(parsed),
        extractCitations(root)
      );
    } catch (IllegalStateException e) {
      throw e;
    } catch (Exception e) {
      log.error("Perplexity parse error: {}", e.getMessage());
      throw new IllegalStateException("Perplexity request failed", e);
    }
  }

  /**
   * Pull the food items out of Sonar's reply. Preferred shape is an object with
   * an "items" array, but older prompts (and occasional slips) return a bare
   * array — accept either.
   */
  private List<ParsedFood> parseFoods(JsonNode parsed) {
    List<ParsedFood> foods = new ArrayList<>();
    JsonNode arr = parsed.isArray() ? parsed : parsed.path("items");
    if (!arr.isArray()) return foods;
    for (JsonNode n : arr) {
      String desc = n.path("description").asText("").trim();
      if (desc.isEmpty()) continue;
      foods.add(
        new ParsedFood(
          desc,
          n.path("calories").asDouble(0),
          n.path("protein_g").asDouble(0),
          n.path("carbs_g").asDouble(0),
          n.path("fat_g").asDouble(0)
        )
      );
    }
    return foods;
  }

  private String parseReasoning(JsonNode parsed) {
    return parsed.path("reasoning").asText("").trim();
  }

  /** Confidence as an int clamped to 0-100; 0 when absent/unparseable. */
  private int parseConfidence(JsonNode parsed) {
    int c = parsed.path("confidence").asInt(0);
    return Math.max(0, Math.min(100, c));
  }

  private List<String> extractCitations(JsonNode root) {
    List<String> urls = new ArrayList<>();
    JsonNode citations = root.path("citations");
    if (citations.isArray()) {
      for (JsonNode c : citations) {
        String url = c.asText("").trim();
        if (!url.isEmpty()) urls.add(url);
      }
    }
    return urls;
  }

  /** Sonar sometimes wraps the array in ```json fences despite instructions. */
  private String stripFences(String content) {
    String s = content.trim();
    if (s.startsWith("```")) {
      int firstNewline = s.indexOf('\n');
      if (firstNewline >= 0) s = s.substring(firstNewline + 1);
      if (s.endsWith("```")) s = s.substring(0, s.length() - 3);
    }
    return s.trim();
  }
}
