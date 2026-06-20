package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.CommentReport;
import com.gearfitness.gear_api.entity.PostComment;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.CommentReportRepository;
import com.gearfitness.gear_api.repository.PostCommentRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional
public class CommentReportService {

  /**
   * Once this many distinct users have a pending report against a comment, the
   * comment is automatically hidden. Hiding is the only automated action here.
   */
  static final int AUTO_HIDE_THRESHOLD = 3;

  private final CommentReportRepository commentReportRepository;
  private final PostCommentRepository postCommentRepository;
  private final AppUserRepository appUserRepository;

  public void createReport(
    UUID reporterId,
    UUID commentId,
    String reasonValue,
    String note
  ) {
    if (commentId == null) {
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "commentId is required"
      );
    }

    CommentReport.Reason reason;
    try {
      reason = CommentReport.Reason.valueOf(
        reasonValue == null ? "" : reasonValue.trim().toUpperCase()
      );
    } catch (IllegalArgumentException e) {
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "Invalid reason"
      );
    }

    // Fetch including hidden so a report still records against a comment that
    // has already been auto-hidden (keeps the moderation audit trail complete).
    PostComment comment = postCommentRepository
      .findByIdIncludingHidden(commentId)
      .orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found")
      );

    if (comment.getUser().getUserId().equals(reporterId)) {
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "You cannot report your own comment"
      );
    }

    if (
      commentReportRepository.existsByReporter_UserIdAndComment_CommentId(
        reporterId,
        commentId
      )
    ) {
      throw new ResponseStatusException(
        HttpStatus.CONFLICT,
        "You've already reported this comment"
      );
    }

    AppUser reporter = appUserRepository
      .findById(reporterId)
      .orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
      );

    CommentReport report = CommentReport.builder()
      .comment(comment)
      .reporter(reporter)
      .reason(reason)
      .note(note)
      .build();

    try {
      commentReportRepository.saveAndFlush(report);
    } catch (DataIntegrityViolationException e) {
      // Unique (reporter_id, comment_id) tripped by a concurrent duplicate
      throw new ResponseStatusException(
        HttpStatus.CONFLICT,
        "You've already reported this comment"
      );
    }

    long distinctReporters =
      commentReportRepository.countDistinctPendingReporters(commentId);
    if (
      distinctReporters >= AUTO_HIDE_THRESHOLD &&
      comment.getModerationStatus() == PostComment.ModerationStatus.VISIBLE
    ) {
      comment.setModerationStatus(PostComment.ModerationStatus.HIDDEN);
      postCommentRepository.save(comment);

      // Cascade: hiding a top-level comment hides its visible replies too, so
      // the post comment count stays consistent with what can be displayed.
      if (comment.getParentComment() == null) {
        List<PostComment> replies =
          postCommentRepository.findByParentComment_CommentId(commentId);
        for (PostComment reply : replies) {
          reply.setModerationStatus(PostComment.ModerationStatus.HIDDEN);
        }
        postCommentRepository.saveAll(replies);
      }
    }
  }
}
