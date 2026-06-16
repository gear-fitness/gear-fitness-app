package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.entity.Follow;
import com.gearfitness.gear_api.entity.Post;
import com.gearfitness.gear_api.repository.FollowRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Central authority for "can this viewer see this post?" used by single-resource
 * endpoints (getPost, like, comment). Mirrors the visibility rules already
 * encoded in the list queries in PostRepository.findPostsByUser:
 *   - a non-VISIBLE moderation_status hides the post from everyone, owner included
 *   - owner always sees their own post
 *   - a block in either direction hides everything
 *   - PUBLIC  -> visible to everyone
 *   - FRIENDS -> visible only on a mutual ACCEPTED follow
 *   - PRIVATE -> owner only
 *
 * A null viewer (anonymous request) can only see PUBLIC posts.
 */
@Service
@RequiredArgsConstructor
public class PostVisibilityService {

  private final FollowRepository followRepository;

  /** True if viewerId is allowed to see the post. */
  public boolean canView(Post post, UUID viewerId) {
    // A post hidden or removed by moderation is served to no one, owner included.
    if (
      post.getModerationStatus() != Post.ModerationStatus.VISIBLE
    ) return false;

    UUID authorId = post.getUser().getUserId();

    if (authorId.equals(viewerId)) return true; // owner

    if (
      viewerId != null &&
      followRepository.existsBlockBetween(viewerId, authorId)
    ) return false;

    return switch (post.getVisibility()) {
      case PUBLIC -> true;
      case PRIVATE -> false; // owner-only, already handled above
      case FRIENDS -> viewerId != null &&
      isMutualAcceptedFollow(viewerId, authorId);
    };
  }

  /** Throws 404 NOT_FOUND when not viewable so denial does not leak existence. */
  public void assertCanView(Post post, UUID viewerId) {
    if (!canView(post, viewerId)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found");
    }
  }

  private boolean isMutualAcceptedFollow(UUID viewerId, UUID authorId) {
    return (
      followRepository.existsByFollower_UserIdAndFollowee_UserIdAndStatus(
        viewerId,
        authorId,
        Follow.FollowStatus.ACCEPTED
      ) &&
      followRepository.existsByFollower_UserIdAndFollowee_UserIdAndStatus(
        authorId,
        viewerId,
        Follow.FollowStatus.ACCEPTED
      )
    );
  }
}
