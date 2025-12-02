package com.gearfitness.gear_api.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedResponse {
    private List<FeedPostDTO> posts;
    private PaginationMetadata pagination;
}
