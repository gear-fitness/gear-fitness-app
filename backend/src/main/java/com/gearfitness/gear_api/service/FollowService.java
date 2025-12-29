package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.FollowActivityDTO;
import com.gearfitness.gear_api.dto.FollowResponse;
import com.gearfitness.gear_api.dto.FollowerDTO;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Follow;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.FollowRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FollowService {

    private final FollowRepository followRepository;
    private final AppUserRepository userRepository;

    /**
     * Follow a user
     * Creates a follow relationship with ACCEPTED or PENDING status
     */
    @Transactional
    public FollowResponse followUser(UUID followerId, UUID followeeId) {
        if (followerId.equals(followeeId)) {
            throw new RuntimeException("Cannot follow yourself");
        }

        AppUser follower = userRepository.findById(followerId)
                .orElseThrow(() -> new RuntimeException("Follower user not found"));

        AppUser followee = userRepository.findById(followeeId)
                .orElseThrow(() -> new RuntimeException("User to follow not found"));

        Optional<Follow> existing =
                followRepository.findByFollowerAndFollowee(follower, followee);

        if (existing.isPresent()) {
            throw new RuntimeException(
                    "Follow already exists with status: " +
                            existing.get().getStatus()
            );
        }

        Follow.FollowStatus status = followee.getIsPrivate()
                ? Follow.FollowStatus.PENDING
                : Follow.FollowStatus.ACCEPTED;

        Follow follow = Follow.builder()
                .follower(follower)
                .followee(followee)
                .status(status)
                .createdAt(LocalDateTime.now())
                .respondedAt(
                        status == Follow.FollowStatus.ACCEPTED
                                ? LocalDateTime.now()
                                : null
                )
                .build();

        followRepository.save(follow);

        return FollowResponse.builder()
                .followeeId(followee.getUserId())
                .followeeUsername(followee.getUsername())
                .status(status.name().toLowerCase())
                .message(
                        status == Follow.FollowStatus.ACCEPTED
                                ? "Now following " + followee.getUsername()
                                : "Follow request sent to " + followee.getUsername()
                )
                .build();
    }

    /**
     * Follow a user by username
     */
    @Transactional
    public FollowResponse followUserByUsername(UUID followerId, String username) {
        AppUser followee = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        return followUser(followerId, followee.getUserId());
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
     * Check if a user is following another user
     */
    public boolean isFollowing(UUID followerId, UUID followeeId) {
        AppUser follower = userRepository.findById(followerId).orElse(null);
        AppUser followee = userRepository.findById(followeeId).orElse(null);

        if (follower == null || followee == null) {
            return false;
        }

        return followRepository.existsByFollowerAndFolloweeAndStatus(
                follower,
                followee,
                Follow.FollowStatus.ACCEPTED
        );
    }

    /**
     * Get list of followers for a user
     */
    @Transactional(readOnly = true)
    public List<FollowerDTO> getFollowers(UUID userId) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return followRepository
                .findByFolloweeAndStatus(user, Follow.FollowStatus.ACCEPTED)
                .stream()
                .map(f -> new FollowerDTO(
                        f.getFollower().getUserId(),
                        f.getFollower().getUsername()
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

        return followRepository
                .findByFollowerAndStatus(user, Follow.FollowStatus.ACCEPTED)
                .stream()
                .map(f -> new FollowerDTO(
                        f.getFollowee().getUserId(),
                        f.getFollowee().getUsername()
                ))
                .collect(Collectors.toList());
    }

    /**
     * Get pending follow requests for a user
     */
    @Transactional(readOnly = true)
    public List<FollowerDTO> getPendingRequests(UUID userId) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return followRepository
                .findByFolloweeAndStatus(user, Follow.FollowStatus.PENDING)
                .stream()
                .map(f -> new FollowerDTO(
                        f.getFollower().getUserId(),
                        f.getFollower().getUsername()
                ))
                .collect(Collectors.toList());
    }

    /**
     * Accept a follow request
     */
    @Transactional
    public void acceptFollowRequest(UUID followeeId, UUID followerId) {
        AppUser followee = userRepository.findById(followeeId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        AppUser follower = userRepository.findById(followerId)
                .orElseThrow(() -> new RuntimeException("Follower not found"));

        Follow follow = followRepository.findByFollowerAndFollowee(follower, followee)
                .orElseThrow(() -> new RuntimeException("Follow request not found"));

        follow.setStatus(Follow.FollowStatus.ACCEPTED);
        follow.setRespondedAt(LocalDateTime.now());
    }

    /**
     * Decline a follow request
     */
    @Transactional
    public void declineFollowRequest(UUID followeeId, UUID followerId) {
        AppUser followee = userRepository.findById(followeeId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        AppUser follower = userRepository.findById(followerId)
                .orElseThrow(() -> new RuntimeException("Follower not found"));

        Follow follow = followRepository.findByFollowerAndFollowee(follower, followee)
                .orElseThrow(() -> new RuntimeException("Follow request not found"));

        follow.setStatus(Follow.FollowStatus.DECLINED);
        follow.setRespondedAt(LocalDateTime.now());
    }

    /**
     * Get recent follow activity for a user
     */
    @Transactional(readOnly = true)
    public List<FollowActivityDTO> getFollowActivity(UUID userId) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return followRepository
                .findByFolloweeAndStatus(user, Follow.FollowStatus.ACCEPTED)
                .stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(f -> new FollowActivityDTO(
                        f.getFollower().getUserId(),
                        f.getFollower().getUsername(),
                        f.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }
}
