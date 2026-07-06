package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.CreateCommentReportRequest;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.CommentReportService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/comment-reports")
@RequiredArgsConstructor
public class CommentReportController {

  private final CommentReportService commentReportService;
  private final JwtService jwtService;

  @PostMapping
  public ResponseEntity<Void> createReport(
    @RequestHeader("Authorization") String authHeader,
    @RequestBody CreateCommentReportRequest request
  ) {
    String token = authHeader.substring(7);
    UUID reporterId = jwtService.extractUserId(token);
    commentReportService.createReport(
      reporterId,
      request.getCommentId(),
      request.getReason(),
      request.getNote()
    );
    return ResponseEntity.status(HttpStatus.CREATED).build();
  }
}
