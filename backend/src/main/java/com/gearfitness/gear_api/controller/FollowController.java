package com.gearfitness.gear_api.controller;

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
    public ResponseEntity<?> followUser(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID userId) {
        try {
            String token = authHeader.substring(7); // Remove "Bearer " prefix
            UUID followerId = jwtService.extractUserId(token);

            followService.followUser(followerId, userId);
            return ResponseEntity.ok().body("Successfully followed user");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("An error occurred");
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
            List<FollowService.FollowerDTO> followers = followService.getFollowers(userId);
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
            List<FollowService.FollowerDTO> following = followService.getFollowing(userId);
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

    /**
     * Response DTO for follow status
     */
    private static class FollowStatusResponse {
        public boolean isFollowing;

        public FollowStatusResponse(boolean isFollowing) {
            this.isFollowing = isFollowing;
        }
    }
}
