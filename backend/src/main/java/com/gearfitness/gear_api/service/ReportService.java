package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Post;
import com.gearfitness.gear_api.entity.Report;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.PostRepository;
import com.gearfitness.gear_api.repository.ReportRepository;
import jakarta.transaction.Transactional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional
public class ReportService {

  /**
   * Once this many distinct users have a pending report against a post, the
   * post is automatically hidden. Hiding is the only automated action here.
   */
  static final int AUTO_HIDE_THRESHOLD = 3;

  private final ReportRepository reportRepository;
  private final PostRepository postRepository;
  private final AppUserRepository appUserRepository;
  private final PostModerationService postModerationService;

  public void createReport(
    UUID reporterId,
    UUID postId,
    String reasonValue,
    String note
  ) {
    if (postId == null) {
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "postId is required"
      );
    }

    Report.Reason reason;
    try {
      reason = Report.Reason.valueOf(
        reasonValue == null ? "" : reasonValue.trim().toUpperCase()
      );
    } catch (IllegalArgumentException e) {
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "Invalid reason"
      );
    }

    Post post = postRepository
      .findById(postId)
      .orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found")
      );

    if (post.getUser().getUserId().equals(reporterId)) {
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "You cannot report your own post"
      );
    }

    if (
      reportRepository.existsByReporter_UserIdAndPost_PostId(reporterId, postId)
    ) {
      throw new ResponseStatusException(
        HttpStatus.CONFLICT,
        "You've already reported this post"
      );
    }

    AppUser reporter = appUserRepository
      .findById(reporterId)
      .orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
      );

    Report report = Report.builder()
      .post(post)
      .reporter(reporter)
      .reason(reason)
      .note(note)
      .build();

    try {
      reportRepository.saveAndFlush(report);
    } catch (DataIntegrityViolationException e) {
      // Unique (reporter_id, post_id) tripped by a concurrent duplicate report
      throw new ResponseStatusException(
        HttpStatus.CONFLICT,
        "You've already reported this post"
      );
    }

    long distinctReporters = reportRepository.countDistinctPendingReporters(
      postId
    );
    if (
      distinctReporters >= AUTO_HIDE_THRESHOLD &&
      post.getModerationStatus() == Post.ModerationStatus.VISIBLE
    ) {
      postModerationService.hide(post);
    }
  }
}
