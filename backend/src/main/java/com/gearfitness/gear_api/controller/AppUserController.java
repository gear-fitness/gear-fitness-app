package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.UpdateUserProfileRequest;
import com.gearfitness.gear_api.dto.UserDTO;
import com.gearfitness.gear_api.dto.UserProfileDTO;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.AppUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class AppUserController {

    private final AppUserService userService;
    private final JwtService jwtService;

    /**
     * GET /api/users/me
     * Get current authenticated user's profile (basic info)
     */
    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUserProfile(@RequestHeader("Authorization") String authHeader) {
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
    public ResponseEntity<UserProfileDTO> getCurrentUserEnhancedProfile(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.substring(7); // Remove "Bearer " prefix
            UUID userId = jwtService.extractUserId(token);

            UserProfileDTO profile = userService.getEnhancedUserProfile(userId, userId);
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
            @RequestBody UpdateUserProfileRequest request) {
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
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
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

            UserProfileDTO profile = userService.getEnhancedUserProfileByUsername(username, viewingUserId);
            // TODO: Filter response based on privacy settings
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
            @RequestBody UpdateUserProfileRequest request) {
        try {
            String token = authHeader.substring(7);
            UUID userId = jwtService.extractUserId(token);
            
            // Only update privacy setting
            UpdateUserProfileRequest privacyRequest = UpdateUserProfileRequest.builder()
                    .isPrivate(request.getIsPrivate())
                    .build();
            
            UserDTO updatedUser = userService.updateUserProfile(userId, privacyRequest);
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
     @GetMapping("/search")
    public ResponseEntity<List<UserDTO>> searchUsers(
        @RequestParam String q
    ) {
    if (q == null || q.trim().isEmpty()) {
        return ResponseEntity.ok(List.of());
    }
    return ResponseEntity.ok(
            userService.searchUsersByUsername(q.trim())
    );
    }
}