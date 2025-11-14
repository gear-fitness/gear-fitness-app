package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.UpdateUserProfileRequest;
import com.gearfitness.gear_api.dto.UserDTO;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.AppUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class AppUserController {

    private final AppUserService userService;
    private final JwtService jwtService;

    /**
     * GET /api/users/me
     * Get current authenticated user's profile
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
     * Get user profile by username (public endpoint)
     */
    @GetMapping("/{username}")
    public ResponseEntity<?> getUserByUsername(@PathVariable String username) {
        try {
            UserDTO user = userService.getUserProfileByUsername(username);
            // TODO: Filter response based on privacy settings
            return ResponseEntity.ok(user);
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
}