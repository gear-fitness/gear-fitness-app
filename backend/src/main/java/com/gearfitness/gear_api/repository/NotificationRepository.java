package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Notification;
import com.gearfitness.gear_api.entity.Post;
import com.gearfitness.gear_api.entity.PostComment;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository
  extends JpaRepository<Notification, UUID>
{
  /**
   * Notifications for a recipient, newest first, excluding any whose actor is
   * blocked relative to the recipient in either direction. A blocked user's
   * account effectively does not exist to them, so their activity is hidden.
   */
  @Query(
    """
    SELECT n FROM Notification n
    WHERE n.recipient.userId = :userId
    AND NOT EXISTS (
        SELECT b FROM Follow b WHERE
        (b.follower.userId = :userId AND b.followee.userId = n.actor.userId AND b.status = 'BLOCKED')
        OR (b.follower.userId = n.actor.userId AND b.followee.userId = :userId AND b.status = 'BLOCKED')
    )
    ORDER BY n.createdAt DESC
    """
  )
  List<Notification> findVisibleByRecipient(@Param("userId") UUID userId);

  /**
   * Count of unread notifications for a recipient, excluding any whose actor is
   * blocked relative to the recipient in either direction, so the unread badge
   * matches what {@link #findVisibleByRecipient} actually shows.
   */
  @Query(
    """
    SELECT COUNT(n) FROM Notification n
    WHERE n.recipient.userId = :userId
    AND n.isRead = false
    AND NOT EXISTS (
        SELECT b FROM Follow b WHERE
        (b.follower.userId = :userId AND b.followee.userId = n.actor.userId AND b.status = 'BLOCKED')
        OR (b.follower.userId = n.actor.userId AND b.followee.userId = :userId AND b.status = 'BLOCKED')
    )
    """
  )
  long countUnreadVisibleByRecipient(@Param("userId") UUID userId);

  void deleteAllByPost(Post post);

  void deleteAllByCommentIn(Collection<PostComment> comments);

  /**
   * Delete notifications of a given type sent by a specific actor to a specific
   * recipient. Used to clear a follow request when it is declined, rescinded, or
   * superseded by an accepted-follow notification.
   */
  void deleteByRecipientAndActorAndType(
    AppUser recipient,
    AppUser actor,
    Notification.NotificationType type
  );
}
