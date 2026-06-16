package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.FollowResponse;
import com.gearfitness.gear_api.dto.FollowStatusResponse;
import com.gearfitness.gear_api.dto.FollowerDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.FollowService;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    @PathVariable UUID userId
  ) {
    try {
      String token = authHeader.substring(7);
      UUID followerId = jwtService.extractUserId(token);

      FollowResponse response = followService.followUser(followerId, userId);

      return ResponseEntity.ok(response);
    } catch (RuntimeException e) {
      return ResponseEntity.badRequest().body(
        FollowResponse.builder().message(e.getMessage()).build()
      );
    } catch (Exception e) {
      return ResponseEntity.internalServerError().body("An error occurred");
    }
  }

  /**
   * POST /api/follows/username/{username}
   * Follow a user by their username
   */
  @PostMapping("/username/{username}")
  public ResponseEntity<?> followUserByUsername(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable String username
  ) {
    try {
      String token = authHeader.substring(7);
      UUID followerId = jwtService.extractUserId(token);

      FollowResponse response = followService.followUserByUsername(
        followerId,
        username
      );

      return ResponseEntity.ok(response);
    } catch (RuntimeException e) {
      return ResponseEntity.badRequest().body(
        FollowResponse.builder().message(e.getMessage()).build()
      );
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
    @PathVariable UUID userId
  ) {
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
   * Includes isFollowing flag relative to the current authenticated user
   */
  @GetMapping("/{userId}/followers")
  public ResponseEntity<?> getFollowers(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID userId
  ) {
    try {
      String token = authHeader.substring(7);
      UUID currentUserId = jwtService.extractUserId(token);

      List<FollowerDTO> followers = followService.getFollowers(
        userId,
        currentUserId
      );
      return ResponseEntity.ok(followers);
    } catch (RuntimeException e) {
      return ResponseEntity.badRequest().body(e.getMessage());
    }
  }

  /**
   * GET /api/follows/{userId}/following
   * Get list of users that the specified user is following
   * Includes isFollowing flag relative to the current authenticated user
   */
  @GetMapping("/{userId}/following")
  public ResponseEntity<?> getFollowing(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID userId
  ) {
    try {
      String token = authHeader.substring(7);
      UUID currentUserId = jwtService.extractUserId(token);

      List<FollowerDTO> following = followService.getFollowing(
        userId,
        currentUserId
      );
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
    @PathVariable UUID userId
  ) {
    try {
      String token = authHeader.substring(7);
      UUID followerId = jwtService.extractUserId(token);

      boolean isFollowing = followService.isFollowing(followerId, userId);

      return ResponseEntity.ok(new FollowStatusResponse(isFollowing));
    } catch (Exception e) {
      return ResponseEntity.badRequest().build();
    }
  }

  /**
   * GET /api/follows/requests
   * Get pending follow requests for current user
   */
  @GetMapping("/requests")
  public ResponseEntity<?> getPendingRequests(
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      String token = authHeader.substring(7);
      UUID userId = jwtService.extractUserId(token);

      return ResponseEntity.ok(followService.getPendingRequests(userId));
    } catch (Exception e) {
      return ResponseEntity.internalServerError().body(
        "Failed to fetch follow requests"
      );
    }
  }

  /**
   * POST /api/follows/requests/{followerId}/accept
   * Accept a follow request
   */
  @PostMapping("/requests/{followerId}/accept")
  public ResponseEntity<?> acceptFollowRequest(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID followerId
  ) {
    try {
      String token = authHeader.substring(7);
      UUID followeeId = jwtService.extractUserId(token);

      followService.acceptFollowRequest(followeeId, followerId);
      return ResponseEntity.ok().build();
    } catch (Exception e) {
      return ResponseEntity.internalServerError().body(
        "Failed to accept follow request"
      );
    }
  }

  /**
   * DELETE /api/follows/requests/{followerId}
   * Decline a follow request
   */
  @DeleteMapping("/requests/{followerId}")
  public ResponseEntity<?> declineFollowRequest(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID followerId
  ) {
    try {
      String token = authHeader.substring(7);
      UUID followeeId = jwtService.extractUserId(token);

      followService.declineFollowRequest(followeeId, followerId);
      return ResponseEntity.ok().build();
    } catch (Exception e) {
      return ResponseEntity.internalServerError().body(
        "Failed to decline follow request"
      );
    }
  }

  /**
   * POST /api/follows/block/{userId}
   * Block a user
   */
  @PostMapping("/block/{userId}")
  public ResponseEntity<?> blockUser(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID userId
  ) {
    try {
      String token = authHeader.substring(7);
      UUID blockerId = jwtService.extractUserId(token);
      followService.blockUser(blockerId, userId);
      return ResponseEntity.ok().build();
    } catch (RuntimeException e) {
      return ResponseEntity.badRequest().body(e.getMessage());
    }
  }

  /**
   * DELETE /api/follows/block/{userId}
   * Unblock a user
   */
  @DeleteMapping("/block/{userId}")
  public ResponseEntity<?> unblockUser(
    @RequestHeader("Authorization") String authHeader,
    @PathVariable UUID userId
  ) {
    try {
      String token = authHeader.substring(7);
      UUID blockerId = jwtService.extractUserId(token);
      followService.unblockUser(blockerId, userId);
      return ResponseEntity.ok().build();
    } catch (RuntimeException e) {
      return ResponseEntity.badRequest().body(e.getMessage());
    }
  }

  /**
   * GET /api/follows/blocked
   * Get list of users blocked by current user
   */
  @GetMapping("/blocked")
  public ResponseEntity<?> getBlockedUsers(
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      String token = authHeader.substring(7);
      UUID userId = jwtService.extractUserId(token);
      List<AppUser> blocked = followService.getBlockedUsers(userId);
      List<FollowerDTO> result = blocked
        .stream()
        .map(u ->
          new FollowerDTO(
            u.getUserId(),
            u.getUsername(),
            u.getDisplayName(),
            u.getProfilePictureUrl()
          )
        )
        .collect(Collectors.toList());
      return ResponseEntity.ok(result);
    } catch (RuntimeException e) {
      return ResponseEntity.badRequest().body(e.getMessage());
    }
  }

  /**
   * GET /api/follows/activity
   * Get recent follow activity for current user
   */
  @GetMapping("/activity")
  public ResponseEntity<?> getFollowActivity(
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      String token = authHeader.substring(7);
      UUID userId = jwtService.extractUserId(token);

      return ResponseEntity.ok(followService.getFollowActivity(userId));
    } catch (Exception e) {
      return ResponseEntity.internalServerError().body(
        "Failed to fetch follow activity"
      );
    }
  }
}
