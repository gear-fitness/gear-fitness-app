package com.gearfitness.gear_api.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gearfitness.gear_api.dto.FollowResponse;
import com.gearfitness.gear_api.dto.FollowUserRequest;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.FollowManagementService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/follow")
@RequiredArgsConstructor
public class FollowController {
    private final FollowManagementService followService;
    private final JwtService jwtService;

    @PostMapping
    public ResponseEntity<FollowResponse> followUser(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody FollowUserRequest request) {
        String token = authHeader.substring(7);
        UUID currentUserId = jwtService.extractUserId(token);
        FollowResponse response = followService.followUser(currentUserId, request.getUsername());

        return ResponseEntity.ok(response);
    }

}
