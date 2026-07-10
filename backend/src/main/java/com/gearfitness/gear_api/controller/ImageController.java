package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.ImageUploadUrlRequest;
import com.gearfitness.gear_api.dto.ImageViewUrlsRequest;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.S3StorageService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Mints short-lived presigned S3 urls. Every image in the app — profile pics
 * and post/workout photos — is stored as a key and viewed through here. These
 * routes are NOT in permitAll(), so the JWT filter authenticates every call.
 */
@RestController
@RequestMapping("/api/images")
@RequiredArgsConstructor
public class ImageController {

  private static final Set<String> ALLOWED_UPLOAD_TYPES = Set.of(
    "image/jpeg",
    "image/png"
  );
  private static final int MAX_BATCH_KEYS = 100;

  private final S3StorageService s3StorageService;
  private final JwtService jwtService;

  /**
   * POST /api/images/upload-url
   * Returns a server-generated key and a presigned PUT url for a new post image.
   * The client must PUT with the same Content-Type it sends here.
   */
  @PostMapping("/upload-url")
  public ResponseEntity<?> createUploadUrl(
    @RequestHeader("Authorization") String authHeader,
    @RequestBody ImageUploadUrlRequest request
  ) {
    UUID userId;
    try {
      userId = jwtService.extractUserId(authHeader.substring(7));
    } catch (Exception e) {
      return ResponseEntity.status(401).build();
    }

    String contentType = request.contentType();
    if (contentType == null || !ALLOWED_UPLOAD_TYPES.contains(contentType)) {
      return ResponseEntity.badRequest().body(
        "Only image/jpeg and image/png uploads are allowed"
      );
    }

    S3StorageService.PresignedUpload upload =
      s3StorageService.generatePostImageUploadUrl(userId, contentType);

    return ResponseEntity.ok(
      Map.of("key", upload.key(), "uploadUrl", upload.url())
    );
  }

  /**
   * POST /api/images/food-upload-url
   * Presigned PUT url for an ephemeral AI meal photo. The client PUTs the
   * compressed JPEG straight to S3 (bypassing the WAF that 403s a base64 body),
   * then submits only the returned key to the estimate endpoint, which analyzes
   * and deletes the object. PLUS tier is enforced there, not here.
   */
  @PostMapping("/food-upload-url")
  public ResponseEntity<?> createFoodUploadUrl(
    @RequestHeader("Authorization") String authHeader,
    @RequestBody ImageUploadUrlRequest request
  ) {
    UUID userId;
    try {
      userId = jwtService.extractUserId(authHeader.substring(7));
    } catch (Exception e) {
      return ResponseEntity.status(401).build();
    }

    String contentType = request.contentType();
    if (contentType == null || !ALLOWED_UPLOAD_TYPES.contains(contentType)) {
      return ResponseEntity.badRequest().body(
        "Only image/jpeg and image/png uploads are allowed"
      );
    }

    S3StorageService.PresignedUpload upload =
      s3StorageService.generateAiFoodUploadUrl(userId, contentType);

    return ResponseEntity.ok(
      Map.of("key", upload.key(), "uploadUrl", upload.url())
    );
  }

  /**
   * GET /api/images/view-url?key=...
   * Returns a presigned GET url for a single stored key.
   */
  @GetMapping("/view-url")
  public ResponseEntity<?> getViewUrl(
    @RequestHeader("Authorization") String authHeader,
    @RequestParam String key
  ) {
    try {
      jwtService.extractUserId(authHeader.substring(7));
    } catch (Exception e) {
      return ResponseEntity.status(401).build();
    }

    try {
      String url = s3StorageService.generateViewUrl(key);
      return ResponseEntity.ok(
        Map.of(
          "key",
          key,
          "url",
          url,
          "expiresInSeconds",
          S3StorageService.VIEW_URL_TTL.getSeconds()
        )
      );
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().body(e.getMessage());
    }
  }

  /**
   * POST /api/images/view-urls
   * Batch variant: resolves many keys to presigned GET urls in one round trip
   * (feeds render an avatar + photos per post). Keys that fail validation are
   * skipped rather than failing the whole batch.
   */
  @PostMapping("/view-urls")
  public ResponseEntity<?> getViewUrls(
    @RequestHeader("Authorization") String authHeader,
    @RequestBody ImageViewUrlsRequest request
  ) {
    try {
      jwtService.extractUserId(authHeader.substring(7));
    } catch (Exception e) {
      return ResponseEntity.status(401).build();
    }

    List<String> keys = request.keys();
    if (keys == null || keys.isEmpty()) {
      return ResponseEntity.ok(
        Map.of(
          "urls",
          Map.of(),
          "expiresInSeconds",
          S3StorageService.VIEW_URL_TTL.getSeconds()
        )
      );
    }
    if (keys.size() > MAX_BATCH_KEYS) {
      return ResponseEntity.badRequest().body(
        "Too many keys (max " + MAX_BATCH_KEYS + ")"
      );
    }

    Map<String, String> urls = new LinkedHashMap<>();
    for (String key : keys) {
      if (key == null || urls.containsKey(key)) {
        continue;
      }
      try {
        urls.put(key, s3StorageService.generateViewUrl(key));
      } catch (IllegalArgumentException ignored) {
        // Skip unrecognized keys; client renders a placeholder.
      }
    }

    return ResponseEntity.ok(
      Map.of(
        "urls",
        urls,
        "expiresInSeconds",
        S3StorageService.VIEW_URL_TTL.getSeconds()
      )
    );
  }
}
