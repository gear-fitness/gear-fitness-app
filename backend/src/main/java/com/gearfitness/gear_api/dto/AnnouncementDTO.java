package com.gearfitness.gear_api.dto;

import java.util.UUID;

/**
 * A pending "What's New" announcement for the requesting user. features and
 * ctaParams are passed through as raw JSON strings; the app parses them
 * defensively and skips the popup entirely if either is malformed.
 */
public record AnnouncementDTO(
  UUID announcementId,
  String title,
  String body,
  String icon,
  String features,
  String ctaLabel,
  String ctaRoute,
  String ctaParams
) {}
