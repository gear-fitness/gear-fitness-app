package com.gearfitness.gear_api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

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

  private static final String ENDPOINT =
    "https://api.perplexity.ai/chat/completions";

  private static final String SYSTEM_PROMPT = """
    You are a nutrition parser for a food journal app. Every input is text the \
    user typed into their food diary, so treat it as food or drink they consumed \
    unless it clearly cannot be. Break it into individual food items and, for \
    each, estimate the nutrition for the amount described.

    How to interpret the entry:
    - Users type shorthand: bare brand names, partial names, misspellings, \
    slang. Resolve each to the most popular food or drink it plausibly refers \
    to. Examples: "alani" means an Alani Nu energy drink, "celsius" a Celsius \
    energy drink, "pb&j" a peanut butter and jelly sandwich, "chipotle bowl" a \
    typical Chipotle burrito bowl.
    - If no quantity is given, assume one standard serving (one can, one \
    sandwich, one cup) and say so in the description, e.g. "Alani Nu energy \
    drink (12 oz can)".
    - If preparation is unspecified, assume the most common preparation.
    - For branded or restaurant items, look up the official published nutrition \
    facts and use per-serving label values; for generic foods use standard \
    nutrition-database values. Trust, in order: the manufacturer or \
    restaurant's own website, government databases like USDA FoodData Central, \
    then established nutrition databases (Nutritionix, CalorieKing, FatSecret). \
    Never base numbers on social media posts, forums, blogs, or news articles.
    - Return an empty items list ONLY when the input clearly is not food or \
    drink even under a generous reading (gibberish, a question, a note like \
    "meeting at 3pm"). Never return empty because the input is vague, a brand \
    name alone, or missing a quantity — give your best estimate and express the \
    uncertainty through a lower confidence instead.

    Respond with ONLY a JSON object, no prose and no markdown fences:
    {
      "items": [
        {"description": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}
      ],
      "reasoning": string,
      "confidence": number
    }

    - items: one element per distinct food. calories in kcal, macros in grams, \
    all scaled to the amount eaten. description is a short human label, \
    e.g. "2 scrambled eggs".
    - reasoning: 1-2 short, friendly sentences in plain everyday language that \
    anyone can instantly understand. Simply explain how you came up with the \
    numbers — like the portion size you assumed or how the food was made. Do NOT \
    use jargon, technical wording, or mention sources, brands, databases, or \
    citations. Write it the way you'd casually explain it to a friend.
    - confidence: an integer 0-100 for how sure you are of the estimate — high \
    when you found official/published nutrition data, lower when you had to guess \
    what the user meant, the portion size, or the preparation.
    """;

  private static final String VISION_SYSTEM_PROMPT = """
    You are a nutrition estimator for a food journal app. The user attaches a \
    photo of food or drink they ate, sometimes with a short note adding \
    context. Identify each distinct food or drink visible and, for each, \
    estimate the nutrition for the portion shown.

    How to read the photo:
    - Estimate portion sizes from visual cues: plate and bowl size, utensils, \
    packaging, can or bottle size, how full the container is.
    - Recognizable brands and restaurant items should use their official \
    published nutrition facts scaled to the visible portion; generic foods use \
    standard nutrition-database values. Trust, in order: the manufacturer or \
    restaurant's own website, government databases like USDA FoodData Central, \
    then established nutrition databases. Never base numbers on social media \
    posts, forums, blogs, or news articles.
    - If the user's note names brands, ingredients, preparation, or amounts, \
    trust the note over what the photo alone suggests; it exists to resolve \
    exactly that ambiguity.
    - Ignore inedible items, packaging without food, people, and backgrounds.
    - Return an empty items list ONLY when the image clearly contains no food \
    or drink at all. Never return empty because the photo is unclear or the \
    portion is hard to judge; give your best estimate and express the \
    uncertainty through a lower confidence instead.

    Respond with ONLY a JSON object, no prose and no markdown fences:
    {
      "items": [
        {"description": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}
      ],
      "reasoning": string,
      "confidence": number
    }

    - items: one element per distinct food. calories in kcal, macros in grams, \
    all scaled to the portion visible. description is a short human label \
    including the portion, e.g. "Grilled chicken breast (6 oz)".
    - reasoning: 1-2 short, friendly sentences in plain everyday language \
    explaining how you judged what the food was and how much of it there is. \
    Do NOT use jargon or mention sources, brands, databases, or citations.
    - confidence: an integer 0-100 for how sure you are of the estimate; lower \
    when the foods, portions, or preparation were hard to judge from the photo.
    """;

  // Domains Sonar must never search or cite ("-" prefix = blocklist). Social /
  // user-generated content gave wildly unreliable macros (e.g. "alani" citing
  // five Instagram posts). A blocklist beats an allowlist here because branded
  // foods need the brand's own site, which can't be enumerated up front.
  // Perplexity caps search_domain_filter at 10 entries.
  private static final List<String> BLOCKED_DOMAINS = List.of(
    "-instagram.com",
    "-facebook.com",
    "-tiktok.com",
    "-pinterest.com",
    "-reddit.com",
    "-twitter.com",
    "-x.com",
    "-youtube.com",
    "-quora.com",
    "-threads.net"
  );

  // Bound the connect phase. The per-request read timeout is set on each
  // HttpRequest below (generous, to cover the one-time schema-compile latency
  // Perplexity incurs on the first structured-outputs call for a new schema).
  private final HttpClient httpClient = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(10))
    .build();
  private final ObjectMapper mapper = new ObjectMapper();
  private final String apiKey;
  private final String model;
  // Guards the missing-key WARN so it is logged once per process, not per call.
  private final AtomicBoolean warnedMissingKey = new AtomicBoolean(false);

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
    requireApiKey();
    try {
      ObjectNode payload = basePayload(SYSTEM_PROMPT);
      ObjectNode user = ((ArrayNode) payload.get("messages")).addObject();
      user.put("role", "user");
      // Frame the raw text as a diary entry: Sonar builds its web search from
      // the user message, and a bare brand word like "alani" only resolves to
      // the food product when the food-journal context travels with it.
      user.put("content", "Food journal entry: \"" + userText + "\"");
      return execute(payload);
    } catch (IllegalStateException e) {
      throw e;
    } catch (Exception e) {
      log.error("Perplexity parse error: {}", e.getMessage());
      throw new IllegalStateException("Perplexity request failed", e);
    }
  }

  /**
   * Estimate nutrition from a photo of food. The image travels inline as a
   * base64 data URI in an image_url content part alongside the (optional)
   * user note. Same response contract as {@link #parse}.
   */
  public PerplexityResult estimateFoodFromImage(
    String imageBase64,
    String mimeType,
    String note
  ) {
    requireApiKey();
    try {
      ObjectNode payload = basePayload(VISION_SYSTEM_PROMPT);
      ObjectNode user = ((ArrayNode) payload.get("messages")).addObject();
      user.put("role", "user");
      ArrayNode content = user.putArray("content");
      ObjectNode text = content.addObject();
      text.put("type", "text");
      text.put(
        "text",
        note == null || note.isBlank()
          ? "Photo of food from my food journal."
          : "Photo of food from my food journal. My note about it: \"" +
            note.trim() +
            "\""
      );
      ObjectNode image = content.addObject();
      image.put("type", "image_url");
      image
        .putObject("image_url")
        .put("url", "data:" + mimeType + ";base64," + imageBase64);
      return execute(payload);
    } catch (IllegalStateException e) {
      throw e;
    } catch (Exception e) {
      log.error("Perplexity photo estimate error: {}", e.getMessage());
      throw new IllegalStateException("Perplexity request failed", e);
    }
  }

  /**
   * The API key is injected with an empty default so an unset PERPLEXITY_API_KEY
   * does not kill startup. If it is blank we cannot make the paid call, so fail
   * with the same client-visible 503 style the service uses for spend limits.
   */
  private void requireApiKey() {
    if (apiKey == null || apiKey.isBlank()) {
      if (warnedMissingKey.compareAndSet(false, true)) {
        log.warn(
          "PERPLEXITY_API_KEY is not set; AI nutrition logging is disabled and will return 503 AI_UNAVAILABLE."
        );
      }
      throw new ResponseStatusException(
        HttpStatus.SERVICE_UNAVAILABLE,
        "AI_UNAVAILABLE"
      );
    }
  }

  /** Shared request scaffolding: model, sampling, domain filter, system prompt, schema. */
  private ObjectNode basePayload(String systemPrompt) {
    ObjectNode payload = mapper.createObjectNode();
    payload.put("model", model);
    payload.put("return_citations", true);
    // Low temperature: estimates for the same input should not swing between
    // calls (the text cache also assumes one text -> one stable parse).
    payload.put("temperature", 0.1);
    ArrayNode domainFilter = payload.putArray("search_domain_filter");
    BLOCKED_DOMAINS.forEach(domainFilter::add);
    // Cap output so the schema is actually honored (Perplexity only enforces
    // the format if the response fits under max_tokens).
    payload.put("max_tokens", 1200);
    ArrayNode messages = payload.putArray("messages");
    ObjectNode sys = messages.addObject();
    sys.put("role", "system");
    sys.put("content", systemPrompt);
    // Structured outputs: constrain the decoder to emit schema-valid JSON.
    // This is what makes the parse reliable; the prompt alone let Sonar wrap
    // the object in prose, which broke JSON parsing. Citations are unaffected;
    // they still arrive at the response top level (see extractCitations).
    addResponseFormat(payload);
    return payload;
  }

  /** Send the payload and parse the schema-shaped reply into a result. */
  private PerplexityResult execute(ObjectNode payload) throws Exception {
    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(ENDPOINT))
      .timeout(Duration.ofSeconds(30))
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

    JsonNode parsed = mapper.readTree(extractJson(content));
    return new PerplexityResult(
      parseFoods(parsed),
      parseReasoning(parsed),
      parseConfidence(parsed),
      extractCitations(root)
    );
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

  /**
   * Attach a json_schema response_format to the payload so Perplexity returns
   * schema-valid JSON. Mirrors the shape the SYSTEM_PROMPT documents.
   */
  private void addResponseFormat(ObjectNode payload) {
    ObjectNode jsonSchema = payload
      .putObject("response_format")
      .put("type", "json_schema")
      .putObject("json_schema");
    jsonSchema.put("name", "nutrition_parse");

    ObjectNode schema = jsonSchema.putObject("schema");
    schema.put("type", "object");
    schema.put("additionalProperties", false);
    schema.putArray("required").add("items").add("reasoning").add("confidence");
    ObjectNode props = schema.putObject("properties");

    ObjectNode items = props.putObject("items");
    items.put("type", "array");
    ObjectNode item = items.putObject("items");
    item.put("type", "object");
    item.put("additionalProperties", false);
    item
      .putArray("required")
      .add("description")
      .add("calories")
      .add("protein_g")
      .add("carbs_g")
      .add("fat_g");
    ObjectNode itemProps = item.putObject("properties");
    itemProps.putObject("description").put("type", "string");
    itemProps.putObject("calories").put("type", "number");
    itemProps.putObject("protein_g").put("type", "number");
    itemProps.putObject("carbs_g").put("type", "number");
    itemProps.putObject("fat_g").put("type", "number");

    props.putObject("reasoning").put("type", "string");
    props.putObject("confidence").put("type", "number");
  }

  /**
   * Pull the JSON body out of Sonar's reply. With structured outputs on, the
   * content is already bare JSON; this is a fallback for truncation/refusal edge
   * cases. Strip ```` ``` ```` fences, then, if the result still isn't bare JSON,
   * slice from the first opening bracket to the last matching one so surrounding
   * prose is discarded before parsing.
   */
  private String extractJson(String content) {
    String s = content.trim();
    if (s.startsWith("```")) {
      int firstNewline = s.indexOf('\n');
      if (firstNewline >= 0) s = s.substring(firstNewline + 1);
      int lastFence = s.lastIndexOf("```");
      if (lastFence >= 0) s = s.substring(0, lastFence);
      s = s.trim();
    }
    if (s.startsWith("{") || s.startsWith("[")) return s;

    int objStart = s.indexOf('{');
    int arrStart = s.indexOf('[');
    int start =
      objStart < 0
        ? arrStart
        : arrStart < 0
          ? objStart
          : Math.min(objStart, arrStart);
    if (start < 0) return s;
    char close = s.charAt(start) == '{' ? '}' : ']';
    int end = s.lastIndexOf(close);
    return end > start ? s.substring(start, end + 1) : s;
  }
}
