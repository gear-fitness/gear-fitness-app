package com.gearfitness.gear_api.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class ContentVisibilityRepository {

  @PersistenceContext
  private EntityManager em;

  /**
   * Hide all content owned by the user — posts, comments, likes, and follows
   * (in both directions). Uses native SQL bulk updates to avoid loading entities.
   *
   * Must be called within a transaction.
   */
  @Transactional
  public void hideAllContentForUser(UUID userId, LocalDateTime hiddenAt) {
    em
      .createNativeQuery(
        "UPDATE post SET hidden_at = :ts WHERE user_id = :uid AND hidden_at IS NULL"
      )
      .setParameter("ts", hiddenAt)
      .setParameter("uid", userId)
      .executeUpdate();

    em
      .createNativeQuery(
        "UPDATE post_comment SET hidden_at = :ts WHERE user_id = :uid AND hidden_at IS NULL"
      )
      .setParameter("ts", hiddenAt)
      .setParameter("uid", userId)
      .executeUpdate();

    em
      .createNativeQuery(
        "UPDATE post_like SET hidden_at = :ts WHERE user_id = :uid AND hidden_at IS NULL"
      )
      .setParameter("ts", hiddenAt)
      .setParameter("uid", userId)
      .executeUpdate();

    em
      .createNativeQuery(
        "UPDATE follow SET hidden_at = :ts " +
          "WHERE (follower_id = :uid OR followee_id = :uid) AND hidden_at IS NULL"
      )
      .setParameter("ts", hiddenAt)
      .setParameter("uid", userId)
      .executeUpdate();
    em
      .createNativeQuery(
        "UPDATE notification SET hidden_at = :ts " +
          "WHERE (actor_user_id = :uid OR recipient_user_id = :uid) AND hidden_at IS NULL"
      )
      .setParameter("ts", hiddenAt)
      .setParameter("uid", userId)
      .executeUpdate();
  }

  /**
   * Restore all content that was hidden by a soft-delete. Only unhides rows
   * whose hidden_at matches the user's deleted_at.
   */
  @Transactional
  public void restoreAllContentForUser(UUID userId, LocalDateTime hiddenAt) {
    em
      .createNativeQuery(
        "UPDATE post SET hidden_at = NULL WHERE user_id = :uid AND hidden_at = :ts"
      )
      .setParameter("ts", hiddenAt)
      .setParameter("uid", userId)
      .executeUpdate();

    em
      .createNativeQuery(
        "UPDATE post_comment SET hidden_at = NULL WHERE user_id = :uid AND hidden_at = :ts"
      )
      .setParameter("ts", hiddenAt)
      .setParameter("uid", userId)
      .executeUpdate();

    em
      .createNativeQuery(
        "UPDATE post_like SET hidden_at = NULL WHERE user_id = :uid AND hidden_at = :ts"
      )
      .setParameter("ts", hiddenAt)
      .setParameter("uid", userId)
      .executeUpdate();

    em
      .createNativeQuery(
        "UPDATE follow SET hidden_at = NULL " +
          "WHERE (follower_id = :uid OR followee_id = :uid) AND hidden_at = :ts"
      )
      .setParameter("ts", hiddenAt)
      .setParameter("uid", userId)
      .executeUpdate();
    em
      .createNativeQuery(
        "UPDATE notification SET hidden_at = NULL " +
          "WHERE (actor_user_id = :uid OR recipient_user_id = :uid) AND hidden_at = :ts"
      )
      .setParameter("ts", hiddenAt)
      .setParameter("uid", userId)
      .executeUpdate();
  }
}
