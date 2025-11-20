package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Follow;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.FollowRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FollowService {

    private final FollowRepository followRepository;
    private final AppUserRepository userRepository;

    /**
     * Follow a user
     * Creates a follow relationship with ACCEPTED status (simplified for now)
     */
    @Transactional
    public void followUser(UUID followerId, UUID followeeId) {
        if (followerId.equals(followeeId)) {
            throw new RuntimeException("Cannot follow yourself");
        }

        AppUser follower = userRepository.findById(followerId)
                .orElseThrow(() -> new RuntimeException("Follower user not found"));

        AppUser followee = userRepository.findById(followeeId)
                .orElseThrow(() -> new RuntimeException("User to follow not found"));

        // Check if already following
        if (followRepository.existsByFollowerAndFolloweeAndStatus(follower, followee, Follow.FollowStatus.ACCEPTED)) {
            throw new RuntimeException("Already following this user");
        }

        // Create follow relationship (auto-accept for now, can add privacy logic later)
        Follow follow = Follow.builder()
                .follower(follower)
                .followee(followee)
                .status(Follow.FollowStatus.ACCEPTED)
                .respondedAt(LocalDateTime.now())
                .build();

        followRepository.save(follow);
    }

    /**
     * Unfollow a user
     */
    @Transactional
    public void unfollowUser(UUID followerId, UUID followeeId) {
        AppUser follower = userRepository.findById(followerId)
                .orElseThrow(() -> new RuntimeException("Follower user not found"));

        AppUser followee = userRepository.findById(followeeId)
                .orElseThrow(() -> new RuntimeException("User to unfollow not found"));

        Follow follow = followRepository.findByFollowerAndFollowee(follower, followee)
                .orElseThrow(() -> new RuntimeException("Not following this user"));

        followRepository.delete(follow);
    }

    /**
     * Check if user is following another user
     */
    public boolean isFollowing(UUID followerId, UUID followeeId) {
        AppUser follower = userRepository.findById(followerId).orElse(null);
        AppUser followee = userRepository.findById(followeeId).orElse(null);

        if (follower == null || followee == null) {
            return false;
        }

        return followRepository.existsByFollowerAndFolloweeAndStatus(
                follower, followee, Follow.FollowStatus.ACCEPTED
        );
    }

    /**
     * Get list of followers for a user
     */
    @Transactional(readOnly = true)
    public List<FollowerDTO> getFollowers(UUID userId) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Follow> follows = followRepository.findByFolloweeAndStatus(user, Follow.FollowStatus.ACCEPTED);

        return follows.stream()
                .map(follow -> new FollowerDTO(
                        follow.getFollower().getUserId(),
                        follow.getFollower().getUsername()
                ))
                .collect(Collectors.toList());
    }

    /**
     * Get list of users that this user is following
     */
    @Transactional(readOnly = true)
    public List<FollowerDTO> getFollowing(UUID userId) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Follow> follows = followRepository.findByFollowerAndStatus(user, Follow.FollowStatus.ACCEPTED);

        return follows.stream()
                .map(follow -> new FollowerDTO(
                        follow.getFollowee().getUserId(),
                        follow.getFollowee().getUsername()
                ))
                .collect(Collectors.toList());
    }

    /**
     * Simple DTO for follower/following list
     */
    public static class FollowerDTO {
        public UUID userId;
        public String username;

        public FollowerDTO(UUID userId, String username) {
            this.userId = userId;
            this.username = username;
        }

        public UUID getUserId() {
            return userId;
        }

        public String getUsername() {
            return username;
        }
    }
}
