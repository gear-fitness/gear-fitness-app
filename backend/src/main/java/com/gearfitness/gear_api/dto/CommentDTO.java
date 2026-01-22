package com.gearfitness.gear_api.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentDTO {
    private UUID commentId;
    private UUID postId;
    private UUID userId;
    private String username;
    private String body;
    private LocalDateTime createdAt;
}