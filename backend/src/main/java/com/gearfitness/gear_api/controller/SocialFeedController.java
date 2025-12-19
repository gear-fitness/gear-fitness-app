package com.gearfitness.gear_api.controller;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gearfitness.gear_api.dto.FeedPostDTO;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.SocialFeedService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/feed")
@RequiredArgsConstructor
public class SocialFeedController {
    private final SocialFeedService socialFeedService;
    private final JwtService jwtService;

    @GetMapping
    public ResponseEntity<Page<FeedPostDTO>> getFeed(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String token = authHeader.substring(7);
        UUID currentUserId = jwtService.extractUserId(token);
        Page<FeedPostDTO> feed = socialFeedService.getFeed(currentUserId, page, size);
        return ResponseEntity.ok(feed);
    }

}
