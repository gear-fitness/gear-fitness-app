package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.FollowResponse;
import com.gearfitness.gear_api.dto.FollowStatusResponse;
import com.gearfitness.gear_api.dto.FollowerDTO;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.FollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/follows")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;
    private final JwtService jwtService;

    /**
     * POST /api/follows/{userId}
     * Follow a user
     */
    @PostMapping("/{userId}")
    public ResponseEntity<FollowResponse> followUser(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID userId) {
        String token = authHeader.substring(7); // Remove "Bearer " prefix
        UUID followerId = jwtService.extractUserId(token);

        FollowResponse response = followService.followUser(followerId, userId);
        return ResponseEntity.ok().body(response);

    }

    /**
     * POST /api/follows/username/{username}
     * Follow a user by their username
     */
    @PostMapping("/username/{username}")
    public ResponseEntity<FollowResponse> followUserByUsername(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String username) {
        try {
            String token = authHeader.substring(7);
            UUID followerId = jwtService.extractUserId(token);

            FollowResponse response = followService.followUserByUsername(followerId, username);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(
                    FollowResponse.builder()
                            .message(e.getMessage())
                            .build());
        }
    }

    /**
     * DELETE /api/follows/{userId}
     * Unfollow a user
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<?> unfollowUser(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID userId) {
        try {
            String token = authHeader.substring(7);
            UUID followerId = jwtService.extractUserId(token);

            followService.unfollowUser(followerId, userId);
            return ResponseEntity.ok().body("Successfully unfollowed user");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("An error occurred");
        }
    }

    /**
     * GET /api/follows/{userId}/followers
     * Get list of users following the specified user
     */
    @GetMapping("/{userId}/followers")
    public ResponseEntity<?> getFollowers(@PathVariable UUID userId) {
        try {
            List<FollowerDTO> followers = followService.getFollowers(userId);
            return ResponseEntity.ok(followers);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * GET /api/follows/{userId}/following
     * Get list of users that the specified user is following
     */
    @GetMapping("/{userId}/following")
    public ResponseEntity<?> getFollowing(@PathVariable UUID userId) {
        try {
            List<FollowerDTO> following = followService.getFollowing(userId);
            return ResponseEntity.ok(following);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * GET /api/follows/{userId}/status
     * Check if current user is following the specified user
     */
    @GetMapping("/{userId}/status")
    public ResponseEntity<?> getFollowStatus(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID userId) {
        try {
            String token = authHeader.substring(7);
            UUID followerId = jwtService.extractUserId(token);

            boolean isFollowing = followService.isFollowing(followerId, userId);
            return ResponseEntity.ok().body(new FollowStatusResponse(isFollowing));
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
