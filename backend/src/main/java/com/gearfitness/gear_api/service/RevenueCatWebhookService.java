package com.gearfitness.gear_api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Tier;
import com.gearfitness.gear_api.repository.AppUserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Processes RevenueCat server webhooks and writes the authoritative subscription
 * tier onto {@link AppUser}. The RevenueCat {@code app_user_id} equals our
 * {@code AppUser.userId} (set via Purchases.logIn on the client), so events map
 * directly to a row.
 *
 * <p>Idempotent by construction: the desired state is derived from each event's
 * own payload (entitlement ids + expiry), so re-delivery produces the same
 * write. Strict out-of-order protection (a stale RENEWAL arriving after an
 * EXPIRATION) is intentionally deferred.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class RevenueCatWebhookService {

  private final AppUserRepository appUserRepository;

  @Value("${revenuecat.webhook.secret}")
  private String webhookSecret;

  // Events that confer/refresh access.
  private static final Set<String> GRANT_EVENTS = Set.of(
    "INITIAL_PURCHASE",
    "RENEWAL",
    "PRODUCT_CHANGE",
    "UNCANCELLATION",
    "NON_RENEWING_PURCHASE",
    "SUBSCRIPTION_EXTENDED"
  );

  // Only EXPIRATION revokes. CANCELLATION keeps access until the period ends;
  // BILLING_ISSUE keeps the entitlement active during the grace period.
  private static final Set<String> REVOKE_EVENTS = Set.of("EXPIRATION");

  /** Constant-time comparison of the Authorization header against the secret. */
  public boolean isAuthorized(String authHeader) {
    if (
      authHeader == null || webhookSecret == null || webhookSecret.isEmpty()
    ) {
      return false;
    }
    return MessageDigest.isEqual(
      authHeader.getBytes(StandardCharsets.UTF_8),
      webhookSecret.getBytes(StandardCharsets.UTF_8)
    );
  }

  @Transactional
  public void process(JsonNode body) {
    JsonNode event = body.path("event");
    if (event.isMissingNode()) {
      log.warn("RevenueCat webhook with no event node");
      return;
    }

    String type = event.path("type").asText("");
    if ("TEST".equals(type)) {
      log.info("RevenueCat TEST event received");
      return;
    }

    if ("TRANSFER".equals(type)) {
      handleTransfer(event);
      return;
    }

    String appUserId = event.path("app_user_id").asText(null);
    if (appUserId == null) {
      log.warn("RevenueCat event {} missing app_user_id", type);
      return;
    }

    UUID userId;
    try {
      userId = UUID.fromString(appUserId);
    } catch (IllegalArgumentException ex) {
      // Anonymous RC id ($RCAnonymousID:...) — a pre-login purchase. Ignore;
      // it reconciles when the SDK aliases to the real userId on logIn.
      log.warn("RevenueCat app_user_id is not a UUID: {}", appUserId);
      return;
    }

    AppUser user = appUserRepository.findById(userId).orElse(null);
    if (user == null) {
      log.warn("RevenueCat event {} for unknown user {}", type, userId);
      return;
    }

    boolean grant = GRANT_EVENTS.contains(type);
    boolean revoke = REVOKE_EVENTS.contains(type);
    if (!grant && !revoke) {
      // Events we don't act on (CANCELLATION, BILLING_ISSUE, TRANSFER, etc.).
      log.info("RevenueCat {} ignored for user {}", type, userId);
      return;
    }

    Tier newTier = mapEntitlementsToTier(event);
    LocalDateTime expiresAt = parseExpiry(event);

    if (grant && newTier != Tier.BASIC) {
      user.setTier(newTier);
      user.setTierExpiresAt(expiresAt);
      user.setTierProductId(event.path("product_id").asText(null));
      user.setTierStore(event.path("store").asText(null));
    } else {
      // EXPIRATION, or a grant event that no longer carries a paid entitlement.
      user.setTier(Tier.BASIC);
      user.setTierExpiresAt(expiresAt); // keep last-known expiry for audit
    }

    appUserRepository.save(user);
    log.info("RevenueCat {} -> user {} tier {}", type, userId, user.getTier());
  }

  /**
   * A TRANSFER moves a subscription from one app_user_id to another (same Apple
   * ID reused by a second account, family sharing, etc.). The event carries no
   * entitlement or expiry payload, so we cannot derive the recipient's new tier
   * here; that reconciles on the recipient's next RENEWAL, and the client
   * entitlement gates their UI immediately. What we must do is revoke access from
   * each sender: the subscription no longer belongs to them and they will never
   * receive an EXPIRATION for it, so without this they keep their paid tier
   * indefinitely.
   */
  private void handleTransfer(JsonNode event) {
    JsonNode from = event.path("transferred_from");
    if (!from.isArray()) {
      log.info(
        "RevenueCat TRANSFER with no transferred_from; nothing to revoke"
      );
      return;
    }
    for (JsonNode node : from) {
      UUID senderId;
      try {
        senderId = UUID.fromString(node.asText(""));
      } catch (IllegalArgumentException ex) {
        // Anonymous sender ($RCAnonymousID:...) never had a row; skip it.
        continue;
      }
      appUserRepository
        .findById(senderId)
        .ifPresent(u -> {
          if (u.getTier() != Tier.BASIC) {
            u.setTier(Tier.BASIC);
            appUserRepository.save(u);
            log.info(
              "RevenueCat TRANSFER: revoked tier from sender {}",
              senderId
            );
          }
        });
    }
  }

  /**
   * Any paid entitlement grants PLUS. "ultra" is a legacy alias: the tier was
   * never sold, but a promotional grant on that entitlement must keep access.
   */
  private Tier mapEntitlementsToTier(JsonNode event) {
    JsonNode ids = event.path("entitlement_ids");
    if (ids.isArray()) {
      for (JsonNode id : ids) {
        String e = id.asText();
        if ("plus".equals(e) || "ultra".equals(e)) {
          return Tier.PLUS;
        }
      }
    }
    return Tier.BASIC;
  }

  private LocalDateTime parseExpiry(JsonNode event) {
    long ms = event.path("expiration_at_ms").asLong(0);
    if (ms <= 0) {
      return null;
    }
    return LocalDateTime.ofInstant(Instant.ofEpochMilli(ms), ZoneOffset.UTC);
  }
}
