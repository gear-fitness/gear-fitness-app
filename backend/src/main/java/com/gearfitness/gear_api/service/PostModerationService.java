package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.entity.Post;
import com.gearfitness.gear_api.repository.PostRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The single place a post's moderation visibility is changed. Hiding flips
 * post.moderation_status to HIDDEN, which the @SQLRestriction on the Post entity
 * then uses to exclude the post from every feed/profile/lookup query. Both the
 * user-report auto-hide and Rekognition image moderation route through here so
 * there is exactly one hide mechanism.
 */
@Service
@RequiredArgsConstructor
public class PostModerationService {

  private final PostRepository postRepository;

  /** Hide a post that is currently loaded and VISIBLE (report + moderation). */
  @Transactional
  public void hide(Post post) {
    post.setModerationStatus(Post.ModerationStatus.HIDDEN);
    postRepository.save(post);
  }

  /**
   * Restore a hidden post to VISIBLE. Native because a HIDDEN post is invisible
   * to entity queries (see PostRepository.updateModerationStatus).
   */
  @Transactional
  public void unhide(UUID postId) {
    postRepository.updateModerationStatus(
      postId,
      Post.ModerationStatus.VISIBLE.name()
    );
  }

  /** Permanently take a post down (reviewer confirms it should stay gone). */
  @Transactional
  public void remove(UUID postId) {
    postRepository.updateModerationStatus(
      postId,
      Post.ModerationStatus.REMOVED.name()
    );
  }
}
