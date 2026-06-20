package com.gearfitness.gear_api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.gearfitness.gear_api.service.RevenueCatWebhookService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Receives RevenueCat server webhooks. Permitted without JWT in SecurityConfig;
 * authenticity is verified via the static Authorization header configured on the
 * RevenueCat dashboard. Always returns 2xx for understood events so RevenueCat
 * stops retrying; only auth failures return non-2xx.
 */
@RestController
@RequestMapping("/api/webhooks/revenuecat")
@RequiredArgsConstructor
public class RevenueCatWebhookController {

  private final RevenueCatWebhookService webhookService;

  @PostMapping
  public ResponseEntity<Void> handle(
    @RequestHeader(value = "Authorization", required = false) String authHeader,
    @RequestBody JsonNode body
  ) {
    if (!webhookService.isAuthorized(authHeader)) {
      return ResponseEntity.status(401).build();
    }
    webhookService.process(body);
    return ResponseEntity.ok().build();
  }
}
