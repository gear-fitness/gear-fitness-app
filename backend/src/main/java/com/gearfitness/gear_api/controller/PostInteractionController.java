package com.gearfitness.gear_api.controller;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gearfitness.gear_api.dto.CommentDTO;
import com.gearfitness.gear_api.dto.CreateCommentRequest;
import com.gearfitness.gear_api.dto.LikeResponse;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.PostInteractionService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostInteractionController {

    private final PostInteractionService postInteractionService;
    private final JwtService jwtService;

    @PostMapping("/{postId}/like")
    public ResponseEntity<LikeResponse> toggleLike(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID postId) {
        String token = authHeader.substring(7);
        UUID userId = jwtService.extractUserId(token);
        LikeResponse response = postInteractionService.toggleLike(userId, postId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{postId}/comments")
    public ResponseEntity<Page<CommentDTO>> getComments(
            @PathVariable UUID postId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<CommentDTO> comments = postInteractionService.getComments(postId, page, size);
        return ResponseEntity.ok(comments);
    }

    @PostMapping("/{postId}/comments")
    public ResponseEntity<CommentDTO> addComment(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID postId,
            @RequestBody CreateCommentRequest request) {
        String token = authHeader.substring(7);
        UUID userId = jwtService.extractUserId(token);
        CommentDTO comment = postInteractionService.addComment(userId, postId, request.getBody());
        return ResponseEntity.ok(comment);
    }
}