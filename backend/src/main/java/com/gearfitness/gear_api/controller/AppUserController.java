package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.DeleteAccountRequest;
import com.gearfitness.gear_api.dto.ImageUploadUrlRequest;
import com.gearfitness.gear_api.dto.ProfilePictureKeyRequest;
import com.gearfitness.gear_api.dto.UpdateUserProfileRequest;
import com.gearfitness.gear_api.dto.UserDTO;
import com.gearfitness.gear_api.dto.UserProfileDTO;
import com.gearfitness.gear_api.dto.UserSearchResultDTO;
import com.gearfitness.gear_api.dto.UsernameAvailabilityResponse;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.FollowRepository;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.AppUserService;
import com.gearfitness.gear_api.service.FollowService;
import com.gearfitness.gear_api.service.S3StorageService;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class AppUserController {

  private static final Set<String> PROFILE_PICTURE_UPLOAD_TYPES = Set.of(
    "image/jpeg",
    "image/png"
  );

  private final AppUserService userService;
  private final JwtService jwtService;
  private final S3StorageService s3StorageService;
  private final AppUserRepository userRepository;
  private final FollowService followService;

  /**
   * GET /api/users/me
   * Get current authenticated user's profile (basic info)
   */
  @GetMapping("/me")
  public ResponseEntity<UserDTO> getCurrentUserProfile(
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      String token = authHeader.substring(7); // Remove "Bearer " prefix
      UUID userId = jwtService.extractUserId(token);

      UserDTO user = userService.getUserProfile(userId);
      return ResponseEntity.ok(user);
    } catch (Exception e) {
      return ResponseEntity.badRequest().build();
    }
  }

  /**
   * GET /api/users/me/profile
   * Get current authenticated user's enhanced profile with workout stats and social metrics
   */
  @GetMapping("/me/profile")
  public ResponseEntity<UserProfileDTO> getCurrentUserEnhancedProfile(
    @RequestHeader("Authorization") String authHeader,
    @RequestParam(required = false) String localDate
  ) {
    try {
      String token = authHeader.substring(7); // Remove "Bearer " prefix
      UUID userId = jwtService.extractUserId(token);

      UserProfileDTO profile = userService.getEnhancedUserProfile(
        userId,
        userId,
        localDate
      );
      return ResponseEntity.ok(profile);
    } catch (Exception e) {
      return ResponseEntity.badRequest().build();
    }
  }

  /**
   * PUT /api/users/me
   * Update current authenticated user's profile
   */
  @PutMapping("/me")
  public ResponseEntity<?> updateCurrentUserProfile(
    @RequestHeader("Authorization") String authHeader,
    @RequestBody UpdateUserProfileRequest request
  ) {
    try {
      String token = authHeader.substring(7);
      UUID userId = jwtService.extractUserId(token);

      UserDTO updatedUser = userService.updateUserProfile(userId, request);
      return ResponseEntity.ok(updatedUser);
    } catch (RuntimeException e) {
      return ResponseEntity.badRequest().body(e.getMessage());
    } catch (Exception e) {
      return ResponseEntity.internalServerError().body("An error occurred");
    }
  }

  /**
   * GET /api/users/{username}
   * Get enhanced user profile by username
   * Optionally include viewing user's perspective for follow status
   */
  @GetMapping("/{username}")
  public ResponseEntity<?> getUserByUsername(
    @PathVariable String username,
    @RequestHeader(value = "Authorization", required = false) String authHeader,
    @RequestParam(required = false) String localDate
  ) {
    try {
      UUID viewingUserId = null;

      // Extract viewing user ID if authenticated
      if (authHeader != null && authHeader.startsWith("Bearer ")) {
        try {
          String token = authHeader.substring(7);
          viewingUserId = jwtService.extractUserId(token);
        } catch (Exception e) {
          // Ignore token errors, just treat as unauthenticated
        }
      }

      UserProfileDTO profile = userService.getEnhancedUserProfileByUsername(
        username,
        viewingUserId,
        localDate
      );

      boolean isOwnProfile =
        viewingUserId != null && viewingUserId.equals(profile.getUserId());

      // Block in either direction → 404 (as if the profile doesn't exist)
      if (
        !isOwnProfile &&
        viewingUserId != null &&
        followService.isBlocked(viewingUserId, profile.getUserId())
      ) {
        return ResponseEntity.notFound().build();
      }

      // Private account: redact everything except the minimal header fields
      if (
        !isOwnProfile &&
        Boolean.TRUE.equals(profile.getIsPrivate()) &&
        !"ACCEPTED".equals(profile.getFollowStatus())
      ) {
        UserProfileDTO redacted = UserProfileDTO.builder()
          .userId(profile.getUserId())
          .username(profile.getUsername())
          .displayName(profile.getDisplayName())
          .profilePictureUrl(profile.getProfilePictureUrl())
          .isPrivate(true)
          .isFollowing(false)
          .followStatus(profile.getFollowStatus())
          .followersCount(null)
          .followingCount(null)
          .build();
        return ResponseEntity.ok(redacted);
      }

      return ResponseEntity.ok(profile);
    } catch (RuntimeException e) {
      return ResponseEntity.notFound().build();
    }
  }

  /**
   * PATCH /api/users/me/privacy
   * Toggle user privacy setting
   */
  @PatchMapping("/me/privacy")
  public ResponseEntity<?> updatePrivacySetting(
    @RequestHeader("Authorization") String authHeader,
    @RequestBody UpdateUserProfileRequest request
  ) {
    try {
      String token = authHeader.substring(7);
      UUID userId = jwtService.extractUserId(token);

      // Only update privacy setting
      UpdateUserProfileRequest privacyRequest =
        UpdateUserProfileRequest.builder()
          .isPrivate(request.getIsPrivate())
          .build();

      UserDTO updatedUser = userService.updateUserProfile(
        userId,
        privacyRequest
      );
      return ResponseEntity.ok(updatedUser);
    } catch (Exception e) {
      return ResponseEntity.badRequest().body(e.getMessage());
    }
  }

  @GetMapping("/search")
  public ResponseEntity<List<UserSearchResultDTO>> searchUsers(
    @RequestParam String q,
    @RequestHeader("Authorization") String authHeader
  ) {
    if (q == null || q.trim().isEmpty()) {
      return ResponseEntity.ok(List.of());
    }
    try {
      String token = authHeader.substring(7);
      UUID currentUserId = jwtService.extractUserId(token);
      return ResponseEntity.ok(
        userService.searchUsers(q.trim(), currentUserId)
      );
    } catch (Exception e) {
      return ResponseEntity.badRequest().build();
    }
  }

  @GetMapping("/username-availability")
  public ResponseEntity<UsernameAvailabilityResponse> checkUsernameAvailability(
    @RequestParam String username
  ) {
    return ResponseEntity.ok(userService.getUsernameAvailability(username));
  }

  /**
   * POST /api/users/me/profile-picture/upload-url
   * Returns a deterministic key and a presigned PUT url so the client uploads
   * the image directly to S3 (mirrors the post-image flow). Preferred over the
   * multipart endpoint below: the bytes never traverse the backend, so a WAF or
   * proxy can't 403 the multipart body. After PUTting to S3, the client calls
   * PUT /me/profile-picture to persist the key on its profile.
   */
  @PostMapping("/me/profile-picture/upload-url")
  public ResponseEntity<?> createProfilePictureUploadUrl(
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
    if (
      contentType == null || !PROFILE_PICTURE_UPLOAD_TYPES.contains(contentType)
    ) {
      return ResponseEntity.badRequest().body(
        "Only JPEG and PNG images are allowed"
      );
    }

    S3StorageService.PresignedUpload upload =
      s3StorageService.generateProfilePictureUploadUrl(userId, contentType);

    return ResponseEntity.ok(
      Map.of("key", upload.key(), "uploadUrl", upload.url())
    );
  }

  /**
   * PUT /api/users/me/profile-picture
   * Persist a profile-picture key on the caller's profile after a direct-to-S3
   * upload. The key must be the caller's own deterministic profile key, so a
   * user can't point their avatar at someone else's object.
   */
  @PutMapping("/me/profile-picture")
  public ResponseEntity<?> setProfilePicture(
    @RequestHeader("Authorization") String authHeader,
    @RequestBody ProfilePictureKeyRequest request
  ) {
    try {
      UUID userId = jwtService.extractUserId(authHeader.substring(7));

      String expectedKey = s3StorageService.profilePictureKey(userId);
      if (request.key() == null || !expectedKey.equals(request.key())) {
        return ResponseEntity.badRequest().body("Invalid profile picture key");
      }

      AppUser user = userRepository
        .findById(userId)
        .orElseThrow(() -> new RuntimeException("User not found"));
      user.setProfilePictureUrl(expectedKey);
      userRepository.save(user);

      UserDTO updatedUser = userService.getUserProfile(userId);
      return ResponseEntity.ok(updatedUser);
    } catch (Exception e) {
      System.err.println("Set profile picture error: " + e.getMessage());
      return ResponseEntity.badRequest().body("Failed to set profile picture");
    }
  }

  /**
   * POST /api/users/me/profile-picture
   * LEGACY proxy/multipart upload (JPEG or PNG, max 5MB). Kept for already-
   * installed app clients; new clients use the presigned-PUT flow above
   * (/me/profile-picture/upload-url + PUT /me/profile-picture).
   */
  @PostMapping(
    value = "/me/profile-picture",
    consumes = MediaType.MULTIPART_FORM_DATA_VALUE
  )
  public ResponseEntity<?> uploadProfilePicture(
    @RequestHeader("Authorization") String authHeader,
    @RequestParam("file") MultipartFile file
  ) {
    try {
      String token = authHeader.substring(7);
      UUID userId = jwtService.extractUserId(token);

      // Validate content type
      String contentType = file.getContentType();
      Set<String> allowedTypes = Set.of("image/jpeg", "image/png");
      if (contentType == null || !allowedTypes.contains(contentType)) {
        return ResponseEntity.badRequest().body(
          "Only JPEG and PNG images are allowed"
        );
      }

      // Validate file size (5MB)
      if (file.getSize() > 5 * 1024 * 1024) {
        return ResponseEntity.badRequest().body(
          "File size must not exceed 5MB"
        );
      }

      String key = s3StorageService.uploadProfilePicture(
        userId,
        file.getBytes(),
        contentType
      );

      AppUser user = userRepository
        .findById(userId)
        .orElseThrow(() -> new RuntimeException("User not found"));
      user.setProfilePictureUrl(key);
      userRepository.save(user);

      UserDTO updatedUser = userService.getUserProfile(userId);
      return ResponseEntity.ok(updatedUser);
    } catch (RuntimeException e) {
      System.err.println("Profile picture upload error: " + e.getMessage());
      e.printStackTrace();
      return ResponseEntity.badRequest().body(e.getMessage());
    } catch (Exception e) {
      System.err.println("Profile picture upload error: " + e.getMessage());
      e.printStackTrace();
      return ResponseEntity.internalServerError().body(
        "Failed to upload profile picture"
      );
    }
  }

  /**
   * DELETE /api/users/me/profile-picture
   * Remove the current user's profile picture
   */
  @DeleteMapping("/me/profile-picture")
  public ResponseEntity<?> deleteProfilePicture(
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      String token = authHeader.substring(7);
      UUID userId = jwtService.extractUserId(token);

      s3StorageService.deleteProfilePicture(userId);

      AppUser user = userRepository
        .findById(userId)
        .orElseThrow(() -> new RuntimeException("User not found"));
      user.setProfilePictureUrl(null);
      userRepository.save(user);

      UserDTO updatedUser = userService.getUserProfile(userId);
      return ResponseEntity.ok(updatedUser);
    } catch (Exception e) {
      return ResponseEntity.badRequest().body(e.getMessage());
    }
  }

  @DeleteMapping("/me")
  public ResponseEntity<?> deleteCurrentUser(
    @RequestHeader("Authorization") String authHeader,
    @RequestBody DeleteAccountRequest request
  ) {
    try {
      String token = authHeader.substring(7);
      UUID userId = jwtService.extractUserId(token);
      userService.softDeleteAccount(userId, request.getUsernameConfirmation());
      return ResponseEntity.noContent().build();
    } catch (RuntimeException e) {
      return ResponseEntity.badRequest().body(e.getMessage());
    } catch (Exception e) {
      return ResponseEntity.internalServerError().body(
        "Failed to delete account"
      );
    }
  }
}
