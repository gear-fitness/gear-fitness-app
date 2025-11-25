package com.gearfitness.gear_api.service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.gearfitness.gear_api.dto.FollowResponse;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Follow;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.FollowRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class FollowManagementService {
    private final FollowRepository followRepository;
    private final AppUserRepository appUserRepository;

    public FollowResponse followUser(UUID followerId, String username) {
        AppUser followee = appUserRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        if (followerId.equals(followee.getUserId())) {
            throw new RuntimeException("Cannot follow yourself");
        }

        Optional<Follow> existing = followRepository.findByFollowerAndFollowee(followerId, followee.getUserId());

        if (existing.isPresent()) {
            Follow existingFollow = existing.get();
            String statusMsg = switch (existingFollow.getStatus()) {
                case ACCEPTED -> "Already following " + username;
                case PENDING -> "Follow request already sent to " + username;
                case DECLINED -> "Follow request was declined by " + username;
                case BLOCKED -> "Cannot follow " + username;
            };
            throw new RuntimeException(statusMsg);
        }

        AppUser follower = appUserRepository.findById(followerId)
                .orElseThrow(() -> new RuntimeException("Follower not found"));

        Follow.FollowStatus status = followee.getIsPrivate()
                ? Follow.FollowStatus.PENDING
                : Follow.FollowStatus.ACCEPTED;

        Follow follow = Follow.builder()
                .follower(follower)
                .followee(followee)
                .status(status)
                .createdAt(LocalDateTime.now())
                .respondedAt(status == Follow.FollowStatus.ACCEPTED ? LocalDateTime.now() : null)
                .build();

        followRepository.save(follow);

        return FollowResponse.builder()
                .followeeId(followee.getUserId())
                .followeeUsername(followee.getUsername())
                .status(status.name().toLowerCase())
                .message(status == Follow.FollowStatus.ACCEPTED
                        ? "Now following " + username
                        : "Follow request sent to " + username)
                .build();
    }
}
