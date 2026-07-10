package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.BarcodeLookupResponse;
import com.gearfitness.gear_api.dto.FoodItemDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.FoodItem;
import com.gearfitness.gear_api.entity.Tier;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.FoodItemRepository;
import com.gearfitness.gear_api.service.OpenFoodFactsClient.OffProduct;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Barcode-to-food resolution for the scanner (PLUS tier and above). Lookup
 * order: the local food_item table (seeded USDA Branded rows plus previously
 * scanned OFF products), then a live OpenFoodFacts call whose hit is upserted
 * so the next scan of the same product is local and instant.
 *
 * Codes are normalized to a canonical GTIN-14 (digits only, zero-padded to
 * 14) for storage and local matching, which also unifies the scanner
 * symbology quirks: iOS reports UPC-A as a zero-prefixed EAN-13, and both
 * collapse to the same GTIN-14. UPC-E is additionally tried through its
 * UPC-A expansion since the compressed form shares a length with EAN-8.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BarcodeFoodService {

  /** dataType shared with the seeded USDA branded rows. */
  private static final String BRANDED_DATA_TYPE = "branded_food";

  private final AppUserRepository appUserRepository;
  private final FoodItemRepository foodItemRepository;
  private final OpenFoodFactsClient openFoodFactsClient;

  public BarcodeLookupResponse lookup(UUID userId, String rawCode) {
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() -> new IllegalArgumentException("User not found"));

    if (!user.getTier().atLeast(Tier.PLUS)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "BARCODE_TIER");
    }

    String digits = rawCode == null ? "" : rawCode.replaceAll("\\D", "");
    if (
      digits.isEmpty() ||
      digits.length() < 6 ||
      digits.length() > 14 ||
      !digits.equals(rawCode == null ? "" : rawCode.trim())
    ) {
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "BARCODE_INVALID"
      );
    }

    // Local first. Try the code as scanned plus, for a possible UPC-E, its
    // UPC-A expansion; both in canonical GTIN-14 form.
    Set<String> canonicals = new LinkedHashSet<>();
    canonicals.add(toGtin14(digits));
    String upcA = expandUpcE(digits);
    if (upcA != null) canonicals.add(toGtin14(upcA));

    for (String canonical : canonicals) {
      Optional<FoodItem> local = foodItemRepository.findByBarcode(canonical);
      if (local.isPresent()) {
        return BarcodeLookupResponse.found(FoodItemDTO.from(local.get()));
      }
    }

    // Miss: ask OpenFoodFacts. OFF stores codes in mixed lengths, so try the
    // scanned form, the zero-stripped form (UPC-A scanned as EAN-13), and the
    // UPC-E expansion.
    Set<String> offCandidates = new LinkedHashSet<>();
    offCandidates.add(digits);
    if (digits.length() == 13 && digits.startsWith("0")) {
      offCandidates.add(digits.substring(1));
    }
    if (upcA != null) offCandidates.add(upcA);

    for (String candidate : offCandidates) {
      Optional<OffProduct> hit;
      try {
        hit = openFoodFactsClient.lookup(candidate);
      } catch (RuntimeException e) {
        log.error("OFF lookup failed for {}: {}", candidate, e.getMessage());
        throw new ResponseStatusException(
          HttpStatus.BAD_GATEWAY,
          "BARCODE_UPSTREAM",
          e
        );
      }
      if (hit.isEmpty()) continue;

      OffProduct product = hit.get();
      if (product.name() == null) continue;
      if (product.kcal100g() == null) {
        // OFF knows the product but not its nutrition. Hand the name back so
        // the client can prefill the custom-food fallback; nothing persisted.
        return BarcodeLookupResponse.incomplete(product.name());
      }
      FoodItem saved = upsert(product, toGtin14(candidate));
      return BarcodeLookupResponse.found(FoodItemDTO.from(saved));
    }

    return BarcodeLookupResponse.notFound();
  }

  /**
   * Persist an OFF hit so future scans resolve locally. A concurrent first
   * scan of the same product can insert between our miss and this save; the
   * unique barcode index turns that into a constraint violation we resolve by
   * re-reading the winner's row.
   */
  private FoodItem upsert(OffProduct product, String canonicalBarcode) {
    FoodItem item = FoodItem.builder()
      // Truncate to the food_item varchar limits; OFF names are unbounded.
      .description(truncate(product.name(), 512))
      .brandOwner(truncate(product.brands(), 255))
      .dataType(BRANDED_DATA_TYPE)
      .servingSize(toDecimal(product.servingQuantity()))
      .servingUnit(
        product.servingQuantity() == null
          ? null
          : (product.servingQuantityUnit() == null
              ? "g"
              : product.servingQuantityUnit())
      )
      .householdServing(truncate(product.servingSizeText(), 255))
      .calories(toDecimal(product.kcal100g()))
      .proteinG(toDecimal(zeroIfNull(product.protein100g())))
      .carbsG(toDecimal(zeroIfNull(product.carbs100g())))
      .fatG(toDecimal(zeroIfNull(product.fat100g())))
      .barcode(canonicalBarcode)
      .createdAt(LocalDateTime.now())
      .build();
    try {
      return foodItemRepository.save(item);
    } catch (DataIntegrityViolationException dup) {
      log.debug(
        "Concurrent barcode insert for {}, reusing existing row",
        canonicalBarcode
      );
      return foodItemRepository
        .findByBarcode(canonicalBarcode)
        .orElseThrow(() -> dup);
    }
  }

  /** Canonical storage form: digits zero-padded on the left to 14. */
  static String toGtin14(String digits) {
    return "0".repeat(14 - digits.length()) + digits;
  }

  /**
   * Expand an 8-digit UPC-E (number system 0 or 1) to its 12-digit UPC-A
   * form. Returns null when the code cannot be UPC-E, including the ambiguous
   * EAN-8 case (EAN-8 never starts with 0 or 1 in practice, but a null here
   * only skips the extra lookup attempt, never breaks the primary one).
   */
  static String expandUpcE(String digits) {
    if (digits.length() != 8) return null;
    char numberSystem = digits.charAt(0);
    if (numberSystem != '0' && numberSystem != '1') return null;

    String body = digits.substring(1, 7);
    char check = digits.charAt(7);
    char last = body.charAt(5);

    String middle;
    switch (last) {
      case '0', '1', '2' -> middle =
        body.substring(0, 2) + last + "0000" + body.substring(2, 5);
      case '3' -> middle =
        body.substring(0, 3) + "00000" + body.substring(3, 5);
      case '4' -> middle = body.substring(0, 4) + "00000" + body.charAt(4);
      default -> middle = body.substring(0, 5) + "0000" + last;
    }
    return numberSystem + middle + check;
  }

  private static String truncate(String value, int maxLength) {
    if (value == null || value.length() <= maxLength) return value;
    return value.substring(0, maxLength);
  }

  private static Double zeroIfNull(Double value) {
    return value == null ? 0.0 : value;
  }

  private static BigDecimal toDecimal(Double value) {
    return value == null ? null : BigDecimal.valueOf(value);
  }
}
